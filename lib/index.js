import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import {
  NPM_API, NPM_REGISTRY, SORTS, applyDownloads, buildSearchText, extractImages,
  imageCandidates, installability, isExactVersion, isUpdateAvailable, isValidPackageName,
  normalizeDownloads, normalizeInstalled, normalizeManifest, normalizeSearchHits, tailLines
} from "./pure.js";

/**
 * 插件市场（host 半）。
 * 注册 12 条 /api/dsdesktop/market/* 路由。只读的：search / detail / installed / capabilities /
 * image / settings / bundled；会写盘的：install / uninstall / settings/save / bundled/install /
 * profile-plugins/toggle。浏览器半 fetch 它们。走 webServer 路由而非 Typert
 * Remote，理由同本作者的其它插件：避免依赖编译生成的 remote descriptor（本项目无编译步骤）。
 *
 * 用**函数形式**的插件而不是 `Service` 子类：本插件不向任何人提供能力，占一个 cordis
 * 服务名只有坏处 —— `ctx.provide` 撞名直接抛异常，等于 boot 阶段杀掉内核。`market`
 * 这种通用词尤其危险。
 *
 * 路由挂在 `/api/dsdesktop/` 前缀下：webServer 的 `register` 对重复 (kind, path) 也是
 * 直接抛，`/api/market/search` 这种通用路径不该由我们占着。
 *
 * ## 这个插件装在哪一层，为什么
 *
 * 它自己就是**第一个走 profile 层（A1）的插件**：`pnpm add` 进 `$DSH_HOME/profiles/
 * <name>/`，由 `dsh.bundle.patch` 激活。这和同作者其它四个插件（随桌面发行版拷进内核
 * node_modules、由 `--patch` overlay 激活）是两条不同的路。理由是**生命周期归属**：
 * 随包分发的插件该跟着内核一起前进和回退，用户自己从市场装的插件不该因为内核换了一版
 * 就消失。profile 目录不受内核热更新与应用升级影响。
 *
 * ## profile 目录怎么找到的
 *
 * `ctx.baseUrl` 就锚在 profile 目录上（dsh 的 profile-boot 用 profile 里的
 * `cordis.yml` 当 loader 的 include root，baseUrl 因此指向那儿）。所以本插件**不需要
 * 宿主注入任何环境变量**，装在任何 dsh 里都能自己定位——这也是它能作为通用插件发布、
 * 而不是桌面专属的原因。
 */

/**
 * 图片镜像。**默认空，也就是不启用**。
 *
 * 为什么要有这个开关：插件截图基本都放在仓库的 `docs/` 或 `assets/` 下，而那些目录
 * 通常不在 npm 包的 `files` 里（实测 dsh-cost-meter、dsh-pocket 的截图从 jsDelivr 取
 * 都是 404），所以真正能拿到图的来源就只剩 `raw.githubusercontent.com`——而它在国内
 * 与不少企业网络下是**直接超时**（本机实测）。没有镜像，这些网络里预览图就是永远
 * 加载不出来。
 *
 * 为什么**默认不开**：镜像是我们不控制的第三方服务，走它意味着让它知道「谁、什么
 * 时候、在看哪个插件的截图」。这是个隐私取舍，该由用户自己做，不该由我们替他默认
 * 打开。要用的话在插件配置里填一个前缀，例如 `https://gh-proxy.com/`（本机实测可用），
 * 它会被拼在原始地址前面作为最后一个候选。
 *
 * 凡是不同部署可能取不同值的参数都要进 Config —— 这是上游文档的原话，也是同作者
 * 其它插件（dsh-ui-balance 的 baseURL）的做法。
 */
export const Config = z.object({
  imageMirror: z.string().default("")
});

/** 单次搜索最多返回多少条。npm 搜索接口上限 250，但列表一次画那么多没意义。 */
const MAX_SEARCH_SIZE = 50;
const DEFAULT_SEARCH_SIZE = 25;

/**
 * 外部请求的超时。registry 偶尔会慢，但内核进程不能被一个挂住的 fetch 拖着——
 * 面板宁可报「超时，重试」，也不能转圈转到用户以为死机。
 */
const FETCH_TIMEOUT_MS = 8000;

/**
 * 绝不允许经市场安装或卸载的包名。
 *
 * dsh 自己的产品包是内核的组成部分，卸掉就起不来了。参考实现（dsh-community-market）
 * 也把宿主自己的 bundle 设为只读，同一个道理——这几个**不分环境，任何宿主下都保护**。
 *
 * **随应用分发的插件不在这里**：它们和从 npm 装的插件是同一种管理模式，用户可以随时
 * 卸载（卸了也不会被启动对账偷偷装回来）。要装回来走 `/bundled/install`，用发行包里
 * 自带的 tgz，离线可用。
 */
const HOST_PROTECTED_PACKAGES = new Set([
  "@deepseek-ai/dsh",
  "@deepseek-ai/dsh-base",
  "@deepseek-ai/dsh-web-app",
  "@deepseek-ai/dsh-headless"
]);

/**
 * 本次调用适用的保护名单——**本插件自己**只在 dsDesktop 环境下才加进来。
 *
 * 自锁保护的初衷：市场把自己也列成了可卸载，点一下就把自己从 profile 里删了，
 * 而卸载完之后唯一能把它装回来的 UI 正是刚被删掉的那个，用户只剩「去终端敲
 * dsh plugin add」这一条路——这在 dsDesktop 里是真的死路：那是个面向不装命令行
 * 的人做的壳，市场是它唯一的插件管理入口。
 *
 * 但脱离 dsDesktop、由用户自己 `dsh plugin add` 装进普通 dsh 的场景，这条锁反而是
 * 多余的家长式保护：能自己敲命令装上这个插件的人，本来就有终端能力，卸了也能自己
 * 装回来，市场的 UI 不该替他们做这个决定、挡住一个他们本可以做的操作。用
 * `DSH_DESKTOP_PLUGIN_STATE` 判断在不在 dsDesktop 里——跟 handleProfileToggle
 * 判断「停用功能仅在 dsDesktop 里可用」用的是同一个信号，二者本该一致：脱离
 * dsDesktop 时停用功能本来就整个不可用（见下面 handleProfileToggle 的 missing-env
 * 分支），卸载这里不该单独留一半锁着。
 *
 * 写成函数而不是模块顶层算一次的 `const`：环境变量在这个进程里不是打死不变的
 * （宿主那边的 `DSH_DESKTOP_PROFILE_DIST` 就有运行中重新赋值的先例），每次请求
 * 现算才不会被「插件模块是什么时候被 import 的」这种时序巧合决定行为。
 */
function protectedPackages() {
  if (!process.env.DSH_DESKTOP_PLUGIN_STATE) return HOST_PROTECTED_PACKAGES;
  return new Set([...HOST_PROTECTED_PACKAGES, readOwnName()]);
}

/**
 * 本包自己的包名。
 *
 * **读失败必须退化，不能抛**：这是模块顶层的同步 IO，抛出去就是 import 阶段失败 →
 * 内核秒退 → 桌面端黑屏。退回常量在语义上是安全的——这是本包自己的名字，编码时
 * 就已确定，与 package.json 里的 name 是同一个事实的两处书写。
 */
function readOwnName() {
  try {
    const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const name = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8")).name;
    if (typeof name === "string" && name.length > 0) return name;
  } catch { /* 下面退回常量 */ }
  return "dsh-market";
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function fail(code, message) {
  return { ok: false, error: { code, message } };
}

/** 校验 POST 的 Content-Type：不是 application/json 就 415（防无 preflight 的简单请求）。 */
function requireJson(req) {
  const ct = String(req.headers["content-type"] ?? "").toLowerCase();
  return ct.startsWith("application/json");
}

/**
 * Origin 校验：存在且不等于本服务自身 origin 就拒绝。本服务从不发
 * Access-Control-Allow-Origin，所以跨源页面拿不到响应体——但「拿不到响应」不等于
 * 「发不出请求」，恶意页面还是可以用 text/plain 发简单请求打本机回环端口。
 *
 * 这条防线对本插件格外要紧：后续步骤会加**安装**路由，那是「让本机执行 pnpm 装一个
 * 任意 npm 包」的能力，一次得手就是任意代码执行。读操作阶段就把防线立好，别等加写
 * 操作时才想起来。
 */
function originAllowed(req, port) {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:") return false;
  return url.host === `127.0.0.1:${port}` || url.host === `localhost:${port}`;
}

/**
 * 取 profile 目录（见文件头注释）。
 * 拿不到就返回 null，让路由报一个明确的错，而不是猜一个路径去读——猜错的话
 * 「已安装」会显示成空列表，用户会以为插件都没了。
 */
function profileDir(ctx) {
  const base = ctx.baseUrl;
  if (typeof base !== "string" || base.length === 0) return null;
  try {
    return fileURLToPath(base);
  } catch {
    return null;
  }
}

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** 读 POST 的 JSON 体，带长度上限——这些路由的请求体只装得下一个包名和版本号。 */
function readJsonBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw.length === 0 ? {} : JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

/**
 * 打外部 HTTP。只允许 https，且只允许白名单主机——这个函数是本插件唯一的出网口，
 * 把限制写在这一处，比在每个调用点各记一遍可靠。
 */
const ALLOWED_HOSTS = new Set(["registry.npmjs.org", "api.npmjs.org", "api.github.com"]);

/**
 * 允许**代理图片**的主机。比 ALLOWED_HOSTS 更窄：那份是给我们自己取 JSON 用的，
 * 这份决定的是「README 里写的哪些地址值得替用户去取」。README 是第三方可控内容，
 * 放开任意主机等于让插件作者能指挥用户的机器去访问任意地址（并借此确认用户在看
 * 哪个插件、什么时候看的）。
 */
const IMAGE_HOSTS = new Set([
  "cdn.jsdelivr.net",
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "camo.githubusercontent.com",
  "github.com"
]);

/**
 * 取单张图的超时。比 FETCH_TIMEOUT_MS 短得多，因为这里是**候选链**：第一个候选
 * 不通就得赶紧试下一个。实测某些网络下 raw.githubusercontent.com 是直接超时而不是
 * 拒绝，8 秒一个候选串起来就是十几秒的白等。
 */
const IMAGE_TIMEOUT_MS = 4000;

/** 单张预览图的体积上限。README 里塞一张 20MB 的 GIF 不是没有。 */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * README 与图片清单的缓存。
 *
 * 每展开一次详情就重抓一次 README 是浪费：npm 的全量 packument 对 dshmarket 就有
 * 416KB（`/latest` 不含 readme，实测过）。缓存按包名存，带 TTL 与条数上限——一个
 * 长开的面板不该把内核进程的内存喂成一个 README 仓库。
 */
const readmeCache = new Map();
const README_TTL_MS = 10 * 60 * 1000;
const README_CACHE_MAX = 40;

function cacheGet(name) {
  const hit = readmeCache.get(name);
  if (!hit) return null;
  if (Date.now() - hit.at > README_TTL_MS) {
    readmeCache.delete(name);
    return null;
  }
  return hit.images;
}

function cacheSet(name, images) {
  // 最简单的淘汰：满了就丢最早插入的那个（Map 保序）。LRU 在这个量级没有意义。
  if (readmeCache.size >= README_CACHE_MAX) {
    const oldest = readmeCache.keys().next().value;
    if (oldest !== undefined) readmeCache.delete(oldest);
  }
  readmeCache.set(name, { images, at: Date.now() });
}

/**
 * 面板里改得动的设置存在这儿：profile 目录下的 `dsh-market.json`。
 *
 * 为什么不只用 cordis 的 Config：**dsh 的设置页不会为插件 Config 生成表单**（插件列表
 * 那个 tab 里的 "Configuration" 只是个状态文字，实际查证过）。只放在 Config 里意味着
 * 用户要手改 patch YAML 才能改一个开关——对这个面板的目标用户等于不存在。存成文件之后
 * 面板可以直接写，改完立刻生效，不需要重启。
 *
 * Config 仍然保留并作为默认值：声明式部署的人可以在 patch 里钉死它。
 */
function settingsFile(ctx) {
  const dir = profileDir(ctx);
  return dir === null ? null : join(dir, "dsh-market.json");
}

/** 镜像值归一化：只接受 https 前缀，其余一律当成「没配」。 */
function normalizeMirror(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!/^https:\/\//i.test(raw)) return "";
  try {
    new URL(raw);
    return raw;
  } catch {
    return "";
  }
}

function readSettings(ctx) {
  const file = settingsFile(ctx);
  const stored = file === null ? null : readJsonSafe(file);
  const mirror = normalizeMirror(stored?.imageMirror) || configMirror;
  let host = "";
  try {
    host = mirror ? new URL(mirror).host : "";
  } catch { host = ""; }
  return { imageMirror: mirror, imageMirrorHost: host };
}

/** GET /settings —— 面板读当前设置。 */
function handleGetSettings(ctx, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, fail("method-not-allowed", "GET only"));
  const { imageMirror } = readSettings(ctx);
  return sendJson(res, 200, { ok: true, data: { imageMirror } });
}

/** POST /settings { imageMirror } —— 面板写设置，立即生效，不需要重启。 */
async function handleSetSettings(ctx, req, res) {
  if (req.method !== "POST") return sendJson(res, 405, fail("method-not-allowed", "POST only"));
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 200, fail("bad-request", "请求体不是合法 JSON"));
  }
  const raw = typeof body?.imageMirror === "string" ? body.imageMirror.trim() : "";
  // 空字符串是合法输入（表示关掉镜像）；非空但不是 https 的要报错，不能静默丢掉——
  // 用户填了个 http:// 然后发现「保存了但没生效」比直接报错难查得多。
  if (raw.length > 0 && normalizeMirror(raw) === "") {
    return sendJson(res, 200, fail("bad-mirror", "镜像地址必须是 https:// 开头的合法地址"));
  }
  const file = settingsFile(ctx);
  if (file === null) return sendJson(res, 200, fail("no-profile", "定位不到 profile 目录"));
  try {
    writeFileSync(file, `${JSON.stringify({ imageMirror: normalizeMirror(raw) }, null, 2)}
`, "utf8");
  } catch (error) {
    return sendJson(res, 200, fail("write-failed", `设置写入失败：${error?.message ?? error}`));
  }
  // 换了镜像之后，之前那些「取不到」的判断就不作数了，清掉缓存让它们重来一遍。
  readmeCache.clear();
  return sendJson(res, 200, { ok: true, data: readSettings(ctx) });
}

/**
 * 取某个包的预览图清单。
 *
 * README 只从 **npm 的全量 packument** 取（dshmarket 实测 416KB，`/latest` 不含
 * readme）。曾经想先试 GitHub raw 的 README（几十 KB，省流量），但实测在国内/企业网
 * 络下 `raw.githubusercontent.com` 是**超时**而不是拒绝——那意味着每展开一个详情都要
 * 先白等一个超时才回落，用户感受到的是「点开要卡好几秒」。能拿到的来源优先于省流量。
 */
async function imagesFor(name, slug) {
  const cached = cacheGet(name);
  if (cached !== null) return cached;
  let readme = null;
  try {
    readme = (await fetchJson(`${NPM_REGISTRY}/${name.split("/").map(encodeURIComponent).join("/")}`))?.readme ?? null;
  } catch { readme = null; }
  // slug 跟着每条一起缓存：取图那一步要用它重建 GitHub raw 那个候选，而那时
  // 手里只有包名和序号。
  const images = (readme === null ? [] : extractImages(readme, slug)).map((image) => ({ ...image, slug }));
  cacheSet(name, images);
  return images;
}

async function fetchJson(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw Object.assign(new Error("insecure url"), { code: "bad-url" });
  if (!ALLOWED_HOSTS.has(parsed.host)) throw Object.assign(new Error(`host not allowed: ${parsed.host}`), { code: "bad-url" });
  const response = await fetch(parsed, {
    // 不带任何凭据：市场只读公开数据，请求里出现 token 既没必要也是泄漏面。
    headers: { accept: "application/json", "user-agent": "dsh-market" },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status}`), { code: "upstream", status: response.status });
  }
  return await response.json();
}

function upstreamError(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return { code: "timeout", message: "连接 npm registry 超时，请稍后重试" };
  }
  if (error?.code === "bad-url") return { code: "bad-url", message: "请求地址不被允许" };
  if (error?.status === 404) return { code: "not-found", message: "npm 上没有这个包" };
  return { code: "upstream", message: `无法访问 npm registry：${error?.message ?? error}` };
}

/** GET /search?q=&from=&size=&all= —— 列表页一次请求画完，不为每条再打详情。 */
async function handleSearch(ctx, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, fail("method-not-allowed", "GET only"));
  const url = new URL(req.url, "http://localhost");
  const sizeParam = Number(url.searchParams.get("size"));
  const size = Number.isFinite(sizeParam) && sizeParam > 0 ? Math.min(Math.floor(sizeParam), MAX_SEARCH_SIZE) : DEFAULT_SEARCH_SIZE;
  const fromParam = Number(url.searchParams.get("from"));
  const from = Number.isFinite(fromParam) && fromParam > 0 ? Math.floor(fromParam) : 0;
  // all=1 时不加 `keywords:dsh-plugin` 限定，搜整个 npm。默认限定，理由见 buildSearchText。
  const onlyPlugins = url.searchParams.get("all") !== "1";
  const text = buildSearchText(url.searchParams.get("q") ?? "", onlyPlugins);
  const sortParam = url.searchParams.get("sort") ?? "downloads-week";
  const sort = SORTS.includes(sortParam) ? sortParam : "downloads-week";
  const target = `${NPM_REGISTRY}/-/v1/search?text=${encodeURIComponent(text)}&size=${size}&from=${from}`;
  try {
    const { total, items } = normalizeSearchHits(await fetchJson(target));
    // 按「最近更新」排序时不用下载量，省下这一轮 npm 下载量接口调用——数字反正
    // 不会显示（前端按 sort 决定要不要画那一行）。
    const downloads = sort === "updated"
      ? {}
      : await fetchDownloads(items.map((item) => item.name), sort === "downloads-month" ? "last-month" : "last-week");
    // applyDownloads 只认「downloads」还是「updated」两种模式，不关心周/月——
    // 该抓哪个区间的数字是上面这行的事，它只管拿到的数字怎么排。
    const items2 = applyDownloads(items, downloads, sort === "updated" ? "updated" : "downloads");
    return sendJson(res, 200, { ok: true, data: { total, sort, items: items2 } });
  } catch (error) {
    return sendJson(res, 200, { ok: false, error: upstreamError(error) });
  }
}

/**
 * 抓一批包的下载量（周或月，由 period 决定）。
 *
 * 两条路：unscoped 的包能一次批量查（一个请求解决大多数），scoped 的**不支持批量**
 * （实测返回 `scoped packages are not currently supported in bulk lookups`），只能
 * 一个个查。所以这里一定会发出 1 + n 个请求，n 是结果里 scoped 包的个数。
 *
 * **任何一个失败都不能影响列表**：下载量是锦上添花的信息，为它把整页搜索结果变成
 * 错误页是本末倒置。失败的那个包 downloads 就是缺省的 null，UI 上不显示这个数字。
 */
async function fetchDownloads(names, period = "last-week") {
  const unscoped = names.filter((name) => !name.startsWith("@"));
  const scoped = names.filter((name) => name.startsWith("@"));
  const jobs = [];
  if (unscoped.length > 0) {
    jobs.push(fetchJson(`${NPM_API}/downloads/point/${period}/${unscoped.join(",")}`).catch(() => null));
  }
  for (const name of scoped) {
    jobs.push(fetchJson(`${NPM_API}/downloads/point/${period}/${name.split("/").map(encodeURIComponent).join("/")}`).catch(() => null));
  }
  const merged = {};
  for (const payload of await Promise.all(jobs)) Object.assign(merged, normalizeDownloads(payload));
  return merged;
}

/**
 * GET /detail?name= —— 展开一条时才打这个请求。
 *
 * 版本权威是 npm 的 `latest`，不是搜索结果里的 version（搜索索引会滞后），也不是
 * 任何第三方目录说的版本。安装那一步会用这里返回的精确版本号钉死。
 */
async function handleDetail(ctx, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, fail("method-not-allowed", "GET only"));
  const url = new URL(req.url, "http://localhost");
  const name = url.searchParams.get("name") ?? "";
  // 包名会被拼进 URL，也会在后续步骤里变成 pnpm 的命令行参数——校验放在最前面，
  // 而且两条路径共用同一个 isValidPackageName，不能各写各的。
  if (!isValidPackageName(name)) return sendJson(res, 200, fail("bad-name", "包名不合法"));
  try {
    const manifest = await fetchJson(`${NPM_REGISTRY}/${name.split("/").map(encodeURIComponent).join("/")}/latest`);
    const data = normalizeManifest(manifest, protectedPackages());
    // 图片给的是**我们自己的代理地址**，不是第三方原地址：浏览器半永远不直连
    // README 里写的主机。理由见 IMAGE_HOSTS 的注释。抓不到就是空数组，详情照常显示。
    const images = await imagesFor(name, data.github).catch(() => []);
    data.images = images.map((image, index) => ({
      src: `${ROUTE_PREFIX}/image?name=${encodeURIComponent(name)}&i=${index}&v=${encodeURIComponent(data.version ?? "")}`,
      alt: image.alt
    }));
    return sendJson(res, 200, { ok: true, data });
  } catch (error) {
    return sendJson(res, 200, { ok: false, error: upstreamError(error) });
  }
}

/**
 * 一个包在 npm 上的 `latest` 版本号，供「已安装」列表判断有没有更新。
 * 查不到（离线、包被下架、名字不合法）就是 null——调用方把它当成「没有更新」。
 */
async function fetchLatestVersion(name) {
  if (!isValidPackageName(name)) return null;
  try {
    const manifest = await fetchJson(`${NPM_REGISTRY}/${name.split("/").map(encodeURIComponent).join("/")}/latest`);
    return typeof manifest?.version === "string" ? manifest.version : null;
  } catch {
    return null;
  }
}

/**
 * GET /installed —— 读当前 profile 的直接依赖。
 *
 * 刻意**不**依赖本插件自己的安装记录：这样别的市场、`dsh plugin add` 命令行装的
 * 插件也能正确显示，不需要任何适配。参考实现也是这么做的，理由一样。
 */
async function handleInstalled(ctx, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, fail("method-not-allowed", "GET only"));
  const dir = profileDir(ctx);
  if (dir === null) return sendJson(res, 200, fail("no-profile", "定位不到 profile 目录"));
  const manifest = readJsonSafe(join(dir, "package.json"));
  if (manifest === null) return sendJson(res, 200, fail("no-profile", "读不到 profile 的 package.json"));
  const readInstalled = (name) => readJsonSafe(join(dir, "node_modules", ...name.split("/"), "package.json"));
  const protectedSet = protectedPackages();
  const { items } = normalizeInstalled(manifest, readInstalled, protectedSet);

  // 「停用」是**桌面版专属**：真正把插件关掉的是外壳写的 `--patch` overlay，我们
  // 只能表达意愿（写状态文件）。裸 dsh 里没有那个写者，所以这里如实告诉前端
  // 「不支持」，由它不显示停用开关——而不是给一个点了没反应的按钮。
  const statePath = process.env.DSH_DESKTOP_PLUGIN_STATE;
  const state = statePath ? readUserState(statePath) : null;
  const bundled = bundledIndex();
  for (const item of items) {
    item.entryIds = entryIdsOf(dir, item.name);
    // 只要有任意一个 entry 被停用就算停用：现实里一个包声明多个条目极少见，
    // 真出现时「部分停用」也没有可展示的含义，宁可保守判定为停用。
    item.enabled = state === null ? null : !item.entryIds.some((id) => state[id] === false);
    // 保护名单里的（市场自己）也不能停用：停用了就没有界面把它开回来，和「不许
    // 卸载」是同一类自我反锁。这里必须和路由的判定一致，否则 UI 会画出一个点下去
    // 必然报错的开关。
    item.canDisable = state !== null && item.entryIds.length > 0 && !protectedSet.has(item.name);
    item.bundled = bundled.some((b) => b.packageName === item.name);
  }

  // 有没有更新，只对「能经这个市场装/卸」的包查——保护名单里的包（市场自己、
  // 宿主产品包）本来就不能通过 /install 升级，查了也没有对应的按钮能用上，
  // 白打一批 npm 请求。查询失败（离线、npm 抽风）不影响整个列表，只是这一项
  // 不显示「有更新」。
  await Promise.all(items.filter((item) => item.removable).map(async (item) => {
    item.latestVersion = await fetchLatestVersion(item.name);
    item.updateAvailable = isUpdateAvailable(item.installedVersion, item.latestVersion);
  }));

  return sendJson(res, 200, { ok: true, data: {
    profileDir: dir,
    // 安全模式由外壳经环境变量告知。面板要说明白「插件不是丢了，是这次启动刻意
    // 跳过的」——否则用户看到一列插件全没了只会更慌。
    safeMode: process.env.DSH_DESKTOP_SAFE_MODE === "1",
    // profile 名字（目录名）要一起给：详情里展示的手动安装命令是
    // `dsh plugin --profile <name> add …`，少了它用户抄过去就是错的。
    profileName: basename(dir.replace(/[\\/]+$/, "")),
    items
  } });
}

/**
 * bundle patch 文件里 `- id: X` 那一行。逐行正则而不是拉 YAML 解析器进来：这些
 * patch 是插件作者手写的几行 insert 条目，而本插件刻意保持零运行时依赖。
 */
const INSERT_ID_RE = /^\s*-\s+id:\s*(\S+)\s*$/;

/**
 * 读用户的插件开关状态（entryId → boolean，`false` = 停用）。读不到按「没有任何
 * 覆盖」处理，也就是全都启用——这个方向是刻意的：状态文件坏了应该表现为「插件都在」，
 * 而不是「插件都不见了」。
 */
function readUserState(statePath) {
  const parsed = statePath ? readJsonSafe(statePath) : null;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const state = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "boolean") state[key] = value;
  }
  return state;
}

/** 随应用分发的索引；不是桌面版、或读不到就当空。 */
function bundledIndex() {
  const distDir = process.env.DSH_DESKTOP_PROFILE_DIST;
  if (!distDir) return [];
  const index = readJsonSafe(join(distDir, "index.json"));
  return Array.isArray(index) ? index : [];
}

/**
 * 某个 profile 依赖声明了哪些 loader entry id（读它自己的 `dsh.bundle.patch`）。
 *
 * 停用要写的是 **entry id**，而用户在面板上点的是**包名** —— 这里就是那座桥。
 * 逐行正则而不是 YAML 解析器：这些 patch 文件是插件作者手写的几行 insert 条目，
 * 而本插件刻意保持零运行时依赖（peerDependencies 之外一个都没有）。
 */
function entryIdsOf(profileDir, packageName) {
  const pkgDir = join(profileDir, "node_modules", ...packageName.split("/"));
  const patchRel = readJsonSafe(join(pkgDir, "package.json"))?.dsh?.bundle?.patch;
  if (typeof patchRel !== "string" || patchRel.length === 0) return [];
  let text;
  try {
    text = readFileSync(join(pkgDir, ...patchRel.replace(/^\.\//, "").split("/")), "utf8");
  } catch {
    return [];
  }
  const ids = [];
  for (const line of text.split(/\r?\n/)) {
    const m = INSERT_ID_RE.exec(line);
    if (m) ids.push(m[1].replace(/^['"]|['"]$/g, ""));
  }
  return [...new Set(ids)];
}

/**
 * POST /profile-plugins/toggle { name, enabled } —— 停用 / 启用一个 profile 层插件。
 *
 * 写的是 entryId → boolean 的状态文件，和桌面自带插件的开关**共用同一个文件**：
 * 那本来就是同一个概念（用户对某个 loader 条目的开关意愿），只是两层的实现手段不同
 * （A2 靠不生成 insert，A1 靠外壳压一条 disabled）。真正生效在下次启动。
 */
async function handleProfileToggle(ctx, req, res) {
  if (req.method !== "POST") return sendJson(res, 405, fail("method-not-allowed", "POST only"));
  const statePath = process.env.DSH_DESKTOP_PLUGIN_STATE;
  if (!statePath) return sendJson(res, 200, fail("missing-env", "停用功能仅在 dsDesktop 里可用"));
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 200, fail("bad-request", "请求体不是合法 JSON"));
  }
  const name = body?.name;
  if (!isValidPackageName(name)) return sendJson(res, 200, fail("bad-name", "包名不合法"));
  if (typeof body?.enabled !== "boolean") return sendJson(res, 200, fail("bad-request", "enabled 必须是布尔值"));
  const dir = profileDir(ctx);
  if (dir === null) return sendJson(res, 200, fail("no-profile", "定位不到 profile 目录"));
  const deps = readJsonSafe(join(dir, "package.json"))?.dependencies ?? {};
  if (!Object.prototype.hasOwnProperty.call(deps, name)) {
    return sendJson(res, 200, fail("not-installed", "这个包不在当前 profile 的直接依赖里"));
  }
  if (protectedPackages().has(name)) {
    // 市场自己停用了就没有界面把它开回来，和「不许卸载」是同一类自我反锁——
    // 但这条分支只在 statePath 存在（即在 dsDesktop 里）时才会走到，这里
    // protectedPackages() 必然把自己算进去，跟上面的 missing-env 提前返回一致。
    return sendJson(res, 200, fail("protected", "这个插件不能停用"));
  }
  const entryIds = entryIdsOf(dir, name);
  if (entryIds.length === 0) return sendJson(res, 200, fail("no-entry", "这个包没有声明可停用的条目"));
  try {
    const state = readUserState(statePath);
    for (const id of entryIds) {
      // 启用 = **删键**而不是写 true：状态文件只记录「偏离默认」的项，profile 层
      // 插件的默认就是启用。写 true 会让这个文件慢慢长成一份全量快照。
      if (body.enabled) delete state[id];
      else state[id] = false;
    }
    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } catch (error) {
    return sendJson(res, 200, fail("state-write-failed", `状态写入失败：${error?.message ?? error}`));
  }
  return sendJson(res, 200, { ok: true, data: { name, enabled: body.enabled, entryIds } });
}

/**
 * 找到 dsh 自己的 bin.js。
 *
 * 安装**不自己调 pnpm**，而是调 dsh 的 `plugin` 子命令——它除了转发 pnpm，还会做
 * `dsh.profile.bundles` 的 reconcile（按安装后的实际状态判断哪些依赖声明了
 * dsh.bundle，据此维护 patch 层列表）。那段逻辑是上游的，我们自己实现一遍就等着
 * 和它分叉：装完却没激活、或者卸载后层列表里留个幽灵条目。
 *
 * 内核进程是 `node <binJs> web …` 起来的，所以 `process.argv[1]` 就是 bin.js。
 * 这比在文件系统里到处猜路径可靠：它就是**当前正在跑的这个 dsh**，版本必然匹配。
 */
function dshBinPath() {
  const override = process.env.DSH_MARKET_DSH_BIN;
  if (typeof override === "string" && override.length > 0 && existsSync(override)) return override;
  const argv1 = process.argv[1];
  if (typeof argv1 === "string" && /bin\.[cm]?js$/.test(argv1) && existsSync(argv1)) return argv1;
  return null;
}

/**
 * 同一时刻只允许一个安装/卸载在跑。
 *
 * pnpm 在同一个目录里并发跑会互相踩 lockfile 与 store，轻则失败、重则把 profile 的
 * node_modules 弄成半截状态——而这个 profile 正是当前内核自己在用的那个。宁可让第二
 * 个请求直接被拒（前端也会禁用按钮），也不要赌 pnpm 的并发安全。
 */
let pnpmBusy = false;

/** 单次安装/卸载的墙钟上限。冷启动装一个带原生依赖的包可能真要一两分钟。 */
const INSTALL_TIMEOUT_MS = 180000;

function runDshPlugin(profile, args) {
  return new Promise((resolve) => {
    const binJs = dshBinPath();
    if (binJs === null) {
      resolve({ ok: false, error: { code: "no-dsh-bin", message: "定位不到 dsh 的可执行入口，无法执行安装" } });
      return;
    }
    execFile(process.execPath, [binJs, "plugin", "--profile", profile, ...args], {
      // cwd 给一个确定的值：dsh plugin 会把相对路径参数锚到 cwd 上，而内核进程的 cwd
      // 是外壳给的、我们控制不了。我们只传包名（绝不会是相对路径），锚在哪都一样，
      // 但显式写死总比依赖一个不确定的值好。
      cwd: profileRootOf(binJs),
      env: {
        ...process.env,
        // 非交互：pnpm 遇到需要确认的场景会等输入，把这个请求永远挂住。
        CI: "1",
        npm_config_yes: "true"
      },
      maxBuffer: 16 * 1024 * 1024,
      timeout: INSTALL_TIMEOUT_MS,
      windowsHide: true
    }, (error, stdout, stderr) => {
      const output = tailLines(`${stdout ?? ""}\n${stderr ?? ""}`);
      if (error) {
        if (error.killed) {
          resolve({ ok: false, error: { code: "timeout", message: "操作超时（超过 3 分钟），请在终端里手动执行", output } });
          return;
        }
        resolve({ ok: false, error: { code: "pnpm-failed", message: "包管理器执行失败", output } });
        return;
      }
      resolve({ ok: true, output });
    });
  });
}

/** dsh 安装目录（bin.js 往上两级）。只用作一个确定的 cwd，见 runDshPlugin。 */
function profileRootOf(binJs) {
  try {
    return join(binJs, "..", "..");
  } catch {
    return undefined;
  }
}

/**
 * POST /install { name, version }
 *
 * **浏览器半送来的版本号不作数**：这里重新问一次 npm 的 latest，确认包名一致、
 * 确认它现在仍然声明了 dsh.bundle、确认版本号就是 latest 那个。理由是这条路由的
 * 能力是「让本机装一个任意 npm 包并执行它」——面板上显示的是什么、实际装的就必须
 * 是什么，这中间不允许有任何一步只信客户端。参考实现也是以 npm latest 为版本权威。
 */
async function handleInstall(ctx, req, res) {
  if (req.method !== "POST") return sendJson(res, 405, fail("method-not-allowed", "POST only"));
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 200, fail("bad-request", "请求体不是合法 JSON"));
  }
  const name = body?.name;
  if (!isValidPackageName(name)) return sendJson(res, 200, fail("bad-name", "包名不合法"));
  if (body?.version !== undefined && !isExactVersion(body.version)) {
    return sendJson(res, 200, fail("bad-version", "版本号必须是精确版本"));
  }
  const dir = profileDir(ctx);
  if (dir === null) return sendJson(res, 200, fail("no-profile", "定位不到 profile 目录"));
  if (pnpmBusy) return sendJson(res, 200, fail("busy", "已有一个安装/卸载正在进行，请等它完成"));

  let manifest;
  try {
    manifest = await fetchJson(`${NPM_REGISTRY}/${name.split("/").map(encodeURIComponent).join("/")}/latest`);
  } catch (error) {
    return sendJson(res, 200, { ok: false, error: upstreamError(error) });
  }
  if (manifest?.name !== name) return sendJson(res, 200, fail("mismatch", "npm 返回的包名与请求不一致"));
  const verdict = installability(manifest, protectedPackages());
  if (!verdict.installable) return sendJson(res, 200, fail("not-installable", `这个包不能安装：${verdict.reason}`));
  if (!isExactVersion(manifest.version)) return sendJson(res, 200, fail("bad-version", "npm 上没有可用的精确版本"));
  // 客户端说的版本和 latest 对不上时以 latest 为准并告知——通常是面板开着的这段
  // 时间里作者发了新版本，不是攻击，但用户有权知道装到的不是他刚才看的那个版本。
  const version = manifest.version;
  const drifted = typeof body.version === "string" && body.version !== version;

  pnpmBusy = true;
  try {
    // 钉死精确版本（`pkg@1.2.3`），不写范围。`dsh plugin add` 默认会写成 `^x.y.z`，
    // 那意味着期望状态不确定：pnpm 某次 install 就可能悄悄漂到新版本，而「装了什么
    // 就跑什么」是这个市场唯一能给的保证。
    const result = await runDshPlugin(basename(dir.replace(/[\\/]+$/, "")), ["add", `${name}@${version}`]);
    if (!result.ok) return sendJson(res, 200, result);
    return sendJson(res, 200, { ok: true, data: { name, version, drifted, output: result.output } });
  } finally {
    pnpmBusy = false;
  }
}

/**
 * POST /uninstall { name }
 *
 * 只允许卸载**当前 profile 的直接依赖**，且不在保护名单里。不查这一下的话，
 * 一个构造出来的包名会让 pnpm 去 remove 一个它管不着的东西——大概率无害，但这条
 * 路由的输入来自浏览器，边界该在这儿画清楚。
 */
async function handleUninstall(ctx, req, res) {
  if (req.method !== "POST") return sendJson(res, 405, fail("method-not-allowed", "POST only"));
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 200, fail("bad-request", "请求体不是合法 JSON"));
  }
  const name = body?.name;
  if (!isValidPackageName(name)) return sendJson(res, 200, fail("bad-name", "包名不合法"));
  // 这里可能是宿主产品包（任何环境都挡），也可能是市场自己（只在 dsDesktop 里挡，
  // 见 protectedPackages() 的注释），两种原因合用一句通用提示，不细分。
  if (protectedPackages().has(name)) return sendJson(res, 200, fail("protected", "这个插件不能卸载"));
  const dir = profileDir(ctx);
  if (dir === null) return sendJson(res, 200, fail("no-profile", "定位不到 profile 目录"));
  const manifest = readJsonSafe(join(dir, "package.json"));
  const deps = manifest?.dependencies;
  if (!deps || typeof deps !== "object" || !Object.prototype.hasOwnProperty.call(deps, name)) {
    return sendJson(res, 200, fail("not-installed", "这个包不在当前 profile 的直接依赖里"));
  }
  if (pnpmBusy) return sendJson(res, 200, fail("busy", "已有一个安装/卸载正在进行，请等它完成"));
  pnpmBusy = true;
  try {
    const result = await runDshPlugin(basename(dir.replace(/[\\/]+$/, "")), ["remove", name]);
    if (!result.ok) return sendJson(res, 200, result);
    return sendJson(res, 200, { ok: true, data: { name, output: result.output } });
  } finally {
    pnpmBusy = false;
  }
}

/**
 * GET /image?name=&i= —— 图片代理。
 *
 * 为什么不让浏览器直连原地址：README 是插件作者可控的内容，直连意味着他能指挥用户
 * 的机器去访问任意地址，并借此知道「谁、什么时候、在看哪个插件」。走代理之后出网
 * 只发生在内核进程，主机受 IMAGE_HOSTS 约束，体积受 MAX_IMAGE_BYTES 约束。
 *
 * 索引而不是 URL 作为参数：让浏览器半传 URL 就等于把「取哪个地址」的决定权交回给
 * 客户端，那样白名单形同虚设。这里只接受「第几张」，地址由服务端自己算出来。
 */
async function handleImage(ctx, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, fail("method-not-allowed", "GET only"));
  const url = new URL(req.url, "http://localhost");
  const name = url.searchParams.get("name") ?? "";
  if (!isValidPackageName(name)) return sendJson(res, 200, fail("bad-name", "包名不合法"));
  const index = Number(url.searchParams.get("i"));
  if (!Number.isInteger(index) || index < 0 || index > 32) return sendJson(res, 200, fail("bad-index", "图片序号不合法"));
  let images = cacheGet(name);
  if (images === null) {
    // 缓存没命中（面板开了很久、或者内核重启过）：重新解析一次。需要 github slug，
    // 从 manifest 拿——这条路走到的概率不高，多一次 /latest 请求可以接受。
    try {
      const manifest = await fetchJson(`${NPM_REGISTRY}/${name.split("/").map(encodeURIComponent).join("/")}/latest`);
      images = await imagesFor(name, normalizeManifest(manifest).github);
    } catch {
      images = [];
    }
  }
  const image = images[index];
  if (!image) return sendJson(res, 404, fail("not-found", "没有这张图"));
  const version = url.searchParams.get("v") || undefined;
  // 一张图有多个候选来源（jsDelivr / GitHub raw），逐个试到出图为止——它们的可达性
  // 在不同网络下差别很大，见 imageCandidates 的注释。
  const { imageMirror, imageMirrorHost } = readSettings(ctx);
  const candidates = imageCandidates(image.raw || image.url, { slug: image.slug, name, version, mirror: imageMirror });
  let lastError = null;
  for (const candidate of candidates) {
    let target;
    try {
      target = new URL(candidate);
    } catch {
      continue;
    }
    // 白名单 + 用户自己配的镜像主机。镜像不写进 IMAGE_HOSTS 常量：那份是「我们认可
    // 的默认来源」，而镜像是用户明确知情后单独开的口子，两者不该混为一谈。
    if (target.protocol !== "https:") continue;
    if (!IMAGE_HOSTS.has(target.host) && target.host !== imageMirrorHost) continue;
    try {
      const upstream = await fetch(target, {
        headers: { accept: "image/*", "user-agent": "dsh-market" },
        redirect: "follow",
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS)
      });
      if (!upstream.ok) { lastError = `HTTP ${upstream.status}`; continue; }
      const type = String(upstream.headers.get("content-type") ?? "");
      // 只放行真的是图片的响应：一个被改成返回 HTML 的地址不该被我们当图片喂给页面。
      // jsDelivr 对不存在的文件回的是 text/plain 的 404 说明页，正是这条挡下来的。
      if (!type.startsWith("image/")) { lastError = `content-type: ${type}`; continue; }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      if (buffer.length === 0) { lastError = "empty body"; continue; }
      if (buffer.length > MAX_IMAGE_BYTES) { lastError = "too large"; continue; }
      res.writeHead(200, {
        "content-type": type,
        "content-length": String(buffer.length),
        // 同一张图在面板里会被反复渲染（折叠再展开），让浏览器自己缓存一小时。
        "cache-control": "private, max-age=3600"
      });
      res.end(buffer);
      return undefined;
    } catch (error) {
      lastError = error?.name === "TimeoutError" ? "timeout" : String(error?.message ?? error);
    }
  }
  // 全部候选都失败：前端的 onError 会把这张图从 DOM 里摘掉，详情其余部分照常显示。
  return sendJson(res, 502, fail("upstream", `图片获取失败${lastError ? `：${lastError}` : ""}`));
}

/** GET /capabilities —— 前端据此决定按不按得动安装按钮，而不是点了才发现不行。 */
function handleCapabilities(ctx, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, fail("method-not-allowed", "GET only"));
  return sendJson(res, 200, { ok: true, data: {
    canInstall: dshBinPath() !== null && profileDir(ctx) !== null,
    busy: pnpmBusy,
    imageMirror: readSettings(ctx).imageMirror
  } });
}

// ---------------------------------------------------------------------------
// 随应用分发的插件（桌面版把 tgz 打进发行包，首次启动播种进 profile）
// ---------------------------------------------------------------------------
//
// 这组路由存在的唯一理由：**把单向门变成双向门**。
//
// 这些插件和从 npm 装的插件是同一种管理模式——用户可以随时卸载，卸了之后启动对账也
// 不会偷偷装回来（那样「卸载」就是假的）。但代价是：卸完怎么装回来？npm 上可能还没发、
// 或者用户此刻没网。发行包里明明躺着那个 tgz，却没有入口能用它，就成了一扇单向门。
//
// 所以这里读桌面注入的产物目录，列出「随应用分发有哪些、当前装没装」，并允许**按包名**
// 从本地 tgz 装回来。装的是发行包自带的那一版，离线可用。

/** GET /bundled —— 随应用分发的插件清单 + 当前是否装着。 */
function handleBundled(ctx, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, fail("method-not-allowed", "GET only"));
  const distDir = process.env.DSH_DESKTOP_PROFILE_DIST;
  if (!distDir) return sendJson(res, 200, fail("missing-env", "随应用分发的插件仅在 dsDesktop 里可用"));
  const index = readJsonSafe(join(distDir, "index.json"));
  if (!Array.isArray(index)) return sendJson(res, 200, fail("index-unreadable", "随包插件索引读不出来"));
  const dir = profileDir(ctx);
  const deps = dir === null ? {} : (readJsonSafe(join(dir, "package.json"))?.dependencies ?? {});
  const plugins = [];
  for (const entry of index) {
    if (typeof entry?.packageName !== "string" || !isValidPackageName(entry.packageName)) continue;
    plugins.push({
      packageName: entry.packageName,
      version: typeof entry.version === "string" ? entry.version : null,
      // required 的那个（插件市场自己）卸不掉，UI 据此不显示卸载/重装按钮。
      required: entry.required === true,
      installed: Object.prototype.hasOwnProperty.call(deps, entry.packageName)
    });
  }
  return sendJson(res, 200, { ok: true, data: { plugins } });
}

/** POST /bundled/install { name } —— 用发行包里的 tgz 把某个自带插件装回来。 */
async function handleBundledInstall(ctx, req, res) {
  if (req.method !== "POST") return sendJson(res, 405, fail("method-not-allowed", "POST only"));
  const distDir = process.env.DSH_DESKTOP_PROFILE_DIST;
  if (!distDir) return sendJson(res, 200, fail("missing-env", "随应用分发的插件仅在 dsDesktop 里可用"));
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 200, fail("bad-request", "请求体不是合法 JSON"));
  }
  const name = body?.name;
  if (!isValidPackageName(name)) return sendJson(res, 200, fail("bad-name", "包名不合法"));
  const index = readJsonSafe(join(distDir, "index.json"));
  // **只认索引里有的包**：tarball 路径由服务端从索引里取，浏览器半只传包名。让它传
  // 路径就等于「装本机任意一个文件」，那是完全另一个能力。
  const entry = Array.isArray(index) ? index.find((e) => e?.packageName === name) : undefined;
  if (!entry || typeof entry.tarball !== "string") {
    return sendJson(res, 200, fail("not-bundled", "这个插件不在随应用分发的清单里"));
  }
  const tarball = join(distDir, entry.tarball);
  if (!existsSync(tarball)) return sendJson(res, 200, fail("tarball-missing", "发行包里找不到这个插件的安装包"));
  const dir = profileDir(ctx);
  if (dir === null) return sendJson(res, 200, fail("no-profile", "定位不到 profile 目录"));
  if (pnpmBusy) return sendJson(res, 200, fail("busy", "已有一个安装/卸载正在进行，请等它完成"));
  pnpmBusy = true;
  try {
    const result = await runDshPlugin(basename(dir.replace(/[\\/]+$/, "")), ["add", tarball]);
    if (!result.ok) return sendJson(res, 200, result);
    return sendJson(res, 200, { ok: true, data: { name, version: entry.version ?? null, output: result.output } });
  } finally {
    pnpmBusy = false;
  }
}

/** 所有桌面端插件的路由都挤在这个我们自己说了算的前缀下，见文件头注释。 */
const ROUTE_PREFIX = "/api/dsdesktop/market";

const ROUTES = [
  ["/search", handleSearch],
  ["/detail", handleDetail],
  ["/installed", handleInstalled],
  ["/capabilities", handleCapabilities],
  ["/image", handleImage],
  ["/settings", handleGetSettings],
  ["/settings/save", handleSetSettings],
  ["/bundled", handleBundled],
  ["/bundled/install", handleBundledInstall],
  ["/profile-plugins/toggle", handleProfileToggle],
  ["/install", handleInstall],
  ["/uninstall", handleUninstall]
];

/**
 * 所有路由的统一入口防线。放在这里而不是各个 handler 里：这套检查的价值来自
 * 「一条都不漏」，撒进各个 handler 就会有下一个忘记加。
 */
function guard(ctx, req, res, handler) {
  // port 在请求时动态取：webServer 是 [Service.init] 时才绑定端口，apply 执行时还是 null。
  const port = ctx.webServer.port;
  if (port != null && !originAllowed(req, port)) {
    return sendJson(res, 403, fail("forbidden-origin", "跨源请求被拒绝"));
  }
  if (req.method === "POST" && !requireJson(req)) {
    return sendJson(res, 415, fail("unsupported-media-type", "Content-Type 必须是 application/json"));
  }
  return handler(ctx, req, res);
}

export const name = "dsh-market";

export const inject = ["webServer"];

/**
 * 镜像的**默认值**，来自 cordis config（见 Config）。它只是个兜底：真正生效的值优先
 * 读用户在面板里存的那份（settingsFile），理由见 readSettings。
 */
let configMirror = "";


export function apply(ctx, config) {
  // 只接受 https 的前缀：镜像地址是配置进来的，但配错成 http 就把「不走明文」这条
  // 防线开了个口子。
  const raw = typeof config?.imageMirror === "string" ? config.imageMirror.trim() : "";
  configMirror = normalizeMirror(raw);
  for (const [suffix, handler] of ROUTES) {
    const path = `${ROUTE_PREFIX}${suffix}`;
    ctx.effect(() => ctx.webServer.register({
      kind: "exact",
      path,
      handler: (req, res) => guard(ctx, req, res, handler)
    }), `market: ${path}`);
  }
}

// 只给单测用。本文件顶部只 import node 内置模块与 pure.js（没有 cordis），
// 所以能被 `node --test` 直接 import。
export const __test__ = { profileDir, HOST_PROTECTED_PACKAGES, protectedPackages };
