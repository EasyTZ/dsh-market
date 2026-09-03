// 客户端半的冒烟测试：在 node 里伪造 window / React，真跑一遍 factory、apply()
// 与两个槽组件的渲染路径。
//
// 为什么非要有它：client.js 不进任何 typecheck，`node --check` 又只查语法，而
// 组件函数体里的自由变量要到 render 时才求值 —— 引用一个不存在的标识符、或引用
// 后面才声明的 const（TDZ），都要真正执行组件函数才会暴露，表现是「面板打不开」。
//
// 这不是假想的风险。加这个测试的那一次，它一口气抓出三个已经躺在代码里的：
//
//   1. `desktop.plugins.length` —— 删「桌面自带插件」那个分组时漏掉的几处。浏览器
//      里 `desktop` 会顺着作用域链找到桌面外壳注入的 `window.desktop`，然后在
//      `undefined.length` 上抛 TypeError；
//   2. 裸的 `safeMode` —— 后端把它放在 /installed 的响应里，前端却既没存进状态、
//      也没带命名空间地引用它。安全模式横幅从来没渲染过；
//   3. `setToggleError` 有三个调用点，对应的 `useState` 压根没声明 —— 任何一次开关
//      失败都会炸掉整个面板。
//
// 后来实机又抓到第四个，同一族但躲过了上面这套：InstalledRow 的形参列表里漏了
// `onToggle`，而开关的 onChange 里在用它。**渲染是好的**，点下去才抛 —— 受控
// checkbox 于是弹回原位，用户看到的现象是「开关点不动」。所以光渲染不够，下面
// 还要把渲染出来的每个 `on*` 处理器**真的调一遍**。
//
// 三个都是「函数体里的自由变量」，语法合法、纯逻辑单测（当时 33 个，全绿）碰不到，
// 只有真正执行组件函数才暴露。而市场是安全模式下唯一被加载的插件，也就是「插件把
// 内核搞崩」时的唯一逃生舱 —— 逃生舱的面板打不开，用户就真的没有出路了。
//
// **所以下面那个迷你 React 必须是真的会渲染的**（状态真存、effect 真跑、子组件真调、
// setState 真触发重渲染）。写成「useState 原样返回初值 + useEffect 空函数」的空壳版
// 试过：面板永远停在 `status: "loading"` 的早退分支，上面三个 bug 一个都抓不到，
// 测试却全绿 —— 那比没有测试更糟，因为它给人已经防住了的错觉。

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CLIENT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "client.js");

/** 把伪造的 React 元素树拍平成数组，便于查找。 */
function flatten(node, out = []) {
  if (node === null || node === undefined || node === false) return out;
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out);
    return out;
  }
  if (typeof node !== 'object') return out;
  out.push(node);
  const children = node.props && node.props.children;
  if (children !== undefined) flatten(children, out);
  return out;
}

/**
 * 把树里所有 `on*` 处理器都调一遍。
 *
 * 渲染只会求值组件函数体，事件处理器的函数体要到**触发时**才执行 —— 里面引用一个
 * 不存在的标识符（漏在形参列表外的 prop、拼错的名字），渲染一路绿灯，点下去才抛。
 * 这里不断言任何业务结果，只要求「调得动、不抛」：处理器一抛，React 就吃掉了这次
 * 交互，受控组件弹回原值，表现正是「点了没反应」。
 *
 * fetch 已经被换成假的，所以真被触发的那些请求也落不到网络上。
 */
function fireAll(nodes) {
  const evt = () => ({
    target: { checked: true, value: "x" },
    currentTarget: { checked: true, value: "x" },
    preventDefault() {}, stopPropagation() {},
    key: "Escape", clientX: 0, clientY: 0,
  });
  let fired = 0;
  for (const node of nodes) {
    for (const [key, value] of Object.entries(node.props || {})) {
      if (!/^on[A-Z]/.test(key) || typeof value !== "function") continue;
      value(evt());
      fired += 1;
    }
  }
  return fired;
}

/**
 * 一个够用的假 DOM 节点：能装下 scrollTop，也能应付点击外部关菜单那类探测。
 * 高度写死成「内容比视口高很多」，这样滚动位置的读写才有意义。
 */
function fakeElement() {
  return { scrollTop: 0, scrollHeight: 5000, clientHeight: 500, contains: () => false };
}

function loadModule() {
  const src = fs.readFileSync(CLIENT, 'utf8');
  const registrations = [];
  const styleTag = { dataset: {}, textContent: '' };
  // 记下每次 fetch 打了哪条路由，供测试断言「点了这个按钮真的发出了那个请求」——
  // 光断言「调用处理器不抛」抓不住「处理器把回调接错、变成空操作」这类问题。
  const fetchCalls = [];
  Object.assign(globalThis, {
    window: {
      __ModuleLoader__: { load(reg) { registrations.push(reg); } },
      getSelection: () => ({ toString: () => '' }),
      // 桌面外壳经 preload 注入的桥。**必须造**，理由见文件顶部。
      desktop: { restartApp() {} },
    },
    document: {
      querySelector: () => null,
      createElement: () => styleTag,
      body: { appendChild() {}, removeChild() {} },
      head: { appendChild() {} },
      addEventListener() {},
      removeEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    // 按路由给出**真实形状**的数据。给统一的空 `{}` 等于让列表永远是空的，
    // 分组那棵树照样不执行 —— 和 effect 不跑是同一种自欺。
    //
    // `/installed` 的 enabled 字段要能被 toggle 的 POST 真正改掉，不能是每次都
    // 返回同一份静态快照——真实后端的 /installed 读的就是 toggle 写的那份
    // plugin-state.json，两者是同一份数据；测试的假 fetch 也要维持这个关系，
    // 否则"改动是否真的生效"这条路径永远测不出来（改前改后请求都拿到一样的
    // enabled，任何靠比对前后差异判断的逻辑都会被这份假数据本身骗过去）。
    fetch: (() => {
      const enabledOverrides = {};
      // 真实后端里 pnpm remove 一跑完，/installed 立刻就查不到那个包了——测试的假
      // fetch 也要维持这个关系，否则「卸载之后 /installed 还查得到」这条前提在
      // 测试里永远不成立，「卸载后应该还留一个幽灵行」这种断言就测不出真假。
      const uninstalledNames = new Set();
      // /installed 和 /updates 在真实后端里是同一份数据的两种切法（见 lib/index.js
      // 的 collectInstalled），假 fetch 也得维持这个关系——两边各写一份 fixture，
      // 「角标数跟列表对不上」这种 bug 就永远测不出来。
      const fixture = () => ([
        // 不可卸载的（宿主产品包）、可卸载的、被停用的，三种行各来一个。市场自己
        // 不再是「不可卸载」的例子——它现在和别的插件一样能卸载，只是不能停用
        // （见 lib/index.js 里 protectedPackages() / disableProtectedPackages()
        // 的区分），这里换成真正不可卸载的宿主产品包，别再暗示市场卸不掉。
        { name: '@deepseek-ai/dsh-base', version: '0.1.0', removable: false, canDisable: false, entryIds: [], enabled: true },
        // 带一个「有更新」的，好让更新徽章/按钮、以及侧边栏那个小叹号都真的跑一遍。
        { name: '@easytz/dsh-git', version: '0.5.0', removable: true, canDisable: true, entryIds: ['dsdesktop-git'], enabled: true, installedVersion: '0.5.0', latestVersion: '0.6.0', updateAvailable: true },
        { name: 'cost-meter', version: '1.0.0', removable: true, canDisable: true, entryIds: ['cost-meter'], enabled: false },
      ]);
      // 这个假 React 的 effect 不认依赖数组、每一轮都会重跑（见下面 __render 的
      // 注释），/capabilities 的 fetch 因此会被反复重新发起。/settings/save 存了
      // 什么，/capabilities 就必须照实吐回来——不然乐观更新的开关状态会被这个
      // 重复触发的 fetch 用「服务端一直没变过」的假数据活活覆盖回去，跟真实场景
      // （effect 只在依赖真的变了才重跑）完全对不上。
      let registryMirrorState = false;
      return async (url, init) => ({
        ok: true,
        json: async () => {
          fetchCalls.push(String(url) + (init && init.method === 'POST' ? ' POST' : ''));
          if (String(url).endsWith('/settings/save')) {
            const body = JSON.parse(init.body);
            if (Object.prototype.hasOwnProperty.call(body, 'registryMirror')) registryMirrorState = body.registryMirror === true;
            return { ok: true, data: { imageMirror: '', registryMirror: registryMirrorState } };
          }
          if (String(url).endsWith('/profile-plugins/toggle')) {
            const body = JSON.parse(init.body);
            enabledOverrides[body.name] = body.enabled;
            return { ok: true, data: { name: body.name, enabled: body.enabled, entryIds: [] } };
          }
          if (String(url).endsWith('/uninstall')) {
            const body = JSON.parse(init.body);
            uninstalledNames.add(body.name);
            return { ok: true, data: { name: body.name, output: '' } };
          }
          if (String(url).endsWith('/install')) {
            const body = JSON.parse(init.body);
            return { ok: true, data: { name: body.name, version: body.version || '2.0.0', drifted: false, output: '' } };
          }
          if (String(url).includes('/detail?')) {
            // 详情页要用到的字段跟搜索结果不是同一份形状（installable/keywords/
            // images 都是 detail 专属），给一份真实形状，不然 DiscoverDetail 里
            // `data.keywords.length` 这类字段访问会在 undefined 上直接炸。
            return { ok: true, data: {
              name: 'dsh-new-thing', version: '2.0.0', description: 'a fresh plugin',
              license: 'MIT', dependencies: 0, github: null, repository: null, homepage: null,
              deprecated: null, keywords: ['dsh-plugin'], images: [], installable: true, reason: null,
            } };
          }
          if (String(url).includes('/updates')) {
            const names = fixture()
              .filter((item) => !uninstalledNames.has(item.name) && item.updateAvailable)
              .map((item) => item.name);
            return { ok: true, data: { count: names.length, names } };
          }
          if (String(url).endsWith('/installed')) {
            const items = fixture()
              .filter((item) => !uninstalledNames.has(item.name))
              .map((item) => (
                item.name in enabledOverrides ? { ...item, enabled: enabledOverrides[item.name] } : item
              ));
            return { ok: true, data: { profileName: 'web', profileDir: 'D:/x/profiles/web', safeMode: false, items } };
          }
          if (String(url).endsWith('/capabilities')) {
            return { ok: true, data: { canInstall: true, busy: false, imageMirror: '', registryMirror: registryMirrorState } };
          }
          if (String(url).endsWith('/bundled')) {
            // 一个「随应用分发但当前没装」的，好让那一组也渲染出来。
            return { ok: true, data: { plugins: [{ packageName: '@easytz/dsh-ui-balance', version: '0.5.0', installed: false }] } };
          }
          if (String(url).includes('/search?')) {
            // 发现 tab 用的一条搜索结果——带下载量，好让卡片上的下载量、以及卡片
            // 自带的安装按钮这两条路径都真的跑一遍。
            return { ok: true, data: { total: 1, sort: 'downloads-week', items: [
              { name: 'dsh-new-thing', version: '2.0.0', description: 'a fresh plugin', keywords: ['dsh-plugin'], license: 'MIT', date: '2026-01-01', publisher: 'someone', repository: null, github: null, tagged: true, downloads: 42 },
            ] } };
          }
          return { ok: true, data: { items: [], objects: [], total: 0 } };
        },
      });
    })(),
  });

  const reactJsx = {
    jsx: (type, props, key) => ({ type, props: props || {}, key }),
    jsxs: (type, props, key) => ({ type, props: props || {}, key }),
    Fragment: Symbol('Fragment'),
  };
  // —— 一个够用的迷你 React ——————————————————————————————
  //
  // 这里**不能**把 useState 写成「原样返回初值」、useEffect 写成空函数。那样
  // 面板会永远停在 `status: "loading"` 的早退分支上，真正复杂的那棵树（分组、
  // 列表、按钮）一行都不执行 —— 测试全绿，而面板在浏览器里打不开。验证过：
  // 把 desktop.plugins 那个 bug 放回去，空壳版 hooks 照样 37 个用例全过。
  //
  // 所以状态要真存、effect 要真跑、setState 要真触发重渲染。三十来行，换来的是
  // 这个测试真的在测东西。
  const cells = [];
  let cursor = 0;
  let dirty = false;
  const effects = [];
  // effect 的依赖记忆（见下面 useEffect 的注释）：effectMemo 跨轮保留，
  // effectSeq 每轮清零，用来区分「同一段源码在这一轮里的第几个实例」。
  const effectMemo = new Map();
  const effectSeq = new Map();
  const reactHooks = {
    useState(init) {
      const i = cursor++;
      if (cells.length <= i) cells[i] = { v: typeof init === 'function' ? init() : init };
      const cell = cells[i];
      return [cell.v, (next) => {
        const value = typeof next === 'function' ? next(cell.v) : next;
        if (!Object.is(value, cell.v)) { cell.v = value; dirty = true; }
      }];
    },
    useCallback: (fn) => fn,
    // **依赖数组要真的认。**
    //
    // 早先这里是无脑 `effects.push`、每一轮把所有 effect 重跑一遍。那样「某个
    // effect 的依赖里多写/少写了一项」这类 bug 在测试里完全看不见——而这正是
    // 「装完一个插件，发现列表整个重搜、滚动位置丢了」的成因：搜索 effect 的依赖
    // 里挂着装卸插件用的那个刷新信号。测试要能守住这条，替身就得会跳过。
    //
    // 记忆不按槽位下标存，按 **effect 函数的源码文本 + 本轮同源码的第几次**。
    // 真 React 按 hook 调用顺序记，那要求整棵树的 hook 数量每轮一致；而这个替身
    // 用的是一条全局共享的 cells 数组，切 tab、卡片增减都会让下标整体错位——错位
    // 的下标配上「依赖没变就跳过」，会把该跑的 effect 跳掉，测试跟着假绿。源码
    // 文本对每个调用点唯一，且不受别的组件在不在场影响。
    useEffect(fn, deps) {
      const src = String(fn);
      const nth = effectSeq.get(src) || 0;
      effectSeq.set(src, nth + 1);
      const key = src + "#" + nth;
      let cell = effectMemo.get(key);
      if (!cell) { cell = { deps: null, first: true }; effectMemo.set(key, cell); }
      const changed = cell.first || !deps || !cell.deps
        || cell.deps.length !== deps.length
        || deps.some((d, k) => !Object.is(d, cell.deps[k]));
      cell.first = false;
      cell.deps = deps;
      if (changed) effects.push({ fn, deps });
    },
    useLayoutEffect(fn, deps) { return reactHooks.useEffect(fn, deps); },
    useMemo: (fn) => fn(),
    useRef(init) {
      const i = cursor++;
      if (cells.length <= i) cells[i] = { v: { current: init } };
      return cells[i].v;
    },
    useSyncExternalStore: (_sub, get) => get(),
  };
  // 真 React 会继续往下渲染子组件；jsx() 只是造一个 `{type, props}` 描述对象，
  // 函数组件不会自己执行。面板的内容全在 MarketPanelBody 这个子组件里，不往下走
  // 就等于只测了最外面那层壳 —— 所以这里手动深渲染：遇到 type 是函数的节点就调它。
  const deepRender = (node, depth = 0) => {
    if (node === null || node === undefined || typeof node !== 'object' || depth > 60) return node;
    if (Array.isArray(node)) return node.map((child) => deepRender(child, depth + 1));
    // 换成组件的**输出**，而不是把输出塞回同一个节点的 children —— 后者的 type
    // 还是那个函数，下一轮又会命中这个分支，于是同一个组件被反复调用直到撞上深度
    // 上限，真正的子树一个节点都没进最终的树。组件函数体照样跑了（所以早先那三个
    // 自由变量 bug 抓得到），但树里只剩一层壳：行里的开关、按钮全都不在，也就没法
    // 触发它们的事件处理器。
    if (typeof node.type === 'function') return deepRender(node.type(node.props), depth + 1);
    // 宿主元素上挂了 ref 就给它一个假 DOM 节点。真 React 会在提交阶段把真节点写进
    // ref.current；这里不造一个，任何「读回 DOM 再改回去」的逻辑（比如从详情返回
    // 时把滚动位置滚回原处）在测试里都会静默走空指针分支，测了个寂寞。
    // 只在第一次赋值，之后跨轮复用同一个对象——不然每轮都换一个新节点，effect 里
    // 记下的状态全丢。
    if (typeof node.type === 'string' && node.props && node.props.ref && typeof node.props.ref === 'object'
      && node.props.ref.current === null) {
      node.props.ref.current = fakeElement();
    }
    const children = node.props && node.props.children;
    if (children === undefined) return node;
    return { ...node, props: { ...node.props, children: deepRender(children, depth + 1) } };
  };

  // 渲染到稳定：跑一遍组件（含子组件）→ 执行本轮攒下的 effect → 等微任务
  //（fetch 是 async）→ 状态变了就再来一轮。上限 12 轮，防止组件写成死循环时测试挂住。
  reactHooks.__render = async (render) => {
    const teardowns = [];
    let last;
    for (let round = 0; round < 12; round += 1) {
      cursor = 0;
      dirty = false;
      effects.length = 0;
      effectSeq.clear();
      last = deepRender(render());
      // **别在这里调 teardown**。面板的每个取数 effect 都用 `let alive = true` +
      // teardown 里置 false 来防竞态，立刻 teardown 等于让所有 `.then` 直接 return，
      // 状态永远停在 loading —— 那正是这个测试最想避免的空壳。攒着，最后一起清。
      const seen = new Set();
      for (const { fn } of effects) {
        if (seen.has(fn)) continue;
        seen.add(fn);
        const teardown = fn();
        if (typeof teardown === 'function') teardowns.push(teardown);
      }
      await new Promise((r) => setTimeout(r, 0));
      if (!dirty) break;
    }
    for (const fn of teardowns) fn();
    return last;
  };
  // 面板用 createPortal 挂到 body，为的是让遮罩的 z-index 压过桌面端那个
  // z-index:900 的自绘标题栏（shell.overlay 那层封顶只有 20）。假 DOM 里没有真
  // 容器，原样返回即可 —— 这里关心的是「这棵树渲染得出来」。
  const reactDom = { createPortal: (node) => node };
  const fakeRequire = (id) => {
    if (id === 'react/jsx-runtime') return reactJsx;
    if (id === 'react') return reactHooks;
    if (id === 'react-dom') return reactDom;
    throw new Error('unexpected require: ' + id);
  };
  // eslint-disable-next-line no-eval
  eval(src);
  assert.strictEqual(registrations.length, 1, '应恰好注册一次');
  const mod = registrations[0].factory(fakeRequire);
  mod.__render = reactHooks.__render;
  mod.__fetchCalls = fetchCalls;
  return mod;
}

const cleanup = () => Object.assign(globalThis, {
  window: undefined, document: undefined, localStorage: undefined, fetch: undefined,
});

/** 装好插件，拿到注册进两个槽的组件。 */
function mount() {
  const mod = loadModule();
  const captured = {};
  const injected = {};
  const ctx = {
    effect: () => () => {},
    locale: { register() {} },
    slots: {
      inject: (key, cb) => { cb(); return () => {}; },
      register: (opts, comp) => {
        captured[opts.name + ':' + opts.id] = comp;
        injected[opts.id] = opts.inject();
        return () => {};
      },
    },
  };
  mod.apply(ctx);
  return { mod, captured, injected, t: (k) => k };
}

test('client.js 冒烟：打开的面板要真的渲染到有插件行', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    assert.strictEqual(typeof mod.apply, 'function');
    assert.deepStrictEqual(mod.inject, ['slots', 'locale']);

    const footer = captured['sidebar.footer.action:market'];
    const panel = captured['shell.overlay:market-panel'];
    assert.ok(footer, '入口按钮应注册进 sidebar.footer.action');
    assert.ok(panel, '面板应注册进 shell.overlay');

    const { store, updates } = injected['market-panel'];
    footer({ t, store, updates });
    // 关着的时候也渲染一次：这条路径要求面板 pointer-events:none，否则关着也挡点击。
    panel({ t, store, updates });

    store.toggle();
    const tree = flatten(await mod.__render(() => panel({ t, store, updates })));

    // **这条断言是这个测试的重点**：光「没抛异常」不够 —— 早退分支（还在 loading）
    // 也不抛。必须确认真的渲染到了那三行插件，否则测试覆盖的还是个空壳。
    const text = JSON.stringify(tree.map((n) => n.props && n.props.children));
    for (const name of ['@deepseek-ai/dsh-base', '@easytz/dsh-git', 'cost-meter']) {
      assert.ok(text.includes(name), `已安装列表里应渲染出 ${name}`);
    }

    // 渲染完还要能**点**。漏 prop 的处理器只在触发时才抛，见 fireAll 的注释。
    // 注意这一下会把关闭按钮、tab 按钮也一起点了，面板状态之后就不可信了 ——
    // 想断言「点完变成什么样」的用例得自己挑处理器，别接着这棵树往下写。
    const fired = fireAll(tree);
    assert.ok(fired > 5, `应触发到一批处理器，实际只有 ${fired} 个`);
  } finally {
    cleanup();
  }
});

test('停用插件之后，横幅上要给一个重启按钮（改动要下次启动才生效）', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    // 这里**不能**用 fireAll：它会把关闭按钮和 tab 按钮也一起点了，面板要么关掉、
    // 要么切到「发现」，已安装那棵树根本不再渲染。只点行上的开关。
    const first = flatten(await mod.__render(render))
      .find((n) => n.type === 'input' && n.props.type === 'checkbox' && typeof n.props.onChange === 'function');
    assert.ok(first, '可停用的行上应有开关');
    first.props.onChange({ target: { checked: false }, preventDefault() {}, stopPropagation() {} });
    const after = flatten(await mod.__render(render));

    const texts = after.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(texts.some((x) => x.includes('market.pending.restart')), '应出现「重启后生效」横幅');
    // 光提示「请重启」等于把活儿丢回给用户：重启入口就在 preload 桥上。
    const restart = after.filter((n) => n.type === 'button')
      .some((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.detail.restart'));
    assert.ok(restart, '横幅里应有「重启应用」按钮');
  } finally {
    cleanup();
  }
});

test('一个插件先关再开，跟内核当前状态相比没有净改动，不该出现横幅', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const findToggle = (tree) => tree.find((n) => n.type === 'input' && n.props.type === 'checkbox' && typeof n.props.onChange === 'function');

    const first = findToggle(flatten(await mod.__render(render)));
    assert.ok(first, '可停用的行上应有开关');
    // 关掉
    first.props.onChange({ target: { checked: false }, preventDefault() {}, stopPropagation() {} });
    const afterOff = flatten(await mod.__render(render));
    assert.ok(
      afterOff.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '').some((x) => x.includes('market.pending.restart')),
      '关掉之后应该先出现横幅——这是下一步的前提'
    );

    // 再开回去：跟内核实际在跑的状态（一开始就是启用）相比，等于没有净改动。
    const second = findToggle(afterOff);
    assert.ok(second, '重新渲染后开关还应该在');
    second.props.onChange({ target: { checked: true }, preventDefault() {}, stopPropagation() {} });
    const afterOn = flatten(await mod.__render(render));

    const texts = afterOn.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(!texts.some((x) => x.includes('market.pending.restart')), '关了又开等于没变，不该再显示「重启后生效」横幅');
  } finally {
    cleanup();
  }
});

test('已安装的插件有新版本时要给徽章和更新按钮，点了要真的调用 /install', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const tree = flatten(await mod.__render(render));
    const texts = tree.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(texts.some((x) => x.includes('market.badge.update')), '有更新的插件应该有「有更新」徽章');

    const updateBtn = tree.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.detail.updateTo'));
    assert.ok(updateBtn, '应该有「更新到」按钮');
    // 只调这一个按钮的处理器，不用 fireAll——同样是为了不把关闭/tab 按钮也点了。
    updateBtn.props.onClick();
    await new Promise((r) => setTimeout(r, 0));
    // 光断言「点了不抛」抓不住 onClick 接错回调、变成空操作这类问题——必须确认
    // 它真的把请求打到了 /install（用最新版本重装等同于更新，见后端 handleInstall）。
    assert.ok(mod.__fetchCalls.includes('/api/dsdesktop/market/install POST'), '点更新按钮应该调用 /install');

    // 更新成功后不该在这张卡片的结果条里单独画一个「重启应用」按钮——重启入口
    // 和停用/启用共用面板底部那一条（dsmkPending），点更新只是把那条横幅点亮。
    const after = flatten(await mod.__render(render));
    const restartButtons = after.filter((n) => n.type === 'button')
      .filter((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.detail.restart'));
    assert.strictEqual(restartButtons.length, 1, '重启按钮应该只出现一次（共用横幅里），不该每张卡片各配一个');
    const afterTexts = after.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(afterTexts.some((x) => x.includes('market.pending.restart')), '更新成功后应该点亮共用的「重启后生效」横幅');
  } finally {
    cleanup();
  }
});

test('卸载只压暗被卸的那一张卡片：面板其余部分照常可用，能连着卸好几个再一次重启', async () => {
  // 这条断言的历史值得写清楚，免得又被改回去：
  //
  // 最早卸载会造一份独立的「幽灵行」快照，跟 /installed 刷新回来的真实数据各画各的
  // ——同一个包出现两张卡片。当时的修法是**把整块面板锁死**：卸完一个就全部禁用、
  // 逼用户重启，连续卸载这个场景从产品上被取消了，重复行自然也没了。
  //
  // 代价是「想卸三个插件就得重启三次」，用户明确要求改回来。所以这一版重新支持连续
  // 卸载，但**不是**退回老写法：幽灵卡片只取「名字已经不在 /installed 里」的那些
  // （lib/client.js 的 ghostItems），跟真实数据按定义互斥，重复行不靠时序去躲。
  //
  // 于是这个测试同时守两件事：连续卸载可用，且连续卸载之后没有重复卡片。
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const findDanger = (tree, title) => tree.filter((n) => n.type === 'button')
      .find((b) => typeof b.props.className === 'string' && b.props.className.includes('dsmkDangerBtn') && b.props.title === title);
    const cardsNamed = (tree, name) => tree.filter((n) => n.props
      && n.props.className === 'dsmkCardName' && n.props.children === name);
    // 卡片本体（带 dsmkCard 的那个 div），用来看它有没有被压暗。
    const cardOf = (tree, name) => {
      const idx = tree.findIndex((n) => n.props && n.props.className === 'dsmkCardName' && n.props.children === name);
      if (idx < 0) return null;
      for (let i = idx; i >= 0; i -= 1) {
        const cls = tree[i].props && tree[i].props.className;
        if (typeof cls === 'string' && cls.includes('dsmkCard ')) return tree[i];
      }
      return null;
    };
    /** 两段式确认：第一下只是武装，第二下才真卸。 */
    const uninstall = async (name) => {
      const armBtn = findDanger(flatten(await mod.__render(render)), name);
      assert.ok(armBtn, name + ' 应该有卸载按钮');
      armBtn.props.onClick();
      const confirmBtn = findDanger(flatten(await mod.__render(render)), name);
      assert.ok(confirmBtn, '武装后按钮应该还在（换成「确认卸载？」）');
      assert.strictEqual(confirmBtn.props.disabled, false, name + ' 的卸载按钮应该点得动');
      confirmBtn.props.onClick();
      await new Promise((r) => setTimeout(r, 0));
    };

    await uninstall('cost-meter');
    const after = flatten(await mod.__render(render));
    assert.ok(mod.__fetchCalls.includes('/api/dsdesktop/market/uninstall POST'), '第二下才应该真的调用 /uninstall');

    // 整块内容区域不该再被压暗——那正是「卸一个就得重启一次」的根源。
    assert.ok(
      !after.some((n) => typeof n.props.className === 'string' && n.props.className.includes('dsmkBodyLocked')),
      '不该再有整块压暗的锁：压暗范围只到被卸的那一张卡片'
    );

    // 被卸的那张卡片：还在（留影），压暗，挂「已卸载」徽章，操作按钮全撤掉。
    const removedCard = cardOf(after, 'cost-meter');
    assert.ok(removedCard, '卸掉的插件应该还留一张卡片，而不是凭空消失');
    assert.ok(removedCard.props.className.includes('dsmkCardRemoved'), '被卸的卡片应该压暗');
    const removedTexts = flatten(removedCard).map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(removedTexts.some((x) => x.includes('market.badge.removed')), '被卸的卡片应该挂「已卸载」徽章');
    assert.equal(findDanger(after, 'cost-meter'), undefined, '被卸的卡片上不该还留着卸载按钮');
    // 徽章已经说了「已卸载」，不再另外挂一行结果条：action 是全局单例，卸第二个的
    // 时候第一个的那行绿字会凭空消失，看着像出了什么错。
    assert.ok(
      !flatten(removedCard).some((n) => typeof n.props.className === 'string' && n.props.className.includes('dsmkResultOk')),
      '被卸的卡片上不该再有「已卸载 XXX」那行绿字'
    );

    // 别的插件完全不受影响：卸载按钮点得动，开关也点得动。
    const otherDanger = findDanger(after, '@easytz/dsh-git');
    assert.ok(otherDanger, 'dsh-git 的卸载按钮应该还在');
    assert.strictEqual(otherDanger.props.disabled, false, '卸了一个之后别的插件应该还能接着卸');
    const toggleInput = after.find((n) => n.type === 'input' && n.props.type === 'checkbox');
    assert.ok(toggleInput, '开关还在');
    assert.strictEqual(toggleInput.props.disabled, false, '卸载不该把别的插件的开关也禁掉');

    // 连着卸第二个：这是老版本从产品上取消掉的场景，也是重复行 bug 当年出现的地方。
    await uninstall('@easytz/dsh-git');
    const after2 = flatten(await mod.__render(render));
    for (const name of ['cost-meter', '@easytz/dsh-git']) {
      assert.strictEqual(cardsNamed(after2, name).length, 1, name + ' 只该有一张卡片（幽灵行和真实数据不能各画一张）');
      const card = cardOf(after2, name);
      assert.ok(card.props.className.includes('dsmkCardRemoved'), name + ' 卸掉之后应该压暗');
    }
    // **卡片不能因为被卸载就换位置。** 服务端按包名排（pure.js 的 normalizeInstalled），
    // 幽灵卡片直接 append 在后面的话，卸掉的那个会当场跳到列表最末——连着卸两个，
    // 它俩按「卸载的先后」堆在尾部，跟其余卡片的字母序对不上，看着就是列表乱了。
    const order = after2.filter((n) => n.props && n.props.className === 'dsmkCardName')
      .map((n) => n.props.children);
    const idxGit = order.indexOf('@easytz/dsh-git');
    const idxCost = order.indexOf('cost-meter');
    assert.ok(idxGit >= 0 && idxCost >= 0, '两张卡片都该还在列表里');
    assert.ok(idxGit < idxCost,
      '卸载不该改变排列顺序：@easytz/dsh-git 按包名排在 cost-meter 前面，卸完还是这个顺序');

    // 两次卸载都进了「重启后生效」的计数，用户一次重启就能收掉。
    const banner = after2.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(banner.some((x) => x.includes('market.pending.restart')), '连续卸载之后应该点亮共用的「重启后生效」横幅');
  } finally {
    cleanup();
  }
});

test('重启横幅显示的是总改动数——装/卸插件现在也计数了，不再是一句没有数字的提示', async () => {
  // 真实反馈：装/卸插件成功后横幅只说「有插件改动，重启后生效」，没有数字；
  // 停用/启用却有（「有 {n} 项...改动」）。用户记得之前是有计数的，两者现在统一成
  // 同一份总数。默认的 identity t 测不出数字对不对——「market.pending.restart」
  // 这个 key 本身不含 {n}，fmt() 替换了也看不出差别——所以这里换一个认得 {n}
  // 占位符的假 t，直接从渲染结果里读数字。
  try {
    const { mod, captured, injected } = mount();
    const t = (k) => (k === 'market.pending.restart' ? 'PENDING:{n}' : k);
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const tree = flatten(await mod.__render(render));
    const updateBtn = tree.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.detail.updateTo'));
    assert.ok(updateBtn, '应该有「更新到」按钮');
    updateBtn.props.onClick();
    await new Promise((r) => setTimeout(r, 0));

    const afterInstall = flatten(await mod.__render(render));
    const textsAfterInstall = afterInstall.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(textsAfterInstall.some((x) => x.includes('PENDING:1')), '装/卸插件应该跟停用/启用一样带上数字，装一次应该是 1');

    // 再关掉一个开关，数字应该累加到 2（1 次更新 + 1 次开关净改动）——两种改动
    // 共用同一个总数，不是各画各的。
    const toggleInput = afterInstall.find((n) => n.type === 'input' && n.props.type === 'checkbox' && typeof n.props.onChange === 'function');
    assert.ok(toggleInput, '应该还能找到一个开关');
    toggleInput.props.onChange({ target: { checked: false }, preventDefault() {}, stopPropagation() {} });
    const afterToggle = flatten(await mod.__render(render));
    const textsAfterToggle = afterToggle.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(textsAfterToggle.some((x) => x.includes('PENDING:2')), '装/卸的计数应该跟开关的计数加在一起显示总数');
  } finally {
    cleanup();
  }
});

test('重启横幅跨 tab 都看得见——装/卸插件是在「发现」tab 点的，不能只在「已安装」才露面', async () => {
  // 真实故障：横幅曾经卷在「已安装」tab 自己的内容树里，用户在「发现」tab 点了
  // 安装、成功了，切回「发现」逛别的插件时完全看不到任何重启提示——市场面板已经
  // 关掉了，用户根本不知道刚装的插件要重启才会真的加载出来。横幅现在应该挂在
  // Tabs 和 Body 之间，跟当前在哪个 tab 无关。
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const tree = flatten(await mod.__render(render));

    // 触发一次会点亮横幅的动作：更新已安装的 @easytz/dsh-git（fixture 里带
    // updateAvailable: true）。跟前一个用例一样只调这一个按钮，不用 fireAll。
    const updateBtn = tree.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.detail.updateTo'));
    assert.ok(updateBtn, '应该有「更新到」按钮');
    updateBtn.props.onClick();
    await new Promise((r) => setTimeout(r, 0));

    const afterUpdate = flatten(await mod.__render(render));
    const discoverTabBtn = afterUpdate.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    assert.ok(discoverTabBtn, '应该有「发现」tab 按钮');
    discoverTabBtn.props.onClick();

    const onDiscover = flatten(await mod.__render(render));
    const texts = onDiscover.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(texts.some((x) => x.includes('market.pending.restart')), '切到「发现」tab 后，共用的「重启后生效」横幅仍应可见');
    const restartBtn = onDiscover.filter((n) => n.type === 'button')
      .some((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.detail.restart'));
    assert.ok(restartBtn, '「发现」tab 上也应该能直接点重启，不用先切回「已安装」');
  } finally {
    cleanup();
  }
});

test('发现卡片上直接有安装按钮，不用点进详情才能装', async () => {
  // 真实反馈：卡片本身可以点开看详情，但要装一个插件必须先点进去，多一步。
  // 现在卡片上直接给一个安装按钮，点它就装，不用先看详情；点按钮不该顺带展开
  // 详情（两者是完全独立的两个操作——按钮点击要 stopPropagation，不然点它会
  // 同时触发卡片自己的展开）。
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render));
    const discoverTabBtn = first.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    assert.ok(discoverTabBtn, '应该有「发现」tab 按钮');
    discoverTabBtn.props.onClick();

    const onDiscover = flatten(await mod.__render(render));
    // 卡片本身现在是 div（role="button"），不再是 <button>——安装按钮嵌在里面，
    // button 套 button 是无效 HTML。找卡片就不能再靠 n.type === 'button'，靠
    // dsmkCardName 里的名字定位。
    const nameSpan = onDiscover.find((n) => n.type === 'span' && n.props.className === 'dsmkCardName' && n.props.children === 'dsh-new-thing');
    assert.ok(nameSpan, '搜索结果应该渲染出这张卡片');

    const installBtn = onDiscover.filter((n) => n.type === 'button')
      .find((b) => typeof b.props.className === 'string' && b.props.className.includes('dsmkPrimaryBtn') && b.props.title === 'dsh-new-thing');
    assert.ok(installBtn, '卡片上应该直接有安装按钮，不用先展开详情');
    // 这个假 React 是手调处理器，不是真的 DOM 事件冒泡——点安装按钮不会像真浏览器
    // 那样自动帮我们把点击"冒泡"到外层卡片的 onClick 上，所以下面调用 onClick 测
    // 不出"忘了 stopPropagation"这种回归。直接查处理器的源码里有没有调
    // stopPropagation，把这条也钉住。
    assert.ok(installBtn.props.onClick.toString().includes('stopPropagation'),
      '安装按钮的点击处理器必须调用 stopPropagation，否则真实浏览器里点它会连带触发卡片的展开');
    installBtn.props.onClick({ stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 0));

    assert.ok(mod.__fetchCalls.includes('/api/dsdesktop/market/install POST'), '点卡片上的安装按钮应该直接调用 /install');
    assert.ok(!mod.__fetchCalls.some((c) => c.includes('/detail')), '不应该为了装它而先请求详情');

    const after = flatten(await mod.__render(render));
    // 没有展开详情：详情视图特有的「返回」按钮不该出现。
    assert.ok(
      !after.some((n) => typeof n.props.className === 'string' && n.props.className.includes('dsmkBackBtn')),
      '点安装按钮不该顺带展开详情——两者是独立操作'
    );
  } finally {
    cleanup();
  }
});

test('在「发现」里装完插件不该重新搜索——重搜会把列表塌回第一页，用户翻了几屏的位置全丢', async () => {
  // 用户反馈：在发现里往下滚了好几屏，找到一个包装上，列表哗一下回到顶部，
  // 得从头再滚一遍。根因是搜索的 effect 依赖里挂着 `rescan`，而 `rescan` 正是
  // 装/卸插件后用来刷新本机状态的那个信号——装完顺手把 npm 也重搜了一遍，
  // results 被换成新的第一页，滚动位置跟着内容一起没了。
  //
  // npm 上的搜索结果不会因为你本机装了个包而改变，那次重搜纯属白费。现在拆成
  // 两个信号：rescan 只刷本机状态，research 才重搜（见 lib/client.js）。
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render));
    const discoverTabBtn = first.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    discoverTabBtn.props.onClick();
    await mod.__render(render);

    const searchesBefore = mod.__fetchCalls.filter((c) => c.includes('/search?')).length;
    assert.ok(searchesBefore > 0, '进「发现」tab 总得先搜一次');
    const installedBefore = mod.__fetchCalls.filter((c) => c.endsWith('/installed')).length;

    const onDiscover = flatten(await mod.__render(render));
    const installBtn = onDiscover.filter((n) => n.type === 'button')
      .find((b) => typeof b.props.className === 'string' && b.props.className.includes('dsmkPrimaryBtn') && b.props.title === 'dsh-new-thing');
    assert.ok(installBtn, '卡片上应该有安装按钮');
    installBtn.props.onClick({ stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 0));
    await mod.__render(render);

    assert.ok(mod.__fetchCalls.includes('/api/dsdesktop/market/install POST'), '前提：确实装了');
    assert.strictEqual(
      mod.__fetchCalls.filter((c) => c.includes('/search?')).length, searchesBefore,
      '装完插件不该再打一次 /search——那会把发现列表整个换掉，滚动位置随之丢失'
    );
    // 但本机状态还是得刷：不然卡片上的「已安装」徽章不会亮。
    assert.ok(
      mod.__fetchCalls.filter((c) => c.endsWith('/installed')).length > installedBefore,
      '装完之后仍然要重读 /installed，否则「已安装」徽章不会更新'
    );
  } finally {
    cleanup();
  }
});

test('从详情返回时把发现列表滚回原处——不然点进去看一眼，回来得从头再滚一遍', async () => {
  // 详情态是把面板正文**整个换成**详情视图，而详情比几十张卡片的列表矮得多，
  // 浏览器会立刻把 scrollTop 夹到新内容的高度上。等返回时列表重新长回来，
  // scrollTop 早就不是原来那个值了。所以必须显式记下来、再显式滚回去。
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render));
    const discoverTabBtn = first.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    discoverTabBtn.props.onClick();

    const onDiscover = flatten(await mod.__render(render));
    const body = onDiscover.find((n) => typeof n.props.className === 'string' && n.props.className.includes('dsmkBody'));
    assert.ok(body && body.props.ref && body.props.ref.current, '正文滚动容器应该挂着 ref');
    const el = body.props.ref.current;

    // 用户往下滚了几屏。
    el.scrollTop = 1200;
    body.props.onScroll({ currentTarget: el });

    // 点开一张卡片的详情。
    const card = onDiscover.find((n) => typeof n.props.className === 'string'
      && n.props.className.includes('dsmkCardDiscover') && typeof n.props.onClick === 'function');
    assert.ok(card, '应该能点开卡片详情');
    card.props.onClick({ stopPropagation() {} });
    const inDetail = flatten(await mod.__render(render));
    const backBtn = inDetail.filter((n) => n.type === 'button')
      .find((b) => typeof b.props.className === 'string' && b.props.className.includes('dsmkBackBtn'));
    assert.ok(backBtn, '详情态应该有「返回」按钮');
    // 真浏览器在这一刻会把 scrollTop 夹到详情那点高度上（基本等于归零）。
    // 假 DOM 不会自己夹，这里手动模拟——不模拟的话 scrollTop 一直是 1200，
    // 这个测试就永远绿，恢复逻辑删掉都测不出来。
    el.scrollTop = 0;

    backBtn.props.onClick();
    await mod.__render(render);
    assert.strictEqual(el.scrollTop, 1200, '从详情返回后应该滚回离开时的位置');
  } finally {
    cleanup();
  }
});

test('发现卡片上「详情」按钮跟点卡片本身效果一样——展开详情，不触发安装', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render));
    const discoverTabBtn = first.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    discoverTabBtn.props.onClick();

    const onDiscover = flatten(await mod.__render(render));
    const detailBtn = onDiscover.filter((n) => n.type === 'button')
      .find((b) => typeof b.props.className === 'string' && b.props.className.includes('dsmkGhostBtn') && b.props.title === 'dsh-new-thing');
    assert.ok(detailBtn, '卡片上应该有一个「详情」按钮');
    assert.ok(detailBtn.props.onClick.toString().includes('stopPropagation'),
      '「详情」按钮也要 stopPropagation，不然点它会被卡片自己的 onClick 重复触发一次展开');
    // 「详情」按钮的处理器必须真的调用跟卡片本身同一个 onToggle——这是「功能和
    // 点击卡片一样」这条要求最直接的落点。不用整套渲染循环去验证最终效果（这个
    // 假 React 的 effect 不认依赖数组、每轮都会重跑，点开详情又会被「切 tab/搜索
    // 条件变了就收起详情」那条 effect 在下一轮误当成条件变化重新收起——这是测试
    // 工具本身的局限，不是真实浏览器里会发生的事，源码检查更可靠）。
    assert.ok(detailBtn.props.onClick.toString().includes('onToggle()'),
      '「详情」按钮点击应该调用 onToggle——跟点卡片本身完全同一个动作');
    detailBtn.props.onClick({ stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(!mod.__fetchCalls.includes('/api/dsdesktop/market/install POST'), '点「详情」不该触发安装');
  } finally {
    cleanup();
  }
});

test('国内镜像开关：默认关，点一下应该乐观翻过去并调用 /settings/save', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render));
    const discoverTabBtn = first.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    assert.ok(discoverTabBtn, '应该有「发现」tab 按钮');
    discoverTabBtn.props.onClick();

    const onDiscover = flatten(await mod.__render(render));
    // 直接靠外层 label 的 title 定位这个开关，比猜 checkbox 在树里第几个稳。
    const mirrorLabel = onDiscover.find((n) => n.type === 'label' && n.props.title === 'market.search.cnMirrorHint');
    assert.ok(mirrorLabel, '应该有「国内镜像」这个开关');
    const mirrorInput = flatten(mirrorLabel).find((n) => n.type === 'input' && n.props.type === 'checkbox');
    assert.ok(mirrorInput, '开关本身（checkbox）应该在');
    assert.strictEqual(mirrorInput.props.checked, false, '默认应该是关着的');

    mirrorInput.props.onChange({ target: { checked: true }, preventDefault() {}, stopPropagation() {} });
    const after = flatten(await mod.__render(render));
    const afterLabel = after.find((n) => n.type === 'label' && n.props.title === 'market.search.cnMirrorHint');
    const afterInput = flatten(afterLabel).find((n) => n.type === 'input' && n.props.type === 'checkbox');
    assert.strictEqual(afterInput.props.checked, true, '点一下应该乐观地立刻翻成开');
    assert.ok(mod.__fetchCalls.includes('/api/dsdesktop/market/settings/save POST'), '应该调用 /settings/save 持久化');
  } finally {
    cleanup();
  }
});

test('国内镜像开关：切换之后应该重新搜索——不然列表还是切换前那个源的旧结果', async () => {
  // 真实反馈：勾选国内镜像之后，「发现」里显示的还是旧结果，得手动改一下搜索词
  // 或者切换 tab 才会刷新。镜像开关本质上是换了整个数据源，切换那一刻就该重新
  // 发起搜索，不该指望用户自己想办法触发刷新。
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render));
    const discoverTabBtn = first.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    discoverTabBtn.props.onClick();
    await mod.__render(render);

    const searchCallsBefore = mod.__fetchCalls.filter((c) => c.includes('/search?')).length;
    assert.ok(searchCallsBefore > 0, '切到发现 tab 应该已经搜过一次，这是下面对比的基线');

    const onDiscover = flatten(await mod.__render(render));
    const mirrorLabel = onDiscover.find((n) => n.type === 'label' && n.props.title === 'market.search.cnMirrorHint');
    const mirrorInput = flatten(mirrorLabel).find((n) => n.type === 'input' && n.props.type === 'checkbox');
    mirrorInput.props.onChange({ target: { checked: true }, preventDefault() {}, stopPropagation() {} });
    await mod.__render(render);

    const searchCallsAfter = mod.__fetchCalls.filter((c) => c.includes('/search?')).length;
    assert.ok(searchCallsAfter > searchCallsBefore, '切换镜像开关之后应该重新发起了一次搜索');
  } finally {
    cleanup();
  }
});

// 这里本来想再加一个用「卡住的 /settings/save」模拟慢网络的测试，直接验证
// 「设置真正落盘前不该抢先用旧源重新搜」。没加成：这个测试用的迷你 React 的
// useEffect 不认依赖数组，__render 内部每一轮都会把所有 effect 重跑一遍，这会让
// /search 的调用次数本身就随渲染轮数疯涨，跟「是否提前用了旧设置」这个信号完全
// 混在一起，测不出真假。这条竞态的修复本身有据可查（onToggleRegistryMirror 的
// 注释、以及跟 runInstall/runUninstall 同款的「先等异步持久化成功、再 setRescan
// 触发刷新」写法），只是没能在这个简化过的测试工具里可靠地钉住。

test('搜索框：没打字时不该有清空按钮，打了字之后点「X」应该一键清空', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render));
    const discoverTabBtn = first.filter((n) => n.type === 'button')
      .find((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.tab.discover'));
    discoverTabBtn.props.onClick();

    const empty = flatten(await mod.__render(render));
    assert.ok(
      !empty.some((n) => typeof n.props.className === 'string' && n.props.className.includes('dsmkSearchClearBtn')),
      '搜索框空着的时候不该出现清空按钮——不占位不占交互'
    );

    const input = empty.find((n) => n.type === 'input' && n.props.className === 'dsmkSearchInput');
    assert.ok(input, '应该有搜索输入框');
    input.props.onChange({ target: { value: 'easytz' }, preventDefault() {}, stopPropagation() {} });

    const typed = flatten(await mod.__render(render));
    const typedInput = typed.find((n) => n.type === 'input' && n.props.className === 'dsmkSearchInput');
    assert.strictEqual(typedInput.props.value, 'easytz', '输入框应该显示打进去的内容');
    const clearBtn = typed.find((n) => n.type === 'button' && typeof n.props.className === 'string' && n.props.className.includes('dsmkSearchClearBtn'));
    assert.ok(clearBtn, '打了字之后应该出现清空按钮');

    clearBtn.props.onClick();
    const cleared = flatten(await mod.__render(render));
    const clearedInput = cleared.find((n) => n.type === 'input' && n.props.className === 'dsmkSearchInput');
    assert.strictEqual(clearedInput.props.value, '', '点「X」应该一键清空输入框');
    assert.ok(
      !cleared.some((n) => typeof n.props.className === 'string' && n.props.className.includes('dsmkSearchClearBtn')),
      '清空之后按钮应该跟着消失'
    );
  } finally {
    cleanup();
  }
});

test('面板不依赖任何桌面外壳注入的全局（换个宿主也得能开）', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    // 把桥摘掉：插件是公开发布的，别人 `dsh plugin add` 装进自己的 dsh 里跑，
    // 那边没有 window.desktop。面板必须照样打得开，「重启应用」按钮不出现而已。
    globalThis.window.desktop = undefined;
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();
    await mod.__render(() => panel({ t, store, updates }));
  } finally {
    cleanup();
  }
});

test('入口按钮排在 Git 与终端之下（order 升序，数字大的在后）', () => {
  try {
    const mod = loadModule();
    let opts = null;
    mod.apply({
      effect: () => () => {},
      locale: { register() {} },
      slots: {
        inject: (key, cb) => { cb(); return () => {}; },
        register: (o) => { if (o.name === 'sidebar.footer.action') opts = o; return () => {}; },
      },
    });
    assert.ok(opts, '应注册 footer 入口');
    // 终端 90 / Git 100 / 市场 110。市场是低频入口，压在天天用的两个下面。
    assert.strictEqual(opts.order, 110);
  } finally {
    cleanup();
  }
});

test('__test__ 导出的行级组件能单独渲染（列表项是最常改的地方）', () => {
  try {
    const mod = loadModule();
    const { InstalledRow, DiscoverRow } = mod.__test__;
    const t = (k) => k;

    // 不可卸载的那种（宿主产品包）：不该出现卸载按钮。
    const builtin = flatten(InstalledRow({
      t, busy: null, action: null, canInstall: true,
      item: { name: '@deepseek-ai/dsh-base', version: '0.1.0', removable: false, canDisable: false, entryIds: [], enabled: true },
      onUninstall() {}, onToggle() {},
    }));
    const labels = builtin.filter((n) => n.type === 'button').map((b) => JSON.stringify(b.props.children));
    assert.ok(!labels.some((l) => l.includes('uninstall')), '内置插件不该给卸载按钮');

    // 可卸载的：卸载是个独立按钮，不和开关挤在一排（实机反馈过的布局问题）。
    const normal = flatten(InstalledRow({
      t, busy: null, action: null, canInstall: true,
      item: { name: 'cost-meter', version: '1.0.0', removable: true, canDisable: true, entryIds: ['cost-meter'], enabled: true },
      onUninstall() {}, onToggle() {},
    }));
    assert.ok(normal.some((n) => n.type === 'button'), '可卸载插件应有按钮');

    // 市场自己现在是这种独特组合：能卸载（removable: true），但不能停用
    // （canDisable: false）——见 lib/index.js 里卸载/停用两份保护名单为什么
    // 不一样。客户端只认这两个字段，不认包名，所以这里直接给这个组合，
    // 断言卸载按钮在、开关不在，两条都要卡住，任一条退化回旧行为都要报红。
    const marketSelf = flatten(InstalledRow({
      t, busy: null, action: null, canInstall: true,
      item: { name: '@easytz/dsh-market', version: '1.0.3', removable: true, canDisable: false, entryIds: ['dsdesktop-market'], enabled: true },
      onUninstall() {}, onToggle() {},
    }));
    const marketLabels = marketSelf.filter((n) => n.type === 'button').map((b) => JSON.stringify(b.props.children));
    assert.ok(marketLabels.some((l) => l.includes('uninstall')), '市场自己现在应该有卸载按钮');
    assert.ok(!marketSelf.some((n) => n.type === 'input' && n.props.type === 'checkbox'), '市场自己不该有停用开关');

    // 展开态才是真正复杂的那条路（详情、截图、安装按钮全在里面），两态都跑一遍。
    for (const expanded of [false, true]) {
      DiscoverRow({
        t, busy: null, action: null, canInstall: true, expanded,
        item: { name: 'x', version: '1.0.0', description: 'd', publisher: 'p', date: '2026-01-01' },
        installedNames: new Set(), profileName: 'web',
        detail: { status: 'ready', data: { name: 'x', version: '1.0.0', installable: true, images: [] } },
        mirror: '', mirrorBusy: false, onEnableMirror() {},
        onToggle() {}, onInstall() {},
      });
    }
  } finally {
    cleanup();
  }
});

test('InstalledRow: 随包分发的插件（spec 是本地 file: 路径）不该把绝对路径糊在用户脸上', () => {
  // 真实反馈：「我自带的几个插件的声明为什么都是路径？」——随应用分发的插件走的
  // 是本地 tgz（file:C:\Users\...\bundled\xxx.tgz），这是刻意的设计（离线能装
  // 回来），但原样显示这条路径，用户会一头雾水以为出了什么问题。应该换成人话，
  // 完整路径退到 title（hover 提示）里。
  try {
    const mod = loadModule();
    const { InstalledRow } = mod.__test__;
    const t = (k) => k;
    const rawPath = 'file:C:/Users/easyx/.dsh/.dsdesktop/bundled/easytz-dsh-git-0.5.0.tgz';

    const bundled = flatten(InstalledRow({
      t, busy: null, action: null, canInstall: true,
      item: { name: '@easytz/dsh-git', version: '0.5.0', installedVersion: '0.5.0', spec: rawPath, removable: true, canDisable: true, entryIds: ['dsdesktop-git'], enabled: true },
      onUninstall() {}, onToggle() {},
    }));
    // 只看每个节点自己**直接**的文本 children（不是整棵子树序列化后的 JSON——
    // 那样会把子孙节点的 title 属性也带进来，测不出「文本内容」和「hover 提示」
    // 这两个完全不同的地方各放了什么）。
    const visibleTexts = bundled.filter((n) => typeof n.props.children === 'string').map((n) => n.props.children);
    assert.ok(!visibleTexts.some((s) => s.includes('file:') || s.includes('C:/Users')),
      '不该把 file: 路径 / 本地文件系统路径原样显示成看得见的文字');
    assert.ok(visibleTexts.includes('market.installed.bundledSpec'), '应该换成人话说明——「随应用分发」这类文案');

    // 完整路径还在，只是退到 title 里（hover 提示），好奇的人还是能看到。
    const specSpan = bundled.find((n) => n.type === 'span' && n.props.children === 'market.installed.bundledSpec');
    assert.ok(specSpan, '应该有一个 span 显示这句人话');
    assert.ok(typeof specSpan.props.title === 'string' && specSpan.props.title.includes('bundled'),
      '这个 span 的 title 属性（hover 提示）应该带着完整路径');

    // 对照组：普通从 npm 装的（spec 是精确版本号），行为不该变——这条路径原来的
    // 显示逻辑必须原封不动，不能因为加了 file: 分支就连带把正常场景也改坏了。
    const normal = flatten(InstalledRow({
      t, busy: null, action: null, canInstall: true,
      item: { name: 'dsh-xueqiu', version: '1.22.13', installedVersion: '1.22.13', spec: '1.22.13', removable: true, canDisable: true, entryIds: ['xueqiu'], enabled: true },
      onUninstall() {}, onToggle() {},
    }));
    assert.ok(normal.some((n) => n.type === 'span' && n.props.children === 'market.installed.spec'),
      '正常场景应该还是原来那条「声明 {s}」的文案（identity t 下 fmt 替换不了 {s}，key 本身原样透出）');
  } finally {
    cleanup();
  }
});

test('ActionResult: 收到 null 时什么都不画——发现 tab 按名字过滤 action 就是靠这个', () => {
  // 真实故障：装/卸一个包失败后，用户点开发现 tab 里的另一张卡片，还没点任何按钮，
  // 就看见「包管理器执行失败」——因为 App 组件里 action 是全局的（服务端一次只跑
  // 一个 pnpm），而 DiscoverDetail 原样把它转给 ActionResult 渲染，不管名字对不对。
  // 修复是在调用 DiscoverDetail 那一处按 `action.name === expanded` 过滤，名字不对
  // 就传 null。这里直接验证 ActionResult 收到 null 确实不产生任何残留提示，
  // 以及收到真是自己的 action 时照常显示——把这个约定钉死，回归就会在这里报红。
  try {
    const mod = loadModule();
    const { ActionResult } = mod.__test__;
    const t = (k) => k;

    assert.strictEqual(ActionResult({ t, action: null }), null, '没有 action 不该画出任何东西');

    const shown = flatten(ActionResult({ t, action: { kind: 'install', name: 'other-pkg', status: 'error', message: 'boom' } }));
    assert.ok(shown.some((n) => n.props && typeof n.props.className === 'string' && n.props.className.includes('dsmkResultErr')),
      '真是自己的 action 时该照常显示错误');
  } finally {
    cleanup();
  }
});

test('网页版没有重启按钮可点，横幅就得改口说「重启 dsh 进程」', async () => {
  // 实机反馈：朋友在 WSL 下用浏览器直连 dsh，装完卸完插件「重启按钮没出来」。
  // 按钮确实出不来——它挂在桌面外壳 preload 注入的 window.desktop.restartApp 上，
  // 浏览器里没有那座桥。但横幅只留一句「重启后生效」而不说重启什么、按钮又不见了，
  // 看起来就是坏了。这里钉住：桥不在时文案要换成能照做的那一句。
  try {
    const { mod, captured, injected, t } = mount();
    globalThis.window.desktop = undefined;
    const panel = captured['shell.overlay:market-panel'];
    const { store, updates } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store, updates });
    const first = flatten(await mod.__render(render))
      .find((n) => n.type === 'input' && n.props.type === 'checkbox' && typeof n.props.onChange === 'function');
    assert.ok(first, '可停用的行上应有开关');
    first.props.onChange({ target: { checked: false }, preventDefault() {}, stopPropagation() {} });
    const after = flatten(await mod.__render(render));

    const texts = after.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(texts.some((x) => x.includes('market.pending.restartWeb')), '网页版横幅应该说清要重启的是 dsh 进程');
    const restart = after.filter((n) => n.type === 'button')
      .some((b) => (JSON.stringify(b.props.children ?? null) ?? '').includes('market.detail.restart'));
    assert.ok(!restart, '没有桌面外壳就没有能点的重启按钮，别画一个点不动的');
  } finally {
    cleanup();
  }
});


/**
 * 把源码里的注释行剔掉、反斜杠转义还原，再拿去匹配 CSS 规则。
 *
 * 这两步都不能省：这几个文件的注释里都写着 `[class*="footerActions"]` 这串选择器
 * （在解释它为什么长这样），只 grep 源码的话，把规则整条删掉、只留注释，测试照样
 * 绿。转义还原是因为规则可能写在双引号字符串里，文件里存的是 \" 而不是 "。
 */
function cssSource(file) {
	return fs.readFileSync(file, "utf8")
		.split("\n")
		.filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
		.join("\n")
		.replace(/\\"/g, '"');
}

test("侧边栏 footer 的纵向排列由本插件自带，不靠别的插件的样式兜底", () => {
  // 实机反馈：只装了市场 + 余额 + 另一个插件的机器上，三个图标挤在同一行。
  // 上游那个容器是 display:flex（默认 row、不换行），原先只有 dsh-terminal-panel
  // 注入了 flex-direction:column —— 装了终端面板的机器看着一切正常，没装的就露馅。
  // 任何一个插件都可能被单独安装，所以这条规则每个 footer 插件都得自带。
	assert.ok(
		/\[class\*="footerActions"\]\{[^}]*flex-direction:column/.test(cssSource(CLIENT)),
		"市场必须自己注入 footerActions 的纵向排列规则"
	);
});

/** 树里所有带这个 className 的节点。角标测试反复要用。 */
function byClass(node, className) {
  return flatten(node).filter((n) => n.props && n.props.className === className);
}

test("已安装插件有新版本时，侧边栏「插件市场」右上角要出一个蓝色小叹号", async () => {
  try {
    const { captured, injected, t } = mount();
    const footer = captured["sidebar.footer.action:market"];
    const { store, updates } = injected.market;

    // 没有更新就**一个点都不该有**。角标常驻（哪怕透明）是最糟的一种：用户会
    // 学会无视它，真有更新那天也看不见。
    assert.strictEqual(byClass(footer({ wide: true, t, store, updates }), "dsmkUpdDot").length, 0);

    await updates.refresh();
    assert.strictEqual(updates.getSnapshot(), 1, "fixture 里只有一个包能升级");

    // 展开态：叹号贴在**文字**的右上角（用户要的就是这个位置），所以它必须落在
    // 包着文字的那层 wrap 里——落进 .dsmkFooterBtnLabel 会被那个元素的
    // overflow:hidden 裁掉半个圆。
    const wide = footer({ wide: true, t, store, updates });
    const dots = byClass(wide, "dsmkUpdDot");
    assert.strictEqual(dots.length, 1, "只该有一个角标");
    // 叹号是画出来的，不是一个「!」字符——字形那一竖在这个尺寸下细到读起来就是
    // 个圆点。守住「角标里装的是图标组件」，免得哪天又被改回字符。
    assert.strictEqual(typeof dots[0].props.children.type, "function", "角标里应该是画出来的图标");
    const labelWrap = byClass(wide, "dsmkFooterBtnLabelWrap")[0];
    assert.ok(labelWrap, "文字要包一层不裁剪的 wrap");
    assert.strictEqual(byClass(labelWrap.props.children, "dsmkUpdDot").length, 1, "展开态角标应贴在文字上");
    assert.strictEqual(byClass(byClass(wide, "dsmkFooterBtnIconWrap")[0].props.children, "dsmkUpdDot").length, 0);

    // 折叠态没有文字可贴，退到图标右上角。
    const narrow = footer({ wide: false, t, store, updates });
    const iconWrap = byClass(narrow, "dsmkFooterBtnIconWrap")[0];
    assert.ok(iconWrap);
    assert.strictEqual(byClass(iconWrap.props.children, "dsmkUpdDot").length, 1, "折叠态角标应贴在图标上");

    // 圆点自己 aria-hidden，说明得从按钮上读得到——否则读屏用户完全不知道有更新。
    assert.strictEqual(dots[0].props["aria-hidden"], "true");
    assert.ok(wide.props["aria-label"].includes("market.updates.hint"));
    assert.strictEqual(wide.props.title, wide.props["aria-label"]);

    updates.set(0);
    assert.strictEqual(byClass(footer({ wide: true, t, store, updates }), "dsmkUpdDot").length, 0, "更新装完角标要消失");
  } finally {
    cleanup();
  }
});

test("角标查不到就保持上一次的数，不能清零——那是在谎报「没有更新」", async () => {
  try {
    const { injected } = mount();
    const { updates } = injected.market;
    updates.set(3);
    const online = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("offline"); };
    try {
      await updates.refresh();
    } finally {
      globalThis.fetch = online;
    }
    assert.strictEqual(updates.getSnapshot(), 3);
  } finally {
    cleanup();
  }
});

test("面板拉完 /installed 之后要顺手把角标对齐，不用等下一轮轮询", async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured["shell.overlay:market-panel"];
    const { store, updates } = injected["market-panel"];
    // 先塞一个明显不对的数：如果面板没有回喂，这个数会原样留着。
    updates.set(9);
    store.toggle();
    await mod.__render(() => panel({ t, store, updates }));
    assert.strictEqual(updates.getSnapshot(), 1, "/installed 里只有一个 updateAvailable");
  } finally {
    cleanup();
  }
});

test("角标轮询挂在 apply 上，插件卸载时要把定时器清掉", () => {
  try {
    const mod = loadModule();
    const disposers = [];
    const ctx = {
      effect: (fn) => { const d = fn(); if (typeof d === "function") disposers.push(d); return () => {}; },
      locale: { register() {} },
      slots: { inject: (key, cb) => { cb(); return () => {}; }, register: () => () => {} },
    };
    mod.apply(ctx);
    // effect 真跑了就一定留下了一个 setInterval —— 不清掉，插件热重载一次就多一路
    // 轮询，几次之后就是在拿 npm registry 当靶子。
    assert.ok(disposers.length > 0, "轮询 effect 应返回一个 teardown");
    for (const dispose of disposers) dispose();
  } finally {
    cleanup();
  }
});
