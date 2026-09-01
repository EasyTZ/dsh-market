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
      return async (url, init) => ({
        ok: true,
        json: async () => {
          fetchCalls.push(String(url) + (init && init.method === 'POST' ? ' POST' : ''));
          if (String(url).endsWith('/profile-plugins/toggle')) {
            const body = JSON.parse(init.body);
            enabledOverrides[body.name] = body.enabled;
            return { ok: true, data: { name: body.name, enabled: body.enabled, entryIds: [] } };
          }
          if (String(url).endsWith('/installed')) {
            const fixture = [
              // 不可卸载的（市场自己）、可卸载的、被停用的，三种行各来一个。
              { name: '@easytz/dsh-market', version: '0.1.0', removable: false, canDisable: false, entryIds: ['dsdesktop-market'], enabled: true },
              // 带一个「有更新」的，好让更新徽章/按钮那条路径也真的跑一遍。
              { name: '@easytz/dsh-git', version: '0.5.0', removable: true, canDisable: true, entryIds: ['dsdesktop-git'], enabled: true, installedVersion: '0.5.0', latestVersion: '0.6.0', updateAvailable: true },
              { name: 'cost-meter', version: '1.0.0', removable: true, canDisable: true, entryIds: ['cost-meter'], enabled: false },
            ];
            const items = fixture.map((item) => (
              item.name in enabledOverrides ? { ...item, enabled: enabledOverrides[item.name] } : item
            ));
            return { ok: true, data: { profileName: 'web', profileDir: 'D:/x/profiles/web', safeMode: false, items } };
          }
          if (String(url).endsWith('/capabilities')) {
            return { ok: true, data: { canInstall: true, busy: false, imageMirror: '' } };
          }
          if (String(url).endsWith('/bundled')) {
            // 一个「随应用分发但当前没装」的，好让那一组也渲染出来。
            return { ok: true, data: { plugins: [{ packageName: '@easytz/dsh-ui-balance', version: '0.5.0', installed: false }] } };
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
    useEffect(fn, deps) { effects.push({ fn, deps }); },
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

    const { store } = injected['market-panel'];
    footer({ t, store });
    // 关着的时候也渲染一次：这条路径要求面板 pointer-events:none，否则关着也挡点击。
    panel({ t, store });

    store.toggle();
    const tree = flatten(await mod.__render(() => panel({ t, store })));

    // **这条断言是这个测试的重点**：光「没抛异常」不够 —— 早退分支（还在 loading）
    // 也不抛。必须确认真的渲染到了那三行插件，否则测试覆盖的还是个空壳。
    const text = JSON.stringify(tree.map((n) => n.props && n.props.children));
    for (const name of ['@easytz/dsh-market', '@easytz/dsh-git', 'cost-meter']) {
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
    const { store } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store });
    // 这里**不能**用 fireAll：它会把关闭按钮和 tab 按钮也一起点了，面板要么关掉、
    // 要么切到「发现」，已安装那棵树根本不再渲染。只点行上的开关。
    const first = flatten(await mod.__render(render))
      .find((n) => n.type === 'input' && n.props.type === 'checkbox' && typeof n.props.onChange === 'function');
    assert.ok(first, '可停用的行上应有开关');
    first.props.onChange({ target: { checked: false }, preventDefault() {}, stopPropagation() {} });
    const after = flatten(await mod.__render(render));

    const texts = after.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(texts.some((x) => x.includes('market.toggle.pending')), '应出现「重启后生效」横幅');
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
    const { store } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store });
    const findToggle = (tree) => tree.find((n) => n.type === 'input' && n.props.type === 'checkbox' && typeof n.props.onChange === 'function');

    const first = findToggle(flatten(await mod.__render(render)));
    assert.ok(first, '可停用的行上应有开关');
    // 关掉
    first.props.onChange({ target: { checked: false }, preventDefault() {}, stopPropagation() {} });
    const afterOff = flatten(await mod.__render(render));
    assert.ok(
      afterOff.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '').some((x) => x.includes('market.toggle.pending')),
      '关掉之后应该先出现横幅——这是下一步的前提'
    );

    // 再开回去：跟内核实际在跑的状态（一开始就是启用）相比，等于没有净改动。
    const second = findToggle(afterOff);
    assert.ok(second, '重新渲染后开关还应该在');
    second.props.onChange({ target: { checked: true }, preventDefault() {}, stopPropagation() {} });
    const afterOn = flatten(await mod.__render(render));

    const texts = afterOn.map((n) => JSON.stringify((n.props && n.props.children) ?? null) ?? '');
    assert.ok(!texts.some((x) => x.includes('market.toggle.pending')), '关了又开等于没变，不该再显示「重启后生效」横幅');
  } finally {
    cleanup();
  }
});

test('已安装的插件有新版本时要给徽章和更新按钮，点了要真的调用 /install', async () => {
  try {
    const { mod, captured, injected, t } = mount();
    const panel = captured['shell.overlay:market-panel'];
    const { store } = injected['market-panel'];
    store.toggle();

    const render = () => panel({ t, store });
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
    const { store } = injected['market-panel'];
    store.toggle();
    await mod.__render(() => panel({ t, store }));
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

    // 不可卸载的那种（市场自己）：不该出现卸载按钮。
    const builtin = flatten(InstalledRow({
      t, busy: null, action: null, canInstall: true,
      item: { name: '@easytz/dsh-market', version: '0.1.0', removable: false, canDisable: false, entryIds: [], enabled: true },
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
