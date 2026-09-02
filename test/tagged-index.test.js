// 全量 tagged 索引的缓存行为。
//
// 这份测试守的是一个用真实 429 换来的教训。原来的索引只存内存、TTL 10 分钟，而
// `keywords:dsh-plugin` 在官方源上实测有 3610 个包、按 250 一页要 **15 次**
// `/-/v1/search` 才抓得完——那个接口限流很严。于是每过 10 分钟、以及每次内核重启
// 之后，用户一打字就是 15 连发，界面上就冒出「无法访问 npm registry：HTTP 429」。
//
// 为什么不干脆把查询词交给 npm、一次请求了事：`keywords:` 是精确过滤，但**再拼上
// 查询词，那个词只当排序权重、不参与过滤**（实测 `keywords:dsh-plugin git` 的 total
// 和不带 git 时一模一样，都是 3611）。那样「找到 xxx 个」会永远显示 3611。所以本地
// 过滤这条路必须留着，能省的只有爬取频次。
//
// 于是三条不变式：内存里有就别联网、内存没有磁盘有也别联网、过期了也**先把旧的
// 返回出去**（后台刷新，用户不等、也不会因为后台那次失败而看到报错）。
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { __test__ } from "../lib/index.js";
import { NPM_REGISTRY } from "../lib/pure.js";

const { getTaggedIndex, refreshTaggedIndex, taggedIndexCache, TAGGED_INDEX_FRESH_MS } = __test__;

/** 造一个只有 baseUrl 的假 ctx —— profileDir 只认这一个字段。 */
function fakeCtx() {
  const dir = mkdtempSync(join(tmpdir(), "dsh-market-index-"));
  return { ctx: { baseUrl: pathToFileURL(dir + "/").href }, dir };
}

/**
 * 把全局 fetch 换成计数桩，返回一页固定的搜索结果。
 * total 给成 2 让爬取只有一页——这里测的是「联网了几次」，不是分页本身。
 */
function stubFetch() {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        total: 2,
        objects: [
          { package: { name: "dsh-alpha", version: "1.0.0", description: "a", keywords: ["dsh-plugin"] } },
          { package: { name: "dsh-beta", version: "2.0.0", description: "b", keywords: ["dsh-plugin"] } }
        ]
      })
    };
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

/** 每个用例都从干净的内存缓存开始——它是模块级的，会在用例之间串味。 */
function freshStart() {
  taggedIndexCache.clear();
}

test("内存里有就别联网", async () => {
  freshStart();
  const { ctx, dir } = fakeCtx();
  const { calls, restore } = stubFetch();
  try {
    const first = await getTaggedIndex(ctx, NPM_REGISTRY);
    assert.equal(first.length, 2);
    const n = calls.length;
    assert.ok(n > 0, "第一次总得联网抓一轮");

    await getTaggedIndex(ctx, NPM_REGISTRY);
    await getTaggedIndex(ctx, NPM_REGISTRY);
    assert.equal(calls.length, n, "后续搜索不该再打 /-/v1/search");
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("内核重启后从磁盘读，仍然不联网", async () => {
  freshStart();
  const { ctx, dir } = fakeCtx();
  const { calls, restore } = stubFetch();
  try {
    await getTaggedIndex(ctx, NPM_REGISTRY);
    const n = calls.length;

    // 清掉内存缓存 = 内核重启。落盘那份还在。
    freshStart();
    const again = await getTaggedIndex(ctx, NPM_REGISTRY);
    assert.equal(again.length, 2, "重启后照样拿得到索引");
    assert.equal(calls.length, n, "重启不该触发重爬——这正是原来每次重启都 429 的地方");
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("过期了也先把旧索引返回出去，刷新扔后台", async () => {
  freshStart();
  const { ctx, dir } = fakeCtx();
  const { calls, restore } = stubFetch();
  try {
    await getTaggedIndex(ctx, NPM_REGISTRY);
    const n = calls.length;

    // 把时间戳推到过期之前更早的地方。
    const entry = taggedIndexCache.get(NPM_REGISTRY);
    entry.at = Date.now() - TAGGED_INDEX_FRESH_MS - 1000;

    const stale = await getTaggedIndex(ctx, NPM_REGISTRY);
    assert.equal(stale.length, 2, "过期也要有东西返回，不能让用户干等一轮爬取");
    // 后台那轮刷新是异步发起的，给它一个 tick 跑完。
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(calls.length > n, "过期之后应该在后台刷新一次");
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("后台刷新失败不能把错误抛给这次搜索（旧索引照常服务）", async () => {
  freshStart();
  const { ctx, dir } = fakeCtx();
  const { restore } = stubFetch();
  try {
    await getTaggedIndex(ctx, NPM_REGISTRY);
    const entry = taggedIndexCache.get(NPM_REGISTRY);
    entry.at = Date.now() - TAGGED_INDEX_FRESH_MS - 1000;

    // 让后台那次刷新撞 429。
    globalThis.fetch = async () => ({
      ok: false, status: 429, headers: { get: () => null }, json: async () => ({})
    });
    const stale = await getTaggedIndex(ctx, NPM_REGISTRY);
    assert.equal(stale.length, 2, "后台刷新失败不影响这次搜索");
    // 等后台那次 reject 落地：没被吞掉的话会变成 unhandled rejection 把内核吵崩。
    await new Promise((r) => setTimeout(r, 20));
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("同一个源同时只跑一轮爬取", async () => {
  freshStart();
  const { ctx, dir } = fakeCtx();
  const { calls, restore } = stubFetch();
  try {
    // 三个并发的冷启动搜索：不去重的话就是三轮 15 页。
    const [a, b, c] = await Promise.all([
      getTaggedIndex(ctx, NPM_REGISTRY),
      getTaggedIndex(ctx, NPM_REGISTRY),
      getTaggedIndex(ctx, NPM_REGISTRY)
    ]);
    assert.equal(a.length, 2);
    assert.equal(b.length, 2);
    assert.equal(c.length, 2);
    assert.equal(calls.length, 1, "三个并发请求只该触发一轮爬取");
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("强制刷新（顶部刷新按钮）绕过缓存真的重抓", async () => {
  freshStart();
  const { ctx, dir } = fakeCtx();
  const { calls, restore } = stubFetch();
  try {
    await getTaggedIndex(ctx, NPM_REGISTRY);
    const n = calls.length;
    await refreshTaggedIndex(ctx, NPM_REGISTRY);
    assert.ok(calls.length > n, "缓存还新鲜的时候，刷新按钮也得能强制重抓");
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});
