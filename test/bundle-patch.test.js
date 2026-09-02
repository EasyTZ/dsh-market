// 「声明了 overlay patch，却没把文件发出来」这条检查。
//
// 这份测试对应一次真实事故：用户从市场装了 `@morlay/session-branch@0.0.11`，它的
// manifest 里写着 `dsh.bundle.patch: "./cordis.patch.yml"`，但 `files` 字段只有
// `["lib"]` —— 那个 yml 根本不在发布的 tarball 里。`dsh plugin add` 信 manifest 的
// 声明，照样把包名写进 `dsh.profile.bundles`，然后**下一次启动直接死在 boot**：
//
//   Error: dsh: failed to read overlay …/cordis.patch.yml: ENOENT
//
// 而且安全模式救不回来：overlay 清单比「停用插件」更早一步读，读不到就抛。桌面应用
// 到这一步等于砖了，用户只能手工去改 profile 的 package.json。
//
// 所以这条检查是市场的底线：它有能力让宿主起不来，就必须有对应的把关。
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { __test__ } from "../lib/index.js";
import { declaredBundlePatch, installability } from "../lib/pure.js";

const { missingBundlePatch } = __test__;

/**
 * 造一个 profile 目录，往里装一个包。
 * @param {object} manifest 包的 package.json
 * @param {Record<string,string>} [extraFiles] 相对包目录的额外文件
 */
function profileWith(name, manifest, extraFiles = {}) {
  const root = mkdtempSync(join(tmpdir(), "dsh-market-patch-"));
  const pkgDir = join(root, "node_modules", ...name.split("/"));
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ name, ...manifest }), "utf8");
  for (const [rel, content] of Object.entries(extraFiles)) {
    writeFileSync(join(pkgDir, rel), content, "utf8");
  }
  return root;
}

test("declaredBundlePatch: 只认非空字符串，其余一律当没声明", () => {
  assert.equal(declaredBundlePatch({ dsh: { bundle: { patch: "./cordis.patch.yml" } } }), "./cordis.patch.yml");
  assert.equal(declaredBundlePatch({}), null);
  assert.equal(declaredBundlePatch(null), null);
  assert.equal(declaredBundlePatch({ dsh: {} }), null);
  assert.equal(declaredBundlePatch({ dsh: { bundle: {} } }), null);
  assert.equal(declaredBundlePatch({ dsh: { bundle: { patch: "" } } }), null);
  assert.equal(declaredBundlePatch({ dsh: { bundle: { patch: true } } }), null);
});

test("patch 文件真的在：放行", () => {
  const name = "@someone/good-plugin";
  const root = profileWith(name, { dsh: { bundle: { patch: "./cordis.patch.yml" } } }, {
    "cordis.patch.yml": "plugins: {}\n"
  });
  try {
    assert.equal(missingBundlePatch(root, name), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("声明了 patch 但文件没发出来：返回它声明的那个路径（调用方据此撤销安装）", () => {
  // 这就是 @morlay/session-branch@0.0.11 的形状：声明在、文件不在。
  const name = "@morlay/session-branch";
  const root = profileWith(name, { dsh: { bundle: { patch: "./cordis.patch.yml" } } });
  try {
    assert.equal(missingBundlePatch(root, name), "./cordis.patch.yml");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("压根没声明 patch：不归这条检查管", () => {
  // 这种包在 installability 那一关就该被拦下（reason: no-bundle）。走到装完这一步
  // 说明 npm 上的 manifest 跟磁盘上的对不上，那是另一码事——这里不顺手拦，免得把
  // 一条专职检查变成什么都管的杂物间。
  const name = "plain-package";
  const root = profileWith(name, {});
  try {
    assert.equal(missingBundlePatch(root, name), null);
    assert.deepEqual(installability({ name, version: "1.0.0" }), { installable: false, reason: "no-bundle" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("装完读不到 manifest：也不归这条检查管（安装本身出了别的问题，dsh plugin add 会自己报）", () => {
  const root = mkdtempSync(join(tmpdir(), "dsh-market-patch-"));
  try {
    assert.equal(missingBundlePatch(root, "@nobody/never-installed"), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
