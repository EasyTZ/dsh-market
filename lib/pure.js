// dsh-market 的纯逻辑：零 import、无副作用、不碰 ctx / req / res / 网络 / 文件系统。
//
// 单独一个文件是为了**可单测**。这里的东西全是「把外部世界给的数据揉成我们要的形状」——
// npm registry 的搜索结果、包 manifest、profile 的 package.json。这三样都是别人定义的
// 格式，字段可能缺、可能是别的类型、可能哪天就变了，而判断错的后果不是报错而是安静地
// 给出错误结论（把不能装的标成能装、把已装的漏掉）。同 dsh-git 的 pure.js 一个套路。

/** npm 官方 registry。全插件只认这一个源，不做可配置——换源等于换信任根。 */
export const NPM_REGISTRY = "https://registry.npmjs.org";

/** npm 的下载量接口（和 registry 不同域）。 */
export const NPM_API = "https://api.npmjs.org";

/**
 * 支持的排序方式。
 *
 * `relevance` 交给 npm 的搜索排名（它综合了质量/热度/维护度，我们不重算）；
 * 另外两个由我们拿到结果后**在本地重排**，而不是塞给 npm 的 popularity/maintenance
 * 权重参数——实测那组权重在 `keywords:` 限定下对结果顺序没有可见影响，而按我们
 * 自己抓到的周下载量和发布时间排，用户看到的数字和顺序是同一个来源，对得上。
 */
export const SORTS = ["relevance", "downloads", "updated"];

/** 浏览默认词：npm 上 dsh 插件的约定关键词。 */
export const DEFAULT_KEYWORD = "dsh-plugin";

/**
 * 拼 npm 搜索用的 text。
 *
 * 空查询时按关键词浏览（`keywords:dsh-plugin`）；有查询词时**也带上关键词限定**——
 * 不带的话搜 "git" 会把整个 npm 的 git 相关包倒出来，几千条里没几条是 dsh 插件，
 * 列表直接失去意义。代价是没打这个关键词的插件搜不到，这个取舍由 UI 上的
 * 「搜索全部 npm」开关交给用户（onlyPlugins=false 时不加限定）。
 * @param {string} query 用户输入
 * @param {boolean} onlyPlugins 是否只搜带 dsh-plugin 关键词的包
 */
export function buildSearchText(query, onlyPlugins = true) {
  const q = String(query ?? "").trim();
  const keyword = `keywords:${DEFAULT_KEYWORD}`;
  if (!onlyPlugins) return q.length === 0 ? keyword : q;
  return q.length === 0 ? keyword : `${q} ${keyword}`;
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
  const patch = manifest?.dsh?.bundle?.patch;
  if (typeof patch !== "string" || patch.length === 0) return { installable: false, reason: "no-bundle" };
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    return { installable: false, reason: "no-version" };
  }
  return { installable: true, reason: null };
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
