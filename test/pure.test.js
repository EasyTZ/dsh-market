// pure.js 的单测。这里的每个函数都在「外部世界给的数据 → 我们据此做决定」这条链上，
// 判断错的后果是安静地给出错误结论：把不能装的标成能装、把已装的漏掉、或者把一个
// 带引号的字符串当成包名送进命令行。
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSearchText, githubSlug, installability, isExactVersion, isValidPackageName,
  applyDownloads, extractImages, formatDownloads, imageCandidates, isBadgeUrl,
  normalizeDownloads, resolveImageUrl,
  normalizeInstalled, normalizeManifest, normalizeSearchHits, tailLines
} from "../lib/pure.js";

test("buildSearchText: 空查询按关键词浏览，有查询词时也带关键词限定", () => {
  assert.equal(buildSearchText(""), "keywords:dsh-plugin");
  assert.equal(buildSearchText("  "), "keywords:dsh-plugin");
  assert.equal(buildSearchText("git"), "git keywords:dsh-plugin");
  // all 模式（用户勾了「搜索全部 npm」）不加限定
  assert.equal(buildSearchText("git", false), "git");
  assert.equal(buildSearchText("", false), "keywords:dsh-plugin");
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
