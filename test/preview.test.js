// 发现页卡片的缩略图（GET /preview）。
//
// 这条路由和详情最大的不同是**调用量**：详情是「点开一条才打」，缩略图是「卡片
// 进视野就要」，一屏就是二十几个。而每一张图背后是一次 npm 全量 packument（README
// 只在那里面，dshmarket 实测 416KB）。所以这里守的两条不变式都跟「别把 registry
// 打疼」有关：
//
//   1. 同一个包的并发请求合流成一次联网（imagesFor 的 in-flight 表）；
//   2. 取不到图不算错误——回 `src: null`，卡片少一张图，别弹报错。
import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { __test__ } from "../lib/index.js";

const { handlePreview, readmeCache } = __test__;

/** profileDir 只认 baseUrl；设置文件读不到就是默认设置（官方源）。 */
const fakeCtx = () => ({ baseUrl: pathToFileURL(process.cwd() + "/").href });

function fakeRes() {
  const out = { status: null, body: null };
  return {
    out,
    writeHead(status) { out.status = status; },
    end(text) { out.body = JSON.parse(text); }
  };
}

async function call(query) {
  const res = fakeRes();
  await handlePreview(fakeCtx(), { method: "GET", url: `/preview?${query}` }, res);
  return res.out;
}

test("包名不合法直接回绝，不联网", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("不该联网"); };
  try {
    const out = await call("name=" + encodeURIComponent("--force"));
    assert.equal(out.body.ok, false);
    assert.equal(out.body.error.code, "bad-name");
  } finally {
    globalThis.fetch = original;
  }
});

test("README 里有图就回代理地址；没有图回 src:null，都不算错误", async () => {
  const original = globalThis.fetch;
  readmeCache.clear();
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () => (String(url).includes("with-shot")
      ? { readme: "# hi\n\n![](https://raw.githubusercontent.com/o/r/HEAD/docs/shot.png)\n" }
      : { readme: "# 没有图" })
  });
  try {
    const withShot = await call("name=with-shot");
    assert.equal(withShot.body.ok, true);
    // 地址必须是**我们自己的**代理，浏览器永远不直连 README 里写的主机。
    assert.match(withShot.body.data.src, /^\/api\/dsdesktop\/market\/image\?name=with-shot&i=0/);

    const without = await call("name=no-shot");
    assert.equal(without.body.ok, true);
    assert.equal(without.body.data.src, null);
  } finally {
    globalThis.fetch = original;
    readmeCache.clear();
  }
});

test("同一个包的并发请求只联网一次（一屏卡片同时进视野是常态）", async () => {
  const original = globalThis.fetch;
  readmeCache.clear();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return { ok: true, json: async () => ({ readme: "![](https://raw.githubusercontent.com/o/r/HEAD/a.png)" }) };
  };
  try {
    const results = await Promise.all([call("name=same-pkg"), call("name=same-pkg"), call("name=same-pkg")]);
    assert.equal(calls, 1, "三个并发请求应该合流成一次 packument 抓取");
    for (const out of results) assert.ok(out.body.data.src, "三个都要拿到地址");
    // 第四次走缓存，仍然是一次。
    await call("name=same-pkg");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    readmeCache.clear();
  }
});

test("slug 形状不对就当没给（它会被拼进 raw.githubusercontent.com 的路径）", async () => {
  const original = globalThis.fetch;
  readmeCache.clear();
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ readme: "![](docs/shot.png)" }) });
  try {
    // 相对路径的图要靠 slug 才能还原成绝对地址；给一个非法 slug 等于没给，图被丢掉。
    const bad = await call("name=rel-pkg&slug=" + encodeURIComponent("../../evil"));
    assert.equal(bad.body.data.src, null);
    readmeCache.clear();
    const good = await call("name=rel-pkg&slug=owner%2Frepo");
    assert.ok(good.body.data.src, "合法 slug 下这张相对路径的图应该能还原出来");
  } finally {
    globalThis.fetch = original;
    readmeCache.clear();
  }
});
