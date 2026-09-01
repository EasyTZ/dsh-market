// 「不许卸载」名单的不变量。
//
// 这份测试是踩出来之后补的：市场原本把**自己**也列成了可卸载，点一下卸载按钮就把
// 自己从 profile 里删掉了——而唯一能把它装回来的 UI 正是刚被删掉的那个。用户只剩
// 「去终端敲 dsh plugin add」这一条路，对一个面向不装命令行的人做的功能来说等于砖头。
//
// 后来这条锁改成了只在 dsDesktop 里生效（见 lib/index.js 里 protectedPackages() 的
// 注释）：脱离 dsDesktop、自己拿 `dsh plugin add` 装的用户本来就有终端能力，卸了也
// 能自己装回来，不该被这道家长式保护挡在 UI 外面。这份测试要同时守住两个方向——
// 别退化回「哪个环境都锁」，也别退化回「哪个环境都不锁」。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { __test__ } from "../lib/index.js";

const { HOST_PROTECTED_PACKAGES, protectedPackages } = __test__;
const ownName = JSON.parse(
  readFileSync(join(dirname(dirname(fileURLToPath(import.meta.url))), "package.json"), "utf8")
).name;

// protectedPackages() 现算现读 DSH_DESKTOP_PLUGIN_STATE，测试之间必须把它清干净，
// 不然一个测试设置的值会漏到下一个测试里。
function withPluginStateEnv(value, fn) {
  const prev = process.env.DSH_DESKTOP_PLUGIN_STATE;
  if (value === null) delete process.env.DSH_DESKTOP_PLUGIN_STATE;
  else process.env.DSH_DESKTOP_PLUGIN_STATE = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.DSH_DESKTOP_PLUGIN_STATE;
    else process.env.DSH_DESKTOP_PLUGIN_STATE = prev;
  }
}

test("在 dsDesktop 里（DSH_DESKTOP_PLUGIN_STATE 有值），本插件自己必须在保护名单里（自我反锁保护）", () => {
  withPluginStateEnv("C:\\fake\\plugin-state.json", () => {
    assert.ok(protectedPackages().has(ownName), `${ownName} 不在保护名单里 —— dsDesktop 里市场能把自己卸掉`);
  });
});

test("脱离 dsDesktop（没有 DSH_DESKTOP_PLUGIN_STATE），本插件自己不该被锁——用户自己有终端能力", () => {
  withPluginStateEnv(null, () => {
    assert.equal(protectedPackages().has(ownName), false, `${ownName} 不该在保护名单里 —— 裸 dsh 用户应该能经 UI 卸载/停用它`);
  });
});

test("宿主的产品包不分环境，任何时候都在名单里（卸掉内核就起不来了）", () => {
  for (const name of ["@deepseek-ai/dsh", "@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]) {
    assert.ok(HOST_PROTECTED_PACKAGES.has(name), `${name} 不在保护名单里`);
    withPluginStateEnv(null, () => assert.ok(protectedPackages().has(name), `脱离 dsDesktop 后 ${name} 也不该失去保护`));
    withPluginStateEnv("C:\\fake\\plugin-state.json", () => assert.ok(protectedPackages().has(name), `dsDesktop 里 ${name} 应该受保护`));
  }
});

test("名单是按包名精确匹配，不做前缀/模糊匹配", () => {
  withPluginStateEnv("C:\\fake\\plugin-state.json", () => {
    // 模糊匹配会误伤用户自己装的第三方插件（比如一个叫 dsh-market-extras 的包），
    // 让他明明装了却卸不掉，还查不出为什么。
    assert.equal(protectedPackages().has(`${ownName}-extras`), false);
    assert.equal(protectedPackages().has("@deepseek-ai/dsh-something-else"), false);
  });
});
