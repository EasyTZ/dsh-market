// 「不许卸载」/「不许停用」两份名单的不变量——它们**不是同一份 Set**，这是这份
// 测试要守住的核心事实。
//
// 市场自己曾经两条都锁：踩过一次——市场把自己列成可卸载，点一下就把自己从
// profile 里删了，而唯一能装回它的 UI 正是刚被删掉的那个，用户只剩「去终端敲
// dsh plugin add」这一条路。
//
// 后来发现「卸载」其实有救：在 dsDesktop 这类宿主里，市场通常是 required:true
// 的随包插件，宿主自己的启动对账逻辑会在实际版本跟随包版本对不上时强制装回去，
// 不管是没装过还是被卸载过——卸载市场的后果只是「下次重启前自动装回来」，
// 不是真的「再也装不回来」。所以卸载保护整个撤掉了，不分环境。
//
// 但「停用」走的是完全不同的一条路（写 disabled 标记到 overlay patch），跟那套
// 按版本号对账的自愈逻辑毫无关系——市场一旦被停用，下次启动依旧不会加载，
// 没有任何自动恢复机制。这条锁必须留着，且只在 dsDesktop 里才有意义（停用功能
// 本身就是 dsDesktop 专属）。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { __test__ } from "../lib/index.js";

const { HOST_PROTECTED_PACKAGES, protectedPackages, disableProtectedPackages } = __test__;
const ownName = JSON.parse(
  readFileSync(join(dirname(dirname(fileURLToPath(import.meta.url))), "package.json"), "utf8")
).name;

// disableProtectedPackages() 现算现读 DSH_DESKTOP_PLUGIN_STATE，测试之间必须
// 把它清干净，不然一个测试设置的值会漏到下一个测试里。
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

test("卸载保护：本插件自己在任何环境下都不受保护——卸载有对账自愈，不需要挡", () => {
  assert.equal(protectedPackages().has(ownName), false, `${ownName} 不该在卸载保护名单里`);
  withPluginStateEnv("C:\\fake\\plugin-state.json", () => {
    assert.equal(protectedPackages().has(ownName), false, `${ownName} 在 dsDesktop 里也不该受卸载保护`);
  });
});

test("停用保护：在 dsDesktop 里（DSH_DESKTOP_PLUGIN_STATE 有值），本插件自己必须受保护——停用没有自愈", () => {
  withPluginStateEnv("C:\\fake\\plugin-state.json", () => {
    assert.ok(disableProtectedPackages().has(ownName), `${ownName} 不在停用保护名单里 —— dsDesktop 里市场能把自己停用掉`);
  });
});

test("停用保护：脱离 dsDesktop（没有 DSH_DESKTOP_PLUGIN_STATE），停用功能本身不可用，保护与否不影响结果", () => {
  withPluginStateEnv(null, () => {
    assert.equal(disableProtectedPackages().has(ownName), false, `${ownName} 不该在停用保护名单里`);
  });
});

test("宿主的产品包不分环境、不分卸载/停用，任何时候都在两份名单里（卸掉内核就起不来了）", () => {
  for (const name of ["@deepseek-ai/dsh", "@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]) {
    assert.ok(HOST_PROTECTED_PACKAGES.has(name), `${name} 不在保护名单里`);
    assert.ok(protectedPackages().has(name), `${name} 应该受卸载保护`);
    withPluginStateEnv(null, () => assert.ok(disableProtectedPackages().has(name), `脱离 dsDesktop 后 ${name} 也不该失去停用保护`));
    withPluginStateEnv("C:\\fake\\plugin-state.json", () => assert.ok(disableProtectedPackages().has(name), `dsDesktop 里 ${name} 应该受停用保护`));
  }
});

test("名单是按包名精确匹配，不做前缀/模糊匹配", () => {
  // 模糊匹配会误伤用户自己装的第三方插件（比如一个叫 dsh-market-extras 的包），
  // 让他明明装了却卸不掉，还查不出为什么。
  assert.equal(protectedPackages().has(`${ownName}-extras`), false);
  assert.equal(protectedPackages().has("@deepseek-ai/dsh-something-else"), false);
  withPluginStateEnv("C:\\fake\\plugin-state.json", () => {
    assert.equal(disableProtectedPackages().has(`${ownName}-extras`), false);
    assert.equal(disableProtectedPackages().has("@deepseek-ai/dsh-something-else"), false);
  });
});
