// dshBinPath() 的跨平台不变量。
//
// 这份测试是为一个真实故障写的：WSL 里装了市场之后，安装和卸载两个按钮全是灰的，
// 而同一份代码在 Windows 上完全正常。根因是 Node **不解析 argv[1] 的符号链接**
// （只做 path.resolve），而 npm 的全局入口在两个平台上形态不同——Windows 是写死了
// bin.js 完整路径的转发脚本，Linux/macOS 是一个指向 bin.js 的符号链接。旧实现拿
// argv[1] 直接匹配 `bin.js`，在 Linux 上恒不成立，`canInstall` 就一直是 false。
//
// 所以这里守的是「Linux 形态也要认出来」，而不只是「能返回一个路径」。
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { __test__ } from "../lib/index.js";

const { dshBinPath } = __test__;

/** 造一棵 `<tmp>/lib/bin.js`，返回 { root, binJs }。 */
function fakeDshInstall() {
  const root = mkdtempSync(join(tmpdir(), "dsh-market-bin-"));
  mkdirSync(join(root, "lib"), { recursive: true });
  const binJs = join(root, "lib", "bin.js");
  writeFileSync(binJs, "// fake dsh entry\n", "utf8");
  return { root, binJs };
}

/** argv[1] 与相关环境变量都是进程全局的，每个用例跑完必须还原。 */
function withArgv1(value, fn) {
  const savedArgv = process.argv[1];
  const savedOverride = process.env.DSH_MARKET_DSH_BIN;
  delete process.env.DSH_MARKET_DSH_BIN;
  process.argv[1] = value;
  try {
    return fn();
  } finally {
    process.argv[1] = savedArgv;
    if (savedOverride === undefined) delete process.env.DSH_MARKET_DSH_BIN;
    else process.env.DSH_MARKET_DSH_BIN = savedOverride;
  }
}

test("Windows 形态：argv[1] 直接就是 bin.js", () => {
  const { root, binJs } = fakeDshInstall();
  try {
    assert.equal(withArgv1(binJs, dshBinPath), binJs);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Linux/WSL 形态：argv[1] 是指向 bin.js 的符号链接，也要认出来", (t) => {
  const { root, binJs } = fakeDshInstall();
  // npm 在 Linux 上装的全局入口就长这样：`<prefix>/bin/dsh` → `…/lib/bin.js`，
  // 不带扩展名。
  const link = join(root, "dsh");
  try {
    try {
      symlinkSync(binJs, link, "file");
    } catch (error) {
      // Windows 上建文件符号链接要管理员或开发者模式。这个用例真正要覆盖的平台是
      // Linux/macOS，那里必然能建——建不了就跳过，而不是把 CI 弄红。
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        t.skip("本机不允许创建文件符号链接（需要开发者模式/管理员）");
        return;
      }
      throw error;
    }
    const hit = withArgv1(link, dshBinPath);
    assert.ok(hit, "符号链接形态的 argv[1] 不该被判成「定位不到 dsh」");
    // 返回的必须是解析后的真实路径：profileRootOf 要靠它往上两级找 dsh 包目录，
    // 拿链接路径算出来的是 `<prefix>` 这种不相干的位置。
    assert.match(hit, /bin\.js$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("argv[1] 不是 dsh 入口时返回 null（不瞎猜一个路径去执行）", () => {
  const { root } = fakeDshInstall();
  const stray = join(root, "lib", "something-else.js");
  writeFileSync(stray, "// not dsh\n", "utf8");
  try {
    assert.equal(withArgv1(stray, dshBinPath), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
