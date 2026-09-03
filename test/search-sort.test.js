// 「按下载量排序」的顺序，跨页也要对。
//
// 真实故障：面板上按周下载量排，翻到第二页顺序就乱了 ——
//
//   from=0    50904 dshmarket        …  78 dsh-quant
//   from=24    2745 dsh-whale-widget …  14 dsh-plugin-ima-sync
//   from=48   13857 @morlay/session-rdb   ← 比第一页第二名还高
//
// 成因是**先切片再排序**：npm 的 `/-/v1/search` 不提供按下载量排，下载量要另一个
// 接口一个个查，所以旧代码按 npm 的相关度序切出这一页的 24 条、只查这 24 条的
// 下载量、再把这 24 条排一下 —— 每一页各排各的，页与页之间当然接不上。
//
// 修法是先排后切：整份候选列表排好再分页。代价是要先拿到全部候选包的下载量，
// 而那是几千次请求，所以只对索引里靠前的 SORT_POOL 个做（见 lib/index.js 的注释）。
// 下面这些用例守的就是这条链上每一个会悄悄退化的地方。
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { __test__ } from "../lib/index.js";
import { NPM_REGISTRY } from "../lib/pure.js";

const { handleSearch, taggedIndexCache, downloadsCache } = __test__;

function fakeCtx() {
  const dir = mkdtempSync(join(tmpdir(), "dsh-market-sort-"));
  return { ctx: { baseUrl: pathToFileURL(dir + "/").href }, dir };
}

/** 造 n 个 tagged 包；下载量刻意**逆着**索引顺序给，不排就一定错。 */
function fixture(n) {
  return Array.from({ length: n }, (unused, i) => ({
    name: `pkg-${String(i).padStart(4, "0")}`,
    version: "1.0.0",
    description: "",
    keywords: ["dsh-plugin"],
    license: "MIT",
    // 日期也逆着给：索引越靠后越新。
    date: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString(),
    publisher: null,
    repository: null,
    github: null,
    tagged: true
  }));
}

const downloadsOf = (name) => Number(name.slice("pkg-".length));

/**
 * 假 fetch：搜索接口回一整份索引，下载量接口按 downloadsOf 回。
 * 记下每条 URL，好断言「批量查有没有分段」。
 */
function stubFetch(items) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const text = String(url);
    calls.push(text);
    if (text.includes("/-/v1/search")) {
      const from = Number(new URL(text).searchParams.get("from") ?? 0);
      return {
        ok: true,
        json: async () => ({
          total: items.length,
          objects: items.slice(from, from + 250).map((pkg) => ({ package: pkg }))
        })
      };
    }
    if (text.includes("/downloads/point/")) {
      const names = decodeURIComponent(text.split("/downloads/point/")[1].split("/").slice(1).join("/")).split(",");
      const out = {};
      for (const name of names) out[name] = { downloads: downloadsOf(name), package: name };
      // 单包查询的响应形状跟批量不一样，两种都要认（见 normalizeDownloads）。
      return { ok: true, json: async () => (names.length === 1 ? { downloads: downloadsOf(names[0]), package: names[0] } : out) };
    }
    throw new Error("unexpected fetch: " + text);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function fakeRes() {
  const out = { status: null, body: null };
  return { out, writeHead(status) { out.status = status; }, end(text) { out.body = JSON.parse(text); } };
}

async function search(ctx, query) {
  const res = fakeRes();
  await handleSearch(ctx, { method: "GET", url: `/search?${query}` }, res);
  return res.out.body;
}

/** 后台填候选池是异步的，等到它填完（或超时）。 */
async function settle(ctx, query, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    const body = await search(ctx, query);
    // 池子填齐之前 handleSearch 会退回按页排；填齐了第一条就是下载量最大的那个。
    if (body.data.items[0]?.name === "pkg-0999") return body;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("候选池没能在预期时间内填好");
}

test("按下载量排序：第二页的最大值不能超过第一页的最小值", async () => {
  const { ctx, dir } = fakeCtx();
  const stub = stubFetch(fixture(1000));
  taggedIndexCache.clear();
  downloadsCache.clear();
  try {
    await settle(ctx, "q=&from=0&size=24&sort=downloads-week");
    const page1 = await search(ctx, "q=&from=0&size=24&sort=downloads-week");
    const page2 = await search(ctx, "q=&from=24&size=24&sort=downloads-week");
    const page3 = await search(ctx, "q=&from=48&size=24&sort=downloads-week");

    const nums = (body) => body.data.items.map((item) => item.downloads);
    for (const [label, body] of [["第一页", page1], ["第二页", page2], ["第三页", page3]]) {
      const list = nums(body);
      assert.deepEqual([...list].sort((a, b) => b - a), list, `${label}内部就该是降序`);
    }
    assert.ok(Math.min(...nums(page1)) >= Math.max(...nums(page2)),
      `第二页的最大值(${Math.max(...nums(page2))})不能超过第一页的最小值(${Math.min(...nums(page1))})`);
    assert.ok(Math.min(...nums(page2)) >= Math.max(...nums(page3)),
      "第三页同理——这正是当初翻到第三页冒出个 13857 的那个 bug");
    assert.equal(page1.data.items[0].name, "pkg-0999", "全局第一名要排在第一页第一个");
  } finally {
    stub.restore();
    taggedIndexCache.clear();
    downloadsCache.clear();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("按最近更新排序不用打任何下载量请求——日期本来就在索引里", async () => {
  const { ctx, dir } = fakeCtx();
  const stub = stubFetch(fixture(300));
  taggedIndexCache.clear();
  downloadsCache.clear();
  try {
    const page1 = await search(ctx, "q=&from=0&size=10&sort=updated");
    const page2 = await search(ctx, "q=&from=10&size=10&sort=updated");
    const dates = (body) => body.data.items.map((item) => Date.parse(item.date));
    assert.deepEqual([...dates(page1)].sort((a, b) => b - a), dates(page1));
    assert.ok(Math.min(...dates(page1)) >= Math.max(...dates(page2)), "跨页也要接得上");
    assert.equal(page1.data.items[0].name, "pkg-0299", "最新的那个排第一");
    // 这一路只有列表页那 10 条为了显示数字才查下载量，排序本身一次都不用查。
    const bulk = stub.calls.filter((u) => u.includes("/downloads/point/"));
    assert.ok(bulk.length <= 2, `按更新时间排不该为了排序去查下载量，实际打了 ${bulk.length} 次`);
  } finally {
    stub.restore();
    taggedIndexCache.clear();
    downloadsCache.clear();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("批量查下载量要分段：几百个名字不能拼成一条 URL", async () => {
  const { ctx, dir } = fakeCtx();
  const stub = stubFetch(fixture(1000));
  taggedIndexCache.clear();
  downloadsCache.clear();
  try {
    await settle(ctx, "q=&from=0&size=24&sort=downloads-week");
    const bulk = stub.calls.filter((u) => u.startsWith("https://api.npmjs.org/downloads/point/"));
    assert.ok(bulk.length > 1, "1000 个包不可能只用一条批量请求查完");
    for (const url of bulk) {
      const names = decodeURIComponent(url.split("/downloads/point/")[1].split("/").slice(1).join("/")).split(",");
      // npm 的批量接口一次最多 128 个；超了整批都拿不到，而且是静默的。
      assert.ok(names.length <= 128, `一条批量请求塞了 ${names.length} 个包，超过 npm 的上限`);
    }
  } finally {
    stub.restore();
    taggedIndexCache.clear();
    downloadsCache.clear();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("候选池还没填好时退回按页排，而不是拿半张表排出一个会抖的顺序", async () => {
  const { ctx, dir } = fakeCtx();
  // 下载量接口一律失败：池子永远填不满，必须退回旧行为而不是让列表乱掉。
  const items = fixture(200);
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const text = String(url);
    if (text.includes("/-/v1/search")) {
      const from = Number(new URL(text).searchParams.get("from") ?? 0);
      return { ok: true, json: async () => ({ total: items.length, objects: items.slice(from, from + 250).map((pkg) => ({ package: pkg })) }) };
    }
    throw new Error("downloads down");
  };
  taggedIndexCache.clear();
  downloadsCache.clear();
  try {
    const body = await search(ctx, "q=&from=0&size=24&sort=downloads-week");
    assert.equal(body.ok, true, "下载量全查不到也不能让搜索失败");
    assert.equal(body.data.items.length, 24, "列表照常出来");
    // 拿不到下载量的按 null 处理，UI 上就是不显示数字（「没数据」≠「没人用」）。
    assert.ok(body.data.items.every((item) => item.downloads === null));
  } finally {
    globalThis.fetch = original;
    taggedIndexCache.clear();
    downloadsCache.clear();
    rmSync(dir, { recursive: true, force: true });
  }
});
