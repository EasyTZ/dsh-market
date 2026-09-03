// pure.js 的单测。这里的每个函数都在「外部世界给的数据 → 我们据此做决定」这条链上，
// 判断错的后果是安静地给出错误结论：把不能装的标成能装、把已装的漏掉、或者把一个
// 带引号的字符串当成包名送进命令行。
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSearchText, filterTaggedIndex, githubSlug, installability, isExactVersion, isValidPackageName,
  applyDownloads, extractImages, formatDownloads, imageCandidates, isBadgeUrl,
  mergeDownloads, normalizeDownloads, resolveImageUrl,
  normalizeInstalled, normalizeManifest, normalizeMirror, normalizeSearchHits, packageUrlPath,
  paginateTagged, planSettingsUpdate, tailLines,
  compareVersions, isUpdateAvailable
} from "../lib/pure.js";

test("buildSearchText: 不再拼 keywords: 限定语法——空查询退化成纯文本的 dsh-plugin 基线，有查询词原样透传", () => {
  // 真实故障史（详见函数自己的注释）：`keywords:dsh-plugin` 这种字段限定语法，
  // 跟自由词拼在一起会让官方 registry 把自由词几乎整个忽略（"easytz" 那次故障）；
  // npmmirror.com 国内镜像上这语法干脆整个不认，哪怕单独搜都是 total:0（"国内
  // 镜像下发现页是空的" 那次故障）。两次故障都指向同一个修复：不再用限定语法。
  assert.equal(buildSearchText(""), "dsh-plugin");
  assert.equal(buildSearchText("  "), "dsh-plugin");
  assert.equal(buildSearchText("git"), "git", "有查询词就该原样透传，不该被拼上别的东西");
  assert.equal(buildSearchText("easytz"), "easytz");
  assert.equal(buildSearchText("keywords:dsh-plugin"), "keywords:dsh-plugin", "用户自己想打这种语法也随他，函数不替他加工");
});

test("githubSlug: 认得四种常见仓库写法", () => {
  assert.equal(githubSlug("git+https://github.com/EasyTZ/dsh-git.git"), "EasyTZ/dsh-git");
  assert.equal(githubSlug("https://github.com/EasyTZ/dsh-git"), "EasyTZ/dsh-git");
  assert.equal(githubSlug("git://github.com/EasyTZ/dsh-git.git"), "EasyTZ/dsh-git");
  assert.equal(githubSlug("git@github.com:EasyTZ/dsh-git.git"), "EasyTZ/dsh-git");
  assert.equal(githubSlug("https://github.com/EasyTZ/dsh-git#readme"), "EasyTZ/dsh-git");
  assert.equal(githubSlug("https://gitlab.com/a/b"), null);
  assert.equal(githubSlug(undefined), null);
});

test("normalizeSearchHits: 取到列表要用的全部字段，缺字段不抛", () => {
  const payload = { total: 2, objects: [
    { package: {
      name: "dsh-foo", version: "1.2.3", description: "d", license: "MIT",
      date: "2026-08-01T00:00:00.000Z", keywords: ["dsh-plugin", "x"],
      publisher: { username: "someone" },
      links: { repository: "git+https://github.com/o/r.git" }
    } },
    { package: { name: "bare" } }
  ] };
  const { total, items } = normalizeSearchHits(payload);
  assert.equal(total, 2);
  assert.equal(items[0].name, "dsh-foo");
  assert.equal(items[0].github, "o/r");
  assert.equal(items[0].publisher, "someone");
  assert.equal(items[0].tagged, true);
  // 字段全缺的那条也要能出来，只是值退化
  assert.equal(items[1].name, "bare");
  assert.equal(items[1].description, "");
  assert.deepEqual(items[1].keywords, []);
  assert.equal(items[1].tagged, false);
  assert.equal(items[1].github, null);
});

test("normalizeSearchHits: 没有 name 的条目直接丢掉（拿它没法做任何事）", () => {
  const { items } = normalizeSearchHits({ objects: [{ package: {} }, { package: { name: "" } }, {}] });
  assert.deepEqual(items, []);
});

test("normalizeSearchHits: 输入完全不是那个形状时返回空，不抛", () => {
  assert.deepEqual(normalizeSearchHits(null).items, []);
  assert.deepEqual(normalizeSearchHits({ objects: "nope" }).items, []);
});

test("paginateTagged: 只留 tagged 的，total 是过滤后的数量，不是原始数组长度", () => {
  // 复刻真实故障：搜自己的包名前缀（比如 "easytz"）时，npm 把「keywords: 限定」
  // 和查询词拼在一起会整个吃掉查询词（见 lib/index.js 里 handleSearch 的说明），
  // 所以这个组合改成不加限定去搜、自己按 tagged 过滤——这里就是那步过滤 + 分页
  // 的逻辑，必须只统计真正打了 dsh-plugin 关键词的那些。
  const items = [
    { name: "a", tagged: true },
    { name: "b", tagged: false },
    { name: "c", tagged: true },
    { name: "d", tagged: false },
    { name: "e", tagged: true }
  ];
  const { total, items: page } = paginateTagged(items, 0, 10);
  assert.equal(total, 3, "total 应该是 tagged 的数量（3），不是原始数组长度（5）");
  assert.deepEqual(page.map((i) => i.name), ["a", "c", "e"]);
});

test("paginateTagged: 过滤之后才分页——不能先按 from/size 切原始数组再过滤", () => {
  // 这条专门卡住「先分页再过滤」这个更省事但错误的写法：如果 from/size 是切在
  // 原始（未过滤）数组上，第 2 页可能整页都不是 tagged 的，用户翻页会看到空白，
  // 即便总共明明还有没看过的 tagged 结果。
  const items = [
    { name: "untagged-1", tagged: false },
    { name: "untagged-2", tagged: false },
    { name: "tagged-1", tagged: true },
    { name: "tagged-2", tagged: true },
    { name: "tagged-3", tagged: true }
  ];
  // size=2 的「第一页」：如果错误地先切 items[0:2]（两条都是 untagged）再过滤，
  // 会拿到空列表；正确顺序（先过滤再切）应该拿到前两条 tagged 的。
  const { total, items: page } = paginateTagged(items, 0, 2);
  assert.equal(total, 3);
  assert.deepEqual(page.map((i) => i.name), ["tagged-1", "tagged-2"]);
});

test("paginateTagged: from 超出范围时返回空列表，不抛", () => {
  const items = [{ name: "a", tagged: true }];
  assert.deepEqual(paginateTagged(items, 5, 10).items, []);
});

test("filterTaggedIndex: 空查询返回全量列表，不修改原数组", () => {
  const items = [
    { name: "dsh-git", description: "git tools", keywords: ["dsh-plugin"], publisher: "easytz", repository: "https://github.com/easytz/dsh-git", github: "easytz/dsh-git" },
    { name: "dsh-pocket", description: "pocket", keywords: ["dsh-plugin"], publisher: "bob", repository: null, github: null }
  ];
  const filtered = filterTaggedIndex(items, "");
  assert.deepEqual(filtered, items);
  assert.notEqual(filtered, items, "返回的应该是副本，调用方继续 slice/排序不会动到缓存里的全量索引");
});

test("filterTaggedIndex: 用户词按空白拆开，每个词都必须在名字/描述/关键词/发布者/仓库里出现", () => {
  const items = [
    { name: "dsh-git", description: "git tools", keywords: ["dsh-plugin"], publisher: "easytz", repository: "https://github.com/easytz/dsh-git", github: "easytz/dsh-git" },
    { name: "dsh-pocket", description: "pocket", keywords: ["dsh-plugin"], publisher: "bob", repository: null, github: null },
    { name: "dsh-terminal-panel", description: "terminal in panel", keywords: ["dsh-plugin"], publisher: "alice", repository: "https://github.com/alice/dsh-terminal-panel", github: "alice/dsh-terminal-panel" }
  ];
  assert.deepEqual(filterTaggedIndex(items, "git").map((i) => i.name), ["dsh-git"]);
  assert.deepEqual(filterTaggedIndex(items, "easytz").map((i) => i.name), ["dsh-git"]);
  assert.deepEqual(filterTaggedIndex(items, "panel terminal").map((i) => i.name), ["dsh-terminal-panel"]);
  assert.deepEqual(filterTaggedIndex(items, "no-such-word"), []);
});

test("normalizeMirror: 只认 https 前缀的合法地址，其余一律当成没配", () => {
  assert.equal(normalizeMirror("https://gh-proxy.com/"), "https://gh-proxy.com/");
  assert.equal(normalizeMirror("http://gh-proxy.com/"), "", "http 不算——镜像明文传输等于把出网内容拱手让人");
  assert.equal(normalizeMirror(""), "");
  assert.equal(normalizeMirror("   "), "");
  assert.equal(normalizeMirror(undefined), "");
  assert.equal(normalizeMirror("not a url"), "");
  assert.equal(normalizeMirror(123), "", "非字符串输入不能让 new URL() 抛到调用方那里");
});

test("planSettingsUpdate: 只碰请求体里带了的字段，没提到的原样保留", () => {
  // 真实故障场景：面板上两个设置各自独立触发（预览图镜像的重试按钮 vs 国内
  // registry 镜像的开关），一次请求通常只带一个字段。按「整份覆盖」的写法，
  // 先存好 imageMirror，再单独开一次 registryMirror，前者会被悄悄清空——两个
  // 设置分别测都是绿的，只有这种「先存 A 再存 B」的顺序场景才会暴露。
  const stored = { imageMirror: "https://gh-proxy.com/" };
  const plan = planSettingsUpdate(stored, { registryMirror: true });
  assert.deepEqual(plan, { ok: true, next: { imageMirror: "https://gh-proxy.com/", registryMirror: true } });
});

test("planSettingsUpdate: 反过来也一样——只存 imageMirror 不该动已经开着的 registryMirror", () => {
  const stored = { imageMirror: "", registryMirror: true };
  const plan = planSettingsUpdate(stored, { imageMirror: "https://gh-proxy.com/" });
  assert.deepEqual(plan, { ok: true, next: { imageMirror: "https://gh-proxy.com/", registryMirror: true } });
});

test("planSettingsUpdate: imageMirror 非空但不是合法 https 地址要报错，不能静默丢掉", () => {
  const plan = planSettingsUpdate({}, { imageMirror: "http://not-https.example/" });
  assert.equal(plan.ok, false);
  assert.equal(plan.error.code, "bad-mirror");
});

test("planSettingsUpdate: 空字符串是合法输入，表示关掉镜像", () => {
  const plan = planSettingsUpdate({ imageMirror: "https://gh-proxy.com/" }, { imageMirror: "" });
  assert.deepEqual(plan, { ok: true, next: { imageMirror: "" } });
});

test("planSettingsUpdate: registryMirror 只认字面意义上的 true，别的真值不能被当成开了", () => {
  // 存进文件里的可能是任何 JSON 形状（用户手改过、旧版本格式）。宁可当「没开」
  // 也不能把非布尔的真值（字符串 "yes"、数字 1）悄悄当成开了——那样设置页显示
  // 是关的，实际请求却在走镜像，用户看不出这个错位。
  const plan = planSettingsUpdate({}, { registryMirror: "yes" });
  assert.deepEqual(plan, { ok: true, next: { registryMirror: false } });
});

test("planSettingsUpdate: 已存的设置读不出来（null / 坏格式）时不该抛，退化成空对象", () => {
  assert.deepEqual(planSettingsUpdate(null, { registryMirror: true }), { ok: true, next: { registryMirror: true } });
  assert.deepEqual(planSettingsUpdate("not an object", { registryMirror: true }), { ok: true, next: { registryMirror: true } });
});

test("installability: 声明了 dsh.bundle.patch 才算能装", () => {
  const ok = { name: "p", version: "1.0.0", dsh: { bundle: { patch: "./cordis.patch.yml" } } };
  assert.deepEqual(installability(ok), { installable: true, reason: null });
});

test("installability: 没有 dsh.bundle 的包装了也不会激活，所以不算能装", () => {
  const manifest = { name: "p", version: "1.0.0" };
  assert.equal(installability(manifest).installable, false);
  assert.equal(installability(manifest).reason, "no-bundle");
  // 有 dsh 字段但没有 bundle.patch 也一样
  assert.equal(installability({ name: "p", version: "1.0.0", dsh: { client: {} } }).reason, "no-bundle");
  assert.equal(installability({ name: "p", version: "1.0.0", dsh: { bundle: {} } }).reason, "no-bundle");
});

test("installability: 宿主自己的产品包永远不可安装", () => {
  const manifest = { name: "@deepseek-ai/dsh-web-app", version: "1.0.0", dsh: { bundle: { patch: "./p.yml" } } };
  assert.equal(installability(manifest, ["@deepseek-ai/dsh-web-app"]).reason, "protected");
});

test("installability: manifest 读不到 / 没版本号", () => {
  assert.equal(installability(null).reason, "no-manifest");
  assert.equal(installability({ dsh: { bundle: { patch: "x" } } }).reason, "no-manifest");
  assert.equal(installability({ name: "p", dsh: { bundle: { patch: "x" } } }).reason, "no-version");
});

test("normalizeManifest: 详情字段 + 仓库两种写法都认", () => {
  const detail = normalizeManifest({
    name: "dsh-foo", version: "2.0.0", description: "d", license: "MIT",
    homepage: "https://example.com", keywords: ["dsh-plugin"],
    repository: { url: "git+https://github.com/o/r.git" },
    dependencies: { a: "1", b: "2" },
    dsh: { bundle: { patch: "./cordis.patch.yml" } }
  });
  assert.equal(detail.installable, true);
  assert.equal(detail.github, "o/r");
  assert.equal(detail.dependencies, 2);
  assert.equal(detail.deprecated, null);
  // repository 写成裸字符串的老式包
  assert.equal(normalizeManifest({ name: "p", version: "1.0.0", repository: "https://github.com/o/r" }).github, "o/r");
});

test("normalizeManifest: deprecated 要能被看见（作者说了别用了）", () => {
  const detail = normalizeManifest({ name: "p", version: "1.0.0", deprecated: "use q instead", dsh: { bundle: { patch: "x" } } });
  assert.equal(detail.deprecated, "use q instead");
  // 弃用不拦安装，只是要显示出来
  assert.equal(detail.installable, true);
});

test("normalizeInstalled: 直接依赖 + 是否已激活 + 能否卸载", () => {
  const profile = {
    dependencies: { "dsh-foo": "^1.0.0", "plain-dep": "^2.0.0", "@deepseek-ai/dsh-web-app": "1.0.0" },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-foo"] } }
  };
  const installed = {
    "dsh-foo": { version: "1.3.0", description: "foo" },
    "plain-dep": { version: "2.1.0" }
  };
  const { items } = normalizeInstalled(profile, (n) => installed[n] ?? null, ["@deepseek-ai/dsh-web-app"]);
  const byName = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.equal(byName["dsh-foo"].activated, true);
  assert.equal(byName["dsh-foo"].installedVersion, "1.3.0");
  assert.equal(byName["dsh-foo"].spec, "^1.0.0");
  assert.equal(byName["dsh-foo"].removable, true);
  // 装了但没有 dsh.bundle 的包：不在 bundles 里，UI 要能看出「装了但没激活」
  assert.equal(byName["plain-dep"].activated, false);
  // 宿主产品包不给卸
  assert.equal(byName["@deepseek-ai/dsh-web-app"].removable, false);
  // 读不到 manifest 的包不能消失，只是版本为 null
  assert.equal(byName["@deepseek-ai/dsh-web-app"].installedVersion, null);
});

test("normalizeInstalled: profile 没有依赖 / 形状不对时返回空列表", () => {
  assert.deepEqual(normalizeInstalled({}, () => null).items, []);
  assert.deepEqual(normalizeInstalled(null, () => null).items, []);
  assert.deepEqual(normalizeInstalled({ dependencies: "nope" }, () => null).items, []);
});

test("isValidPackageName: 放行合法名字", () => {
  for (const name of ["dsh-git", "dsh-market", "@easytz/dsh-git", "a", "lodash.merge", "x_y~z"]) {
    assert.equal(isValidPackageName(name), true, `应放行：${name}`);
  }
});

test("isValidPackageName: 挡住会变成命令行参数的危险输入", () => {
  const bad = [
    "", " ", "Dsh-Git", ".hidden", "_private",
    "pkg@1.2.3",            // 版本必须走单独字段，混在名字里就没法校验
    "--registry=http://x",  // 伪装成 pnpm 参数
    "-g", "--force", "-D",  // 整串都是合法包名字符，但会被 pnpm 当参数吃掉
    "@scope/-g",
    "pkg; rm -rf /",
    "pkg && whoami",
    "pkg\nadd evil",
    "../../etc/passwd",
    "@/x", "@scope/", "@scope",
    "a".repeat(215),
    "包名", "pkg name", "pkg|x", "pkg$x", "pkg`x`"
  ];
  for (const name of bad) {
    assert.equal(isValidPackageName(name), false, `应挡住：${JSON.stringify(name)}`);
  }
  for (const name of [null, undefined, 42, {}, []]) {
    assert.equal(isValidPackageName(name), false);
  }
});

test("packageUrlPath: scope 前缀的 @ 不编码——npmmirror.com 只认原样的 @，编码成 %40 会 404", () => {
  // 真实故障：@nanmicoder/dsh-agent-teams 能在国内镜像的搜索结果里刷出来（搜索走
  // 查询参数，不涉及这段路径拼接），点进详情却说「npm 上没有这个包」——查出来是
  // npmmirror.com 的服务端不认 `%40nanmicoder`，只认 `@nanmicoder`，而官方 npm
  // 两种写法都认。此前统一用 encodeURIComponent 会把 @ 编码成 %40，同一份代码在
  // 官方源上没事、切到镜像就出这个 bug。
  assert.equal(packageUrlPath("@nanmicoder/dsh-agent-teams"), "@nanmicoder/dsh-agent-teams");
  assert.equal(packageUrlPath("@easytz/dsh-git"), "@easytz/dsh-git");
  // 没有 scope 的普通包名不受影响。
  assert.equal(packageUrlPath("dsh-git"), "dsh-git");
});

test("isExactVersion: 只放行确定版本，范围一律拒绝", () => {
  for (const v of ["1.0.0", "0.1.0", "1.2.3-rc.1", "1.2.3+build.5", "10.20.30"]) {
    assert.equal(isExactVersion(v), true, `应放行：${v}`);
  }
  for (const v of ["^1.0.0", "~1.0.0", "1.x", "1.0", "latest", ">=1.0.0", "", null, undefined, "1.0.0 || 2.0.0"]) {
    assert.equal(isExactVersion(v), false, `应拒绝：${JSON.stringify(v)}`);
  }
});

test("tailLines: 取尾部、丢空行、封顶长度", () => {
  const text = Array.from({ length: 50 }, (_, i) => `line ${i}`).join("\n");
  const tail = tailLines(text, 5);
  assert.deepEqual(tail.split("\n"), ["line 45", "line 46", "line 47", "line 48", "line 49"]);
  // 空行不占配额——pnpm 的输出里空行很多，占满了就看不到真正的错误
  assert.equal(tailLines("a\n\n\n\nb", 2), "a\nb");
  // 单行超长也要封顶
  assert.equal(tailLines("x".repeat(9000), 20, 100).length, 100);
  assert.equal(tailLines(null), "");
  assert.equal(tailLines(undefined), "");
});

test("normalizeDownloads: 批量与单查两种形状都要认", () => {
  // 批量：{ 包名: { downloads, … } }
  assert.deepEqual(normalizeDownloads({ a: { downloads: 10 }, b: { downloads: 20 } }), { a: 10, b: 20 });
  // 单查（scoped 包只能这么查）：{ downloads, package }
  assert.deepEqual(normalizeDownloads({ downloads: 30, package: "@s/p" }), { "@s/p": 30 });
  // 查不到的包 npm 会回 null，不能变成 0
  assert.deepEqual(normalizeDownloads({ a: null, b: { downloads: 5 } }), { b: 5 });
  assert.deepEqual(normalizeDownloads({ error: "not found" }), {});
  assert.deepEqual(normalizeDownloads(null), {});
});

test("applyDownloads: 按下载量排序，没数据的沉底而不是当 0", () => {
  const items = [
    { name: "few", date: "2026-01-01T00:00:00.000Z" },
    { name: "many", date: "2026-08-01T00:00:00.000Z" },
    { name: "unknown", date: "2026-05-01T00:00:00.000Z" }
  ];
  const sorted = applyDownloads(items, { few: 10, many: 9999 }, "downloads");
  assert.deepEqual(sorted.map((i) => i.name), ["many", "few", "unknown"]);
  // 没数据的是 null，不是 0——UI 据此决定不显示这个数字
  assert.equal(sorted[2].downloads, null);
});

test("applyDownloads: 按更新时间排序，日期缺失/不合法的沉底", () => {
  const items = [
    { name: "old", date: "2026-01-01T00:00:00.000Z" },
    { name: "new", date: "2026-08-01T00:00:00.000Z" },
    { name: "nodate", date: null },
    { name: "bad", date: "不是日期" }
  ];
  const sorted = applyDownloads(items, {}, "updated");
  assert.deepEqual(sorted.slice(0, 2).map((i) => i.name), ["new", "old"]);
  assert.deepEqual(sorted.slice(2).map((i) => i.name).sort(), ["bad", "nodate"]);
});

test("applyDownloads: relevance 保持 npm 给的顺序不动", () => {
  const items = [{ name: "b" }, { name: "a" }, { name: "c" }];
  assert.deepEqual(applyDownloads(items, { a: 999 }, "relevance").map((i) => i.name), ["b", "a", "c"]);
});

test("formatDownloads: 中文按万/亿，英文按 k/M", () => {
  assert.equal(formatDownloads(999, "zh"), "999");
  assert.equal(formatDownloads(12345, "zh"), "1.2万");
  assert.equal(formatDownloads(123456789, "zh"), "1.2亿");
  assert.equal(formatDownloads(12345, "en"), "12.3k");
  assert.equal(formatDownloads(1234567, "en"), "1.2M");
  assert.equal(formatDownloads(null), null);
  assert.equal(formatDownloads(undefined), null);
});

test("isBadgeUrl: 徽章要被挡掉，截图不能误伤", () => {
  for (const url of [
    "https://img.shields.io/npm/v/dshmarket",
    "https://badge.fury.io/js/x.svg",
    "https://github.com/o/r/workflows/CI/badge.svg",
    "https://raw.githubusercontent.com/o/r/HEAD/badge.svg"
  ]) assert.equal(isBadgeUrl(url), true, `应挡住：${url}`);
  for (const url of [
    "https://raw.githubusercontent.com/o/r/HEAD/assets/demo.png",
    "https://raw.githubusercontent.com/o/r/HEAD/assets/logo.svg",
    "https://user-images.githubusercontent.com/1/2-3.png"
  ]) assert.equal(isBadgeUrl(url), false, `不该挡：${url}`);
});

test("resolveImageUrl: 相对路径按仓库还原，非 https 一律丢弃", () => {
  assert.equal(resolveImageUrl("assets/a.png", "o/r"), "https://raw.githubusercontent.com/o/r/HEAD/assets/a.png");
  assert.equal(resolveImageUrl("./assets/a.png", "o/r"), "https://raw.githubusercontent.com/o/r/HEAD/assets/a.png");
  assert.equal(resolveImageUrl("/assets/a.png", "o/r"), "https://raw.githubusercontent.com/o/r/HEAD/assets/a.png");
  assert.equal(resolveImageUrl("https://x.com/a.png", "o/r"), "https://x.com/a.png");
  // 明文 http 会把「用户在看哪个插件」泄露给中间人，且混合内容会被浏览器拦
  assert.equal(resolveImageUrl("http://x.com/a.png", "o/r"), null);
  assert.equal(resolveImageUrl("//x.com/a.png", "o/r"), null);
  assert.equal(resolveImageUrl("data:image/png;base64,AAAA", "o/r"), null);
  // 没有仓库信息时相对路径无从还原
  assert.equal(resolveImageUrl("assets/a.png", null), null);
});

test("extractImages: markdown 与 HTML 两种写法都要认（HTML 那条曾经因为转义写坏而全部漏掉）", () => {
  const readme = [
    '<p align="center">',
    '  <img src="assets/logo.svg" width="96" alt="logo">',
    '</p>',
    '# Title',
    '[![badge](https://img.shields.io/npm/v/x)](https://npmjs.com/x)',
    '![screenshot](assets/demo.png)',
    '![dup](assets/demo.png)',
    '![doc](docs/guide.md)'
  ].join('\n');
  const images = extractImages(readme, "o/r");
  assert.deepEqual(images.map((i) => i.url), [
    "https://raw.githubusercontent.com/o/r/HEAD/assets/demo.png",
    "https://raw.githubusercontent.com/o/r/HEAD/assets/logo.svg"
  ]);
  assert.equal(images[0].alt, "screenshot");
  assert.equal(images[1].alt, "logo");
});

test("extractImages: 数量封顶、空输入不抛", () => {
  const many = Array.from({ length: 20 }, (_, i) => `![a](p${i}.png)`).join('\n');
  assert.equal(extractImages(many, "o/r", 3).length, 3);
  assert.deepEqual(extractImages("", "o/r"), []);
  assert.deepEqual(extractImages(null, null), []);
});

test("imageCandidates: 相对路径给出多个来源，jsDelivr 在前", () => {
  const got = imageCandidates("assets/demo.png", { slug: "o/r", name: "p", version: "1.2.3" });
  assert.deepEqual(got, [
    "https://cdn.jsdelivr.net/npm/p@1.2.3/assets/demo.png",
    "https://raw.githubusercontent.com/o/r/HEAD/assets/demo.png"
  ]);
  // 少了包名/版本就只剩 GitHub 那条；少了仓库就只剩 jsDelivr
  assert.deepEqual(imageCandidates("a.png", { slug: "o/r" }), ["https://raw.githubusercontent.com/o/r/HEAD/a.png"]);
  assert.deepEqual(imageCandidates("a.png", { name: "p", version: "1.0.0" }), ["https://cdn.jsdelivr.net/npm/p@1.0.0/a.png"]);
  assert.deepEqual(imageCandidates("a.png", {}), []);
  // 绝对 https 原样返回，不做候选扩展
  assert.deepEqual(imageCandidates("https://x.com/a.png", { slug: "o/r" }), ["https://x.com/a.png"]);
  // 明文与 data: 一律不要
  assert.deepEqual(imageCandidates("http://x.com/a.png", { slug: "o/r" }), []);
  assert.deepEqual(imageCandidates("data:image/png;base64,AA", { slug: "o/r" }), []);
  assert.deepEqual(imageCandidates("", { slug: "o/r" }), []);
});

test("imageCandidates: query/fragment 不进路径（jsDelivr 会把它当文件名的一部分）", () => {
  assert.deepEqual(imageCandidates("assets/a.png?raw=true", { name: "p", version: "1.0.0" }),
    ["https://cdn.jsdelivr.net/npm/p@1.0.0/assets/a.png"]);
});

test("extractImages: 保留原始写法，供取图时重算候选", () => {
  const images = extractImages('![s](assets/demo.png)', "o/r");
  assert.equal(images[0].raw, "assets/demo.png");
  assert.equal(images[0].url, "https://raw.githubusercontent.com/o/r/HEAD/assets/demo.png");
});

test("imageCandidates: 配了镜像时，镜像候选排在最后且只镜像 GitHub 那几个来源", () => {
  const got = imageCandidates("assets/a.png", {
    slug: "o/r", name: "p", version: "1.0.0", mirror: "https://gh-proxy.com/"
  });
  assert.deepEqual(got, [
    "https://cdn.jsdelivr.net/npm/p@1.0.0/assets/a.png",
    "https://raw.githubusercontent.com/o/r/HEAD/assets/a.png",
    // 镜像只兜 GitHub 那条（jsDelivr 本来就通，套一层没有意义）
    "https://gh-proxy.com/https://raw.githubusercontent.com/o/r/HEAD/assets/a.png"
  ]);
  // 结尾多余的斜杠不该拼出 `//`
  const trimmed = imageCandidates("a.png", { slug: "o/r", mirror: "https://gh-proxy.com///" });
  assert.equal(trimmed[1], "https://gh-proxy.com/https://raw.githubusercontent.com/o/r/HEAD/a.png");
  // 没配镜像时行为完全不变
  assert.equal(imageCandidates("a.png", { slug: "o/r" }).length, 1);
});

test("compareVersions: 正常比较 major/minor/patch", () => {
  assert.equal(compareVersions("1.2.3", "1.2.2"), 1);
  assert.equal(compareVersions("1.2.3", "1.2.3"), 0);
  assert.equal(compareVersions("1.2.3", "1.2.4"), -1);
  assert.equal(compareVersions("2.0.0", "1.9.9"), 1);
});

test("compareVersions: 带预发布标签的版本比同号正式版旧", () => {
  assert.equal(compareVersions("1.0.0", "1.0.0-rc.1"), 1);
  assert.equal(compareVersions("1.0.0-rc.1", "1.0.0"), -1);
  assert.equal(compareVersions("1.0.0-rc.2", "1.0.0-rc.1"), 1);
});

test("compareVersions: 解析不了就是 null，不瞎猜方向", () => {
  assert.equal(compareVersions("not-a-version", "1.0.0"), null);
  assert.equal(compareVersions("1.0.0", ""), null);
  assert.equal(compareVersions(null, "1.0.0"), null);
});

test("isUpdateAvailable: 已装版本旧才算有更新，一样新/更新/解析失败都不算", () => {
  assert.equal(isUpdateAvailable("0.1.0", "0.2.0"), true);
  assert.equal(isUpdateAvailable("0.2.0", "0.2.0"), false);
  assert.equal(isUpdateAvailable("0.3.0", "0.2.0"), false);
  assert.equal(isUpdateAvailable("weird", "0.2.0"), false);
  assert.equal(isUpdateAvailable(null, null), false);
});

test("mergeDownloads: 只并数字不排序，也不会把已有的数字擦成 null", () => {
  // 全局排好之后这一页只是要把数字填上——再排一次就是拿这一页重新洗牌。
  const items = [
    { name: "b", downloads: 5 },
    { name: "a", downloads: 100 },
    { name: "c", downloads: 1 }
  ];
  const merged = mergeDownloads(items, { a: 100, c: 1 });
  assert.deepEqual(merged.map((item) => item.name), ["b", "a", "c"], "顺序原样保留");
  // b 这次没查到（限流、缓存被挤掉）——保留它已有的数字，不能变成「卡片上的下载量
  // 凭空消失」。
  assert.equal(merged[0].downloads, 5);
  assert.equal(merged[1].downloads, 100);
});

test("mergeDownloads: 本来就没数字、这次也没查到，才是 null", () => {
  const merged = mergeDownloads([{ name: "x" }], {});
  assert.equal(merged[0].downloads, null);
});
