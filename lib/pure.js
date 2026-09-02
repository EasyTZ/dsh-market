// dsh-market 的纯逻辑：零 import、无副作用、不碰 ctx / req / res / 网络 / 文件系统。
//
// 单独一个文件是为了**可单测**。这里的东西全是「把外部世界给的数据揉成我们要的形状」——
// npm registry 的搜索结果、包 manifest、profile 的 package.json。这三样都是别人定义的
// 格式，字段可能缺、可能是别的类型、可能哪天就变了，而判断错的后果不是报错而是安静地
// 给出错误结论（把不能装的标成能装、把已装的漏掉）。同 dsh-git 的 pure.js 一个套路。

/** npm 官方 registry。默认源，也是唯一的默认信任根。 */
export const NPM_REGISTRY = "https://registry.npmjs.org";

/**
 * 国内镜像：阿里云维护的 npmmirror.com，1:1 镜像官方 registry（含 tarball，不只是
 * 元数据）。**默认不用**，只有用户在面板里明确打开「国内镜像」开关才会切过去——
 * 这仍然是换信任根：镜像方理论上能对元数据撒谎（比如藏掉一个 deprecated 标记，
 * 或者伪造一段 README），但不能让你装到不同的代码——tarball 就算走镜像下载，装的
 * 也是发布者在真正的 npm 上传的那份内容（npmmirror 是同步镜像，不是自己另起炉灶）。
 * 这个风险边界跟本文件之前「换源等于换信任根」那条警告的出发点一致：只是现在把
 * 这个决定交还给用户自己做，而不是替他关死。
 *
 * 只做**这一个**镜像可选，不做成任意 URL：跟预览图那个镜像不一样，预览图镜像是
 * 「随便一个能反代的地址都行，反正只搬图片」；这里要是开放成任意地址，用户体验到
 * 的不再是「装的包和 npm 上一样、只是走了另一条网络路径」，而是「信不信这个陌生
 * 地址说的话」，两者的风险完全不是一个量级。
 */
export const NPM_REGISTRY_CN_MIRROR = "https://registry.npmmirror.com";

/**
 * npm 的下载量接口（和 registry 不同域）。npmmirror.com 没有镜像官方的批量接口
 * `/-/downloads/point/...`，但单包接口 `registry.npmmirror.com/downloads/point/<period>/<package>`
 * 实测可用；lib/index.js 里 fetchDownloads 会按源选择：官方源走这里，国内镜像走
 * npmmirror 单包接口。
 */
export const NPM_API = "https://api.npmjs.org";

/**
 * 支持的排序方式：周下载量、月下载量、最近更新。
 *
 * 没有「相关度」——npm 的 popularity/maintenance 权重实测在 `keywords:` 限定下对
 * 结果顺序没有可见影响，留着只是多一个「点了看不出区别」的选项。三个都由我们拿到
 * 结果后**在本地重排**：周/月下载量对应向下面 fetchDownloads 请求不同的统计区间
 * （由调用方决定抓哪个区间，这里只认统一的 `downloads` 字段），更新时间按发布时间。
 */
export const SORTS = ["downloads-week", "downloads-month", "updated"];

/** 浏览默认词：npm 上 dsh 插件的约定关键词。 */
export const DEFAULT_KEYWORD = "dsh-plugin";

/**
 * 拼 npm 搜索用的查询词。
 *
 * 这个函数本身**不再拼 `keywords:` 限定语法**——早期版本会在用户自由词后面拼一个
 * `keywords:dsh-plugin`，两次真实故障证明这条路走不通：
 *
 *   1. 官方 registry 上，把限定词跟用户打的自由词拼进同一个 `text`（比如
 *      `"easytz keywords:dsh-plugin"`）会导致自由词几乎被整个忽略——单独搜
 *      `easytz` 精确命中 6 个，拼上限定词后退化成跟没打字一样（用户反馈
 *      「我自己的 easytz 关键字就无法检索到」）。
 *   2. npmmirror.com（国内镜像）上，`keywords:` 限定语法直接不认——哪怕单独搜
 *      `keywords:dsh-plugin`（不掺任何自由词）都是 `total:0`（用户反馈「勾选
 *      国内镜像以后，发现中内容为 0」）。
 *
 * 所以这里只返回纯文本查询词；「是不是 dsh 插件」由调用方处理。当前 `all=1`
 * （搜整个 npm）直接使用这个纯文本查询词。默认的「只看 dsh 插件」模式则走
 * lib/index.js 里的 getTaggedIndex：官方源用 `keywords:dsh-plugin` 抓全量，
 * 国内镜像因为不认 `keywords:`，改为对纯文本 `dsh-plugin` 的结果分页抓全后按
 * `tagged` 过滤；用户自由词再由 filterTaggedIndex 在这个全量列表上本地过滤。
 *
 * 没打字（浏览默认列表）时用 `dsh-plugin` 这个词本身当基线——两个源都实测过，
 * 纯文本搜这个词能把绝大多数带这个关键词的包排进结果前列（它本来就是个不常见
 * 的复合词，不太可能被大量无关包意外命中）。
 * @param {string} query 用户输入
 */
export function buildSearchText(query) {
  const q = String(query ?? "").trim();
  return q.length === 0 ? DEFAULT_KEYWORD : q;
}

/** 从 `git+https://github.com/owner/repo.git` 这类写法里抠出 `owner/repo`；抠不出返回 null。 */
export function githubSlug(repositoryUrl) {
  const raw = String(repositoryUrl ?? "");
  // 支持 git+https://、https://、git://、ssh git@github.com: 四种常见写法。
  const m = /github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/#?]|$)/i.exec(raw);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

/**
 * npm 搜索结果 → 列表项。
 *
 * 搜索接口的 package 对象里已经有 keywords / links / publisher / license / date，
 * 所以列表页**一次请求就能画完**，不需要为每条再打一次 detail。这是选 npm 而不是
 * GitHub 做主干的直接好处之一。
 */
export function normalizeSearchHits(payload) {
  const objects = Array.isArray(payload?.objects) ? payload.objects : [];
  const items = [];
  for (const object of objects) {
    const pkg = object?.package;
    if (!pkg || typeof pkg.name !== "string" || pkg.name.length === 0) continue;
    const links = pkg.links ?? {};
    const repository = typeof links.repository === "string" ? links.repository : null;
    items.push({
      name: pkg.name,
      version: typeof pkg.version === "string" ? pkg.version : null,
      description: typeof pkg.description === "string" ? pkg.description : "",
      keywords: Array.isArray(pkg.keywords) ? pkg.keywords.filter((k) => typeof k === "string") : [],
      license: typeof pkg.license === "string" ? pkg.license : null,
      date: typeof pkg.date === "string" ? pkg.date : null,
      publisher: typeof pkg.publisher?.username === "string" ? pkg.publisher.username : null,
      repository,
      github: githubSlug(repository),
      // 带关键词 = 作者自己声明这是个 dsh 插件。这不是「能装」的证据（那要看
      // dsh.bundle.patch，得展开详情才知道），只是列表上的一个弱信号。
      tagged: Array.isArray(pkg.keywords) && pkg.keywords.includes(DEFAULT_KEYWORD)
    });
  }
  return {
    total: Number.isFinite(payload?.total) ? payload.total : items.length,
    items
  };
}

/**
 * 从一批 npm 搜索结果里挑出带 `dsh-plugin` 关键词的，按 `from`/`size` 切一页。
 *
 * 用在「只看 dsh 插件」这个过滤——不再信任 npm/镜像的 `keywords:` 字段限定语法
 * （完整故障史见 buildSearchText 的注释），改成纯文本搜出一批结果，自己按
 * `tagged` 字段筛。
 *
 * 传入的 `items` 应该是**未分页**的一整批（调用方一次多抓、不按用户的分页参数
 * 转发请求）——过滤会丢掉大部分结果，「过滤前的第 2 页」不等于「过滤后的第 2
 * 页」，按原始分页参数去抓那一页可能一条 tagged 的都没有。
 *
 * @param {{ tagged: boolean }[]} items normalizeSearchHits 的 items
 * @param {number} from
 * @param {number} size
 */
export function paginateTagged(items, from, size) {
  const tagged = items.filter((item) => item.tagged);
  return { total: tagged.length, items: tagged.slice(from, from + size) };
}

/**
 * 在已经确认带 `dsh-plugin` 标签的全量列表里，按用户输入做本地过滤。
 *
 * 全量列表的抓取见 lib/index.js 里的 getTaggedIndex：官方源用 `keywords:dsh-plugin`
 * 分页抓全，国内镜像因为不认 `keywords:` 语法，改为对纯文本 `dsh-plugin` 的结果分页
 * 抓全后按 `tagged` 筛出来。拿到全量列表之后，用户输入的过滤就不该再依赖 npm 的
 * 全文检索了——那样又回到了「只搜前 250 条」的老问题。
 *
 * 匹配规则从宽：把包名、描述、关键词、发布者拼成一个字符串，用户输入的每个空白分隔
 * 词都必须在里面出现。这样 `easytz` 能命中名字或发布者，`git` 能命中名字/描述/关键词
 * 里的 git；不把仓库 URL 纳入匹配——`github.com` 里也包含 `git`，会把所有挂在 GitHub
 * 上的包都误命中，用户搜 `git` 时列表会失去过滤意义。
 *
 * @param {{ name: string, description?: string, keywords?: string[], publisher?: string|null }[]} items
 * @param {string} query 用户输入
 */
export function filterTaggedIndex(items, query) {
  const terms = String(query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items.slice();
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.description,
      ...(Array.isArray(item.keywords) ? item.keywords : []),
      item.publisher
    ].filter((value) => typeof value === "string" && value.length > 0).join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** 镜像值归一化：只接受 https 前缀，其余一律当成「没配」。 */
export function normalizeMirror(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!/^https:\/\//i.test(raw)) return "";
  try {
    new URL(raw);
    return raw;
  } catch {
    return "";
  }
}

/**
 * 算出 POST /settings 这次写入之后，落盘的设置该是什么样。
 *
 * **合并，不是整份覆盖**：请求体里没提到的字段要原样保留 `stored` 里已有的值。
 * 面板上两个设置各自独立触发（预览图镜像的重试按钮 vs 国内 registry 镜像的
 * 开关），一次请求通常只带一个字段——按整份覆盖的写法，开一次国内镜像就会把
 * 已经保存的图片镜像悄悄清空，反过来也一样。这条不变式值得单独测：它不是那种
 * 一眼能看出错在哪的 bug，两个设置分别测都是绿的，只有「先存 A 再存 B，A 还在
 * 不在」这种顺序性场景才会暴露。
 *
 * @param {any} stored 已存的设置（可能是 null、或者格式已经不对的旧数据）
 * @param {any} body 请求体
 * @returns {{ ok: true, next: object } | { ok: false, error: { code: string, message: string } }}
 */
export function planSettingsUpdate(stored, body) {
  const next = { ...(stored && typeof stored === "object" ? stored : {}) };
  const b = body && typeof body === "object" ? body : {};
  if (Object.prototype.hasOwnProperty.call(b, "imageMirror")) {
    const raw = typeof b.imageMirror === "string" ? b.imageMirror.trim() : "";
    // 空字符串是合法输入（表示关掉镜像）；非空但不是 https 的要报错，不能静默
    // 丢掉——用户填了个 http:// 然后发现「保存了但没生效」比直接报错难查得多。
    if (raw.length > 0 && normalizeMirror(raw) === "") {
      return { ok: false, error: { code: "bad-mirror", message: "镜像地址必须是 https:// 开头的合法地址" } };
    }
    next.imageMirror = normalizeMirror(raw);
  }
  if (Object.prototype.hasOwnProperty.call(b, "registryMirror")) {
    next.registryMirror = b.registryMirror === true;
  }
  return { ok: true, next };
}

/**
 * 包声明的 overlay patch 相对路径（`dsh.bundle.patch`）；没声明返回 null。
 *
 * 单独抽出来是因为有**两个**地方要认同一条规则，且两边不能各写一遍：装之前拿 npm
 * 的 manifest 判断「这包算不算插件」（installability），装之后拿磁盘上那份 manifest
 * 判断「它承诺的那个文件到底在不在」（见 lib/index.js 的 missingBundlePatch）。
 *
 * @param {object} manifest 包的 package.json（npm 上那份或磁盘上那份都行）
 * @returns {string|null}
 */
export function declaredBundlePatch(manifest) {
  const patch = manifest?.dsh?.bundle?.patch;
  return typeof patch === "string" && patch.length > 0 ? patch : null;
}

/**
 * 判断一个包能不能被这个市场装。
 *
 * 唯一的硬条件是 **manifest 里声明了 `dsh.bundle.patch`**：没有它，`dsh plugin add`
 * 只会把包装进 dependencies、打一句 warning、然后永远不激活——用户点了「安装」却
 * 什么都不会发生，这是最糟的一种「成功」。参考实现（dsh-community-market）也是拿
 * 这一条当资格线。
 *
 * 刻意**不**拿这些当条件：来源方声明的版本、验证徽章、仓库是否一致、deprecated
 * 标记、engine 范围。它们要么可伪造、要么误杀合法插件，而真正的风险（装完是本地
 * 执行的代码）不是靠这些字段能挡住的——那件事只能靠展示清楚 + 用户确认。
 *
 * @param {object} manifest `<name>/latest` 返回的 manifest
 * @param {Set<string>|string[]} [protectedNames] 不允许经市场安装/卸载的包名（宿主自己的产品包）
 */
export function installability(manifest, protectedNames = []) {
  const protectedSet = protectedNames instanceof Set ? protectedNames : new Set(protectedNames);
  const name = typeof manifest?.name === "string" ? manifest.name : null;
  if (!name) return { installable: false, reason: "no-manifest" };
  if (protectedSet.has(name)) return { installable: false, reason: "protected" };
  if (manifest.deprecated !== undefined) {
    // 弃用不拦，但要在 UI 上说明白——作者自己说了别用了，用户有权知道。
    // 这里只标记，不改 installable。
  }
  if (declaredBundlePatch(manifest) === null) return { installable: false, reason: "no-bundle" };
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    return { installable: false, reason: "no-version" };
  }
  return { installable: true, reason: null };
}

/** `x.y.z[-prerelease]` → `{ core: [x,y,z], pre }`，解析不了返回 null。 */
function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(v ?? "").trim());
  if (!m) return null;
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null };
}

/**
 * 比较两个版本号：a 比 b 新返回 1，一样返回 0，a 比 b 旧返回 -1。
 *
 * 任何一边解析不出 `x.y.z` 就返回 null——「不知道」，不瞎猜方向。调用方（见
 * isUpdateAvailable）据此把「解析不了」当成「没有更新」处理，而不是显示一个可能
 * 是错的「有更新」提示。
 */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i += 1) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] > pb.core[i] ? 1 : -1;
  }
  if (pa.pre === pb.pre) return 0;
  // 带预发布标签的版本比同号正式版旧（1.0.0-rc.1 < 1.0.0）；两边都带标签时按
  // 字典序——这里只用来决定要不要显示「有更新」，不需要严格遵守 semver 全部规则。
  if (pa.pre === null) return 1;
  if (pb.pre === null) return -1;
  return pa.pre > pb.pre ? 1 : -1;
}

/** 已装版本是不是比 npm 上的 latest 旧。任何一边为空/解析不了就是「没有更新」。 */
export function isUpdateAvailable(installedVersion, latestVersion) {
  return compareVersions(latestVersion, installedVersion) === 1;
}

/** `<name>/latest` 的 manifest → 详情面板要的字段。 */
export function normalizeManifest(manifest, protectedNames = []) {
  const repository = typeof manifest?.repository === "string"
    ? manifest.repository
    : typeof manifest?.repository?.url === "string" ? manifest.repository.url : null;
  const { installable, reason } = installability(manifest, protectedNames);
  return {
    name: typeof manifest?.name === "string" ? manifest.name : null,
    version: typeof manifest?.version === "string" ? manifest.version : null,
    description: typeof manifest?.description === "string" ? manifest.description : "",
    license: typeof manifest?.license === "string" ? manifest.license : null,
    homepage: typeof manifest?.homepage === "string" ? manifest.homepage : null,
    repository,
    github: githubSlug(repository),
    keywords: Array.isArray(manifest?.keywords) ? manifest.keywords.filter((k) => typeof k === "string") : [],
    deprecated: typeof manifest?.deprecated === "string" ? manifest.deprecated : manifest?.deprecated !== undefined ? "" : null,
    // 依赖数量只做展示：一个插件拉进来多少东西，用户装之前有权看一眼。
    dependencies: manifest?.dependencies && typeof manifest.dependencies === "object"
      ? Object.keys(manifest.dependencies).length : 0,
    installable,
    reason
  };
}

/**
 * profile 的 package.json → 已安装列表。
 *
 * 只看**直接依赖**，不展开依赖树：用户装的是这些，传递依赖是 pnpm 的事。
 * `dsh.profile.bundles` 里出现 = 已经作为 patch 层激活（`dsh plugin add` 的
 * reconcile 会把带 dsh.bundle 的依赖追加进去），没出现就是「装了但没激活」——
 * 那正是缺 dsh.bundle 的包的下场，UI 上要能看出区别。
 *
 * @param {object} profileManifest profile 目录的 package.json
 * @param {(name: string) => object|null} readInstalled 读已安装包的 manifest（缺失返回 null）
 * @param {Set<string>|string[]} [protectedNames] 不允许卸载的包名
 */
export function normalizeInstalled(profileManifest, readInstalled, protectedNames = []) {
  const protectedSet = protectedNames instanceof Set ? protectedNames : new Set(protectedNames);
  const deps = profileManifest?.dependencies && typeof profileManifest.dependencies === "object"
    ? profileManifest.dependencies : {};
  const bundles = new Set(Array.isArray(profileManifest?.dsh?.profile?.bundles)
    ? profileManifest.dsh.profile.bundles.filter((b) => typeof b === "string") : []);
  const items = [];
  for (const [name, spec] of Object.entries(deps)) {
    const manifest = readInstalled(name);
    items.push({
      name,
      // spec 是 package.json 里写的范围（`^1.36.0`），installedVersion 是实际装到的
      // 版本。两个都给：范围解释「为什么会自己变」，实际版本才是现在跑的东西。
      spec: typeof spec === "string" ? spec : null,
      installedVersion: typeof manifest?.version === "string" ? manifest.version : null,
      description: typeof manifest?.description === "string" ? manifest.description : "",
      repository: typeof manifest?.repository?.url === "string" ? manifest.repository.url : null,
      activated: bundles.has(name),
      removable: !protectedSet.has(name)
    });
  }
  items.sort((left, right) => left.name.localeCompare(right.name));
  return { items };
}

/**
 * 把下载量接口的响应揉成 `{ 包名: 周下载量 }`。
 *
 * 两种形状都要认：批量查（`/downloads/point/last-week/a,b,c`）返回 `{a:{downloads},…}`，
 * 单个查返回 `{downloads, package}`。scoped 包不支持批量（实测报
 * `scoped packages are not currently supported in bulk lookups`），只能一个个查，
 * 所以这两种形状必然同时出现在一次刷新里。
 */
export function normalizeDownloads(payload) {
  const out = {};
  if (!payload || typeof payload !== "object") return out;
  if (typeof payload.package === "string" && Number.isFinite(payload.downloads)) {
    out[payload.package] = payload.downloads;
    return out;
  }
  for (const [name, value] of Object.entries(payload)) {
    if (value && typeof value === "object" && Number.isFinite(value.downloads)) out[name] = value.downloads;
  }
  return out;
}

/**
 * 把下载量并进结果，并按要求重排。
 *
 * 拿不到下载量的条目按 null 处理，排序时沉到最后而不是当成 0——「没数据」和
 * 「没人下载」是两回事，混在一起会让新发布的包看起来像是被抛弃的包。
 */
export function applyDownloads(items, downloads, sort) {
  const merged = items.map((item) => ({
    ...item,
    downloads: Object.prototype.hasOwnProperty.call(downloads, item.name) ? downloads[item.name] : null
  }));
  if (sort === "downloads") {
    merged.sort((left, right) => {
      if (left.downloads === right.downloads) return left.name.localeCompare(right.name);
      if (left.downloads === null) return 1;
      if (right.downloads === null) return -1;
      return right.downloads - left.downloads;
    });
  } else if (sort === "updated") {
    merged.sort((left, right) => {
      const l = Date.parse(left.date ?? "");
      const r = Date.parse(right.date ?? "");
      if (Number.isNaN(l) && Number.isNaN(r)) return left.name.localeCompare(right.name);
      if (Number.isNaN(l)) return 1;
      if (Number.isNaN(r)) return -1;
      return r - l;
    });
  }
  return merged;
}

/** 12345 → `1.2万` / `12.3k`，按语言给。列表上精确到个位没有意义，还占宽度。 */
export function formatDownloads(value, locale = "zh") {
  if (!Number.isFinite(value)) return null;
  if (locale === "zh") {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`;
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
    return String(value);
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

/**
 * README 里哪些图片是**徽章**而不是截图。
 *
 * 皮肤/主题类插件的 README 顶部通常先堆一排 shields.io 徽章，再放真正的截图。
 * 不过滤的话预览区第一屏全是「build passing」「npm v1.2.3」这种小条，用户看不到
 * 他真正想看的东西。按 host 判断而不是按尺寸——尺寸要下载了才知道。
 */
const BADGE_HOSTS = [
  "img.shields.io", "shields.io", "badge.fury.io", "badgen.net", "flat.badgen.net",
  "travis-ci.org", "travis-ci.com", "circleci.com", "codecov.io", "coveralls.io",
  "app.codacy.com", "snyk.io", "David-dm.org", "david-dm.org", "nodei.co",
  "api.netlify.com", "github.com/badges", "forthebadge.com", "visitor-badge"
];

export function isBadgeUrl(url) {
  const raw = String(url ?? "").toLowerCase();
  if (raw.length === 0) return false;
  if (BADGE_HOSTS.some((host) => raw.includes(host.toLowerCase()))) return true;
  // GitHub 自家的 workflow 徽章走仓库路径，认路径特征。
  return /\/badge\.svg|\/workflows\/[^/]+\/badge|shields\.io/.test(raw);
}

/**
 * 相对图片路径 → 一组**按可达性排序**的候选绝对地址。
 *
 * 为什么是「一组」而不是一个：`assets/demo.png` 这种相对路径至少有两个去处，而它们
 * 的可达性在不同网络下差别巨大。实测（企业网 / 国内网络）：
 *
 *   · `raw.githubusercontent.com` —— 权威来源，但**直接超时**，很多国内网络都拿不到；
 *   · `cdn.jsdelivr.net/npm/<pkg>@<ver>/<path>` —— 通，但只有文件真的打进了 npm 包
 *     （在 package.json 的 `files` 里）才有；很多作者不会把截图打包进去。
 *
 * 两个都试、谁先给出图片就用谁，是唯一能在两种网络下都尽量出图的做法。顺序把 jsDelivr
 * 放前面：它命中时快，且不命中时是干脆的 404 而不是几秒的超时。
 *
 * 已经是绝对 https 地址的原样返回（单元素数组）。http:// 一律丢弃：混合内容会被浏览器
 * 拦，明文加载还会把「用户在看哪个插件」泄露给中间人。
 */
export function imageCandidates(url, { slug, name, version, mirror } = {}) {
  const raw = String(url ?? "").trim();
  if (raw.length === 0) return [];
  // 镜像是个前缀，拼在**完整原始地址**前面（`https://gh-proxy.com/https://raw.…`），
  // 这是这类代理的通用形状。只有在原地址取不到时才轮到它，所以永远排在最后。
  const withMirror = (list) => {
    if (!mirror) return list;
    const prefix = String(mirror).replace(/\/+$/, "");
    const extra = list
      .filter((candidate) => candidate.includes("githubusercontent.com") || candidate.includes("github.com"))
      .map((candidate) => `${prefix}/${candidate}`);
    return [...list, ...extra];
  };
  if (/^https:\/\//i.test(raw)) return withMirror([raw]);
  if (/^https?:\/\//i.test(raw) || raw.startsWith("//") || raw.startsWith("data:")) return [];
  const path = raw.replace(/^\.\//, "").replace(/^\//, "").split(/[?#]/)[0];
  if (path.length === 0) return [];
  const out = [];
  if (name && version) out.push(`https://cdn.jsdelivr.net/npm/${name}@${version}/${path}`);
  if (slug) out.push(`https://raw.githubusercontent.com/${slug}/HEAD/${path}`);
  return withMirror(out);
}

/**
 * 单个候选地址（给校验与去重用）。保留这个薄封装是因为「相对路径能不能还原」这件事
 * 在抽取阶段就要判断——还原不出来的图根本不该进列表。
 */
export function resolveImageUrl(url, githubSlug) {
  const candidates = imageCandidates(url, { slug: githubSlug });
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

/**
 * 从 README 里抽出可用作预览的图片。
 *
 * markdown 的 `![alt](url)` 和内嵌 HTML 的 `<img src>` 都要认——很多 README 为了
 * 控制宽度用的是后者（`<img width="100%">`）。抽完过滤徽章、还原相对路径、去重、
 * 封顶数量：预览区不是画廊，前几张就够判断「这插件长什么样」了。
 *
 * @param {string} readme README 原文
 * @param {string|null} slug `owner/repo`，用于还原相对路径
 * @param {number} limit 最多返回几张
 */
export function extractImages(readme, slug, limit = 6) {
  const text = String(readme ?? "");
  const found = [];
  const seen = new Set();
  const push = (rawUrl, alt) => {
    if (found.length >= limit) return;
    // 保留**原始写法**（可能是相对路径），候选地址等到真要取图时再算——那时才知道
    // 包名与版本，而 jsDelivr 那条候选需要它们。
    const probe = resolveImageUrl(rawUrl, slug);
    if (probe === null || isBadgeUrl(probe) || seen.has(probe)) return;
    // 只认常见位图/矢量后缀（可带 query）。README 里链到 .md/.zip 的「图片」不是没有。
    if (!/\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(probe)) return;
    seen.add(probe);
    found.push({
      url: probe,
      raw: String(rawUrl ?? "").trim(),
      alt: typeof alt === "string" ? alt.trim().slice(0, 120) : ""
    });
  };
  for (const m of text.matchAll(/!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?[^)]*\)/g)) push(m[2], m[1]);
  for (const m of text.matchAll(/<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(m[0]);
    push(m[1], alt ? alt[1] : "");
  }
  return found;
}

/**
 * npm 包名合法性。安装是 spawn pnpm，包名会变成命令行参数——这道校验就是那条
 * 命令行的第一道也是唯一一道防线，宁可严一点。
 *
 * 规则取自 npm 官方：小写、可带一层 scope、只允许 `a-z0-9-._~`、不以 `.` 或 `_`
 * 开头、总长 ≤ 214。刻意**不**接受空格与 `@` 后缀（`pkg@1.2.3` 那种版本写法必须
 * 走单独的字段，混在名字里就没法校验了）。
 *
 * **另外禁掉以 `-` 开头**，这条不在 npm 的规则里，是我们自己加的：`-` 是合法的
 * 包名字符，于是 `-g`、`--force` 这种整串都由合法字符组成的输入能通过 npm 那套
 * 校验——然后作为**参数**而不是包名被 pnpm 吃掉。第一版就漏了这个，是单测逮到的。
 */
export function isValidPackageName(name) {
  if (typeof name !== "string" || name.length === 0 || name.length > 214) return false;
  if (name !== name.toLowerCase()) return false;
  if (/^[._-]/.test(name)) return false;
  if (name.startsWith("@")) {
    const slash = name.indexOf("/");
    if (slash < 2 || slash === name.length - 1) return false;
    const scope = name.slice(1, slash);
    const rest = name.slice(slash + 1);
    return /^[a-z0-9\-._~]+$/.test(scope) && /^[a-z0-9\-._~]+$/.test(rest) && !/^[._-]/.test(rest);
  }
  return /^[a-z0-9\-._~]+$/.test(name);
}

/**
 * 把包名转成能拼进 registry URL 路径的形式。
 *
 * scope 前缀那个 `@` 特意不编码成 `%40`——它在 URL 的 path 部分本来就是合法字符
 * （RFC 3986 的 pchar 集合包含 `@`，只有在 URL 的 authority 部分才需要转义）。
 * npm 官方 registry 两种写法都认，但 npmmirror.com（国内镜像）只认原样的 `@`，
 * 遇到 `%40` 直接 404——实测过：一个 scoped 包能在搜索结果里刷出来（搜索走的是
 * 查询参数，不涉及这个路径拼接），点进详情却说「npm 上没有这个包」（详情走的是
 * `/<name>/latest` 这种路径拼接，被 `%40` 挡在门外了），查出来是这个编码差异，
 * 不是包真的不存在。
 *
 * 只处理**开头**的 `%40`：包名最多两段（`@scope/name` 或纯 `name`），只有第一段
 * 可能以编码后的 `@` 开头，其余字符仍然正常 `encodeURIComponent`。
 *
 * @param {string} name 已经过 isValidPackageName 校验的包名
 */
export function packageUrlPath(name) {
  return name.split("/").map(encodeURIComponent).join("/").replace(/^%40/, "@");
}

/**
 * 精确版本号校验（semver 的子集：只放行确定的版本，不放行范围）。
 *
 * 装的时候必须钉死精确版本，不能让 `^1.2.0` 这种范围进去——期望状态不确定的话，
 * 「内核更新后插件还是那一版」这个承诺就是空的（pnpm 会在某次 install 时悄悄
 * 漂到新版本）。这也是我们和 `dsh plugin add <name>`（装成 `^x.y.z`）的区别。
 */
export function isExactVersion(version) {
  return typeof version === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version);
}

/**
 * 取一段输出的最后 n 行，并限制总长度。
 *
 * 安装失败时要把 pnpm 说了什么给用户看——「安装失败」四个字对排查毫无帮助，而
 * pnpm 的真实原因（网络、权限、peer 冲突、需要 allowBuilds）都写在输出末尾。
 * 但那个输出可能有几 MB（pnpm 的进度条会刷屏），整个塞进 JSON 响应会把面板卡住，
 * 所以取尾部并封顶。
 */
export function tailLines(text, maxLines = 20, maxChars = 4000) {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n").filter((line) => line.trim().length > 0);
  const tail = lines.slice(-maxLines).join("\n");
  return tail.length > maxChars ? tail.slice(tail.length - maxChars) : tail;
}
