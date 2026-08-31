// 「不许卸载」名单的不变量。
//
// 这份测试是踩出来之后补的：市场原本把**自己**也列成了可卸载，点一下卸载按钮就把
// 自己从 profile 里删掉了——而唯一能把它装回来的 UI 正是刚被删掉的那个。用户只剩
// 「去终端敲 dsh plugin add」这一条路，对一个面向不装命令行的人做的功能来说等于砖头。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { __test__ } from "../lib/index.js";

const { PROTECTED_PACKAGES } = __test__;
const ownName = JSON.parse(
  readFileSync(join(dirname(dirname(fileURLToPath(import.meta.url))), "package.json"), "utf8")
).name;

test("本插件自己必须在不可卸载名单里（自我反锁保护）", () => {
  assert.ok(PROTECTED_PACKAGES.has(ownName), `${ownName} 不在保护名单里 —— 市场能把自己卸掉`);
});

test("宿主的产品包也在名单里（卸掉内核就起不来了）", () => {
  for (const name of ["@deepseek-ai/dsh", "@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]) {
    assert.ok(PROTECTED_PACKAGES.has(name), `${name} 不在保护名单里`);
  }
});

test("名单是按包名精确匹配，不做前缀/模糊匹配", () => {
  // 模糊匹配会误伤用户自己装的第三方插件（比如一个叫 dsh-market-extras 的包），
  // 让他明明装了却卸不掉，还查不出为什么。
  assert.equal(PROTECTED_PACKAGES.has(`${ownName}-extras`), false);
  assert.equal(PROTECTED_PACKAGES.has("@deepseek-ai/dsh-something-else"), false);
});
