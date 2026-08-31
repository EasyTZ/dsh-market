window.__ModuleLoader__.load({
	id: "@easytz/dsh-market",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		// createPortal：面板要挂到 document.body 才能盖过桌面端自绘的标题栏（那个是
		// z-index:900，而 shell.overlay 那层封顶只有 20）。详见 .dsmkBackdrop 的注释。
		let react_dom = require("react-dom");

		const NS = "market";

		const zh = {
			"market.panel.label": "插件市场",
			"market.panel.close": "关闭",
			"market.panel.refresh": "刷新",
			"market.tab.installed": "已安装",
			"market.tab.discover": "发现",
			"market.search.placeholder": "搜索插件…",
			"market.search.all": "搜索全部 npm",
			"market.search.allHint": "关掉则只搜带 dsh-plugin 关键词的包",
			"market.sort.relevance": "相关度",
			"market.sort.downloads": "周下载量",
			"market.sort.updated": "最近更新",
			"market.sort.label": "排序",
			"market.meta.downloads": "周下载 {n}",
			"market.mirror.failed": "预览图加载不出来 —— 你的网络可能访问不了 GitHub。",
			"market.mirror.enable": "启用镜像重试",
			"market.mirror.enabling": "设置中…",
			"market.mirror.on": "已启用镜像 {host}，图片经它中转。",
			"market.mirror.off": "关闭镜像",
			"market.mirror.hint": "镜像是第三方服务，会知道你在看哪些插件的截图。只在取不到图时才需要它。",
			"market.state.loading": "加载中…",
			"market.state.empty": "没有找到插件",
			"market.state.emptyInstalled": "这个 profile 还没有装任何插件",
			"market.state.error": "加载失败",
			"market.state.retry": "重试",
			"market.result.count": "找到 {n} 个",
			"market.result.more": "只显示前 {n} 个，输入更具体的词缩小范围",
			"market.badge.installed": "已安装",
			"market.badge.tagged": "dsh 插件",
			"market.badge.active": "已激活",
			"market.badge.inactive": "未激活",
			"market.badge.inactiveHint": "装上了但没有 dsh.bundle，不会被加载",
			"market.detail.installable": "可安装",
			"market.detail.reason.no-bundle": "这个包没有声明 dsh.bundle，装了也不会被激活",
			"market.detail.reason.protected": "这是宿主自带的包，不能经市场安装",
			"market.detail.reason.no-version": "npm 上没有可用的正式版本",
			"market.detail.reason.no-manifest": "读不到这个包的信息",
			"market.detail.deprecated": "作者已标记弃用：{msg}",
			"market.detail.deprecatedBare": "作者已标记这个包为弃用",
			"market.detail.license": "协议",
			"market.detail.deps": "依赖",
			"market.detail.depsValue": "{n} 个",
			"market.detail.repo": "仓库",
			"market.detail.homepage": "主页",
			"market.detail.command": "手动安装命令",
			"market.detail.copy": "复制",
			"market.detail.copied": "已复制",
			"market.detail.install": "安装",
			"market.detail.installing": "安装中…",
			"market.detail.installed": "已安装",
			"market.detail.uninstall": "卸载",
			"market.detail.uninstalling": "卸载中…",
			"market.detail.uninstallConfirm": "确认卸载？",
			"market.detail.needRestart": "已装好 {name}@{version}，重启应用后生效",
			"market.detail.removed": "已卸载 {name}，重启应用后生效",
			"market.detail.restart": "重启应用",
			"market.detail.restartManual": "请手动重启应用以生效",
			"market.detail.drifted": "作者在你浏览期间发布了新版本，实际装的是 {version}",
			"market.detail.busy": "已有一个安装/卸载正在进行",
			"market.detail.cannotInstall": "当前环境无法一键安装，请用下面的命令",
			"market.detail.manual": "手动安装命令",
			"market.detail.failed": "操作失败",
			"market.detail.loading": "读取详情…",
			"market.installed.version": "版本 {v}",
			"market.installed.spec": "声明 {s}",
			"market.installed.range": "声明的是范围，下次安装可能漂到新版本",
			"market.footer.profile": "profile：{name}",
			"market.group.bundled": "随应用分发",
			"market.group.builtin": "桌面自带",
			"market.group.builtinHint": "桌面版内置，无法卸载",
			"market.toggle.label": "停用 / 启用 {name}",
			"market.badge.disabled": "已停用",
			"market.toggle.pending": "有 {n} 项停用/启用改动，重启后生效",
			"market.toggle.failed": "操作失败：{msg}",
			"market.group.bundledHint": "装在发行包里，可以随时卸载；卸了也能从这里装回来",
			"market.bundled.reinstall": "装回来",
			"market.bundled.reinstalling": "安装中…",
			"market.bundled.removed": "已卸载",
			"market.bundled.required": "必备",
			"market.bundled.requiredHint": "插件市场自己，卸载了就没有管理插件的入口了",
			"market.group.profile": "从市场安装",
			"market.safeMode": "安全模式：本次启动跳过了插件市场以外的全部插件。把可疑插件停用或卸载后重启即可恢复正常启动。"
		};
		const en = {
			"market.panel.label": "Plugin Market",
			"market.panel.close": "Close",
			"market.panel.refresh": "Refresh",
			"market.tab.installed": "Installed",
			"market.tab.discover": "Discover",
			"market.search.placeholder": "Search plugins…",
			"market.search.all": "Search all of npm",
			"market.search.allHint": "Off means only packages keyworded dsh-plugin",
			"market.sort.relevance": "Relevance",
			"market.sort.downloads": "Downloads",
			"market.sort.updated": "Recently updated",
			"market.sort.label": "Sort",
			"market.meta.downloads": "{n}/week",
			"market.mirror.failed": "Preview images failed to load — your network may not reach GitHub.",
			"market.mirror.enable": "Enable mirror and retry",
			"market.mirror.enabling": "Saving…",
			"market.mirror.on": "Mirror {host} is on; images are fetched through it.",
			"market.mirror.off": "Turn mirror off",
			"market.mirror.hint": "A mirror is a third-party service and will learn which plugin screenshots you view. You only need it when images cannot load.",
			"market.state.loading": "Loading…",
			"market.state.empty": "No plugins found",
			"market.state.emptyInstalled": "No plugins installed in this profile yet",
			"market.state.error": "Failed to load",
			"market.state.retry": "Retry",
			"market.result.count": "{n} found",
			"market.result.more": "Showing the first {n} — narrow the search to see fewer",
			"market.badge.installed": "Installed",
			"market.badge.tagged": "dsh plugin",
			"market.badge.active": "Active",
			"market.badge.inactive": "Inactive",
			"market.badge.inactiveHint": "Installed but declares no dsh.bundle, so it never loads",
			"market.detail.installable": "Installable",
			"market.detail.reason.no-bundle": "This package declares no dsh.bundle — installing it would never activate anything",
			"market.detail.reason.protected": "A host package; not installable from the market",
			"market.detail.reason.no-version": "No usable release on npm",
			"market.detail.reason.no-manifest": "Could not read this package's manifest",
			"market.detail.deprecated": "Deprecated by its author: {msg}",
			"market.detail.deprecatedBare": "Deprecated by its author",
			"market.detail.license": "License",
			"market.detail.deps": "Dependencies",
			"market.detail.depsValue": "{n}",
			"market.detail.repo": "Repository",
			"market.detail.homepage": "Homepage",
			"market.detail.command": "Manual install command",
			"market.detail.copy": "Copy",
			"market.detail.copied": "Copied",
			"market.detail.install": "Install",
			"market.detail.installing": "Installing…",
			"market.detail.installed": "Installed",
			"market.detail.uninstall": "Uninstall",
			"market.detail.uninstalling": "Uninstalling…",
			"market.detail.uninstallConfirm": "Confirm uninstall?",
			"market.detail.needRestart": "Installed {name}@{version} — restart the app to load it",
			"market.detail.removed": "Removed {name} — restart the app to apply",
			"market.detail.restart": "Restart app",
			"market.detail.restartManual": "Restart the app manually to apply",
			"market.detail.drifted": "The author published a newer version while you were browsing — {version} was installed",
			"market.detail.busy": "An install/uninstall is already running",
			"market.detail.cannotInstall": "One-click install is unavailable here — use the command below",
			"market.detail.manual": "Manual install command",
			"market.detail.failed": "Operation failed",
			"market.detail.loading": "Loading details…",
			"market.installed.version": "version {v}",
			"market.installed.spec": "declared {s}",
			"market.installed.range": "A range was declared — a later install may drift to a newer version",
			"market.footer.profile": "profile: {name}",
			"market.group.bundled": "Ships with the app",
			"market.group.builtin": "Built in",
			"market.group.builtinHint": "Ships with the desktop app; cannot be uninstalled",
			"market.toggle.label": "Enable / disable {name}",
			"market.badge.disabled": "Disabled",
			"market.toggle.pending": "{n} enable/disable change(s) — restart to apply",
			"market.toggle.failed": "Failed: {msg}",
			"market.group.bundledHint": "Included in the release; removable any time, and restorable from here",
			"market.bundled.reinstall": "Reinstall",
			"market.bundled.reinstalling": "Installing…",
			"market.bundled.removed": "Removed",
			"market.bundled.required": "Required",
			"market.bundled.requiredHint": "The market itself — removing it would leave no way to manage plugins",
			"market.group.profile": "Installed from the market",
			"market.safeMode": "Safe mode: every plugin except the market was skipped this time. Disable or uninstall the suspect one, then restart."
		};

		//#region 样式
		// 颜色全部走 dsh 的设计 token（--dsw-alias-* / --dsw-specific-*），浅色深色都不露馅；
		// 兜底值取自已验证可用的深色主题实测色，变量取不到也不会露出色差。
		// 几何形状刻意和同作者的 Git 面板对齐（同宽同圆角同阴影），两个面板并排打开时
		// 读起来是同一个应用的两块，而不是两个插件各画各的。
		const css = [
			// **必须有这条**：dsh 的前端没有全局 `* { box-sizing: border-box }`（查过它的
			// 打包 CSS，只有个别组件自己声明）。而本文件里多处是 `width:100%` + 横向
			// padding —— content-box 下那就是「比容器宽 16px」，元素整体溢出右侧，
			// 右对齐的卸载按钮和开关会被推到滚动条底下。第一版误判成滚动条占位问题、
			// 用 scrollbar-gutter 去修，没用：溢出的元素不受容器 gutter 约束。
			// 用属性选择器一次覆盖我们所有的类，免得以后新增一条 width:100% 又踩一遍。
			'[class^="dsmk"],[class*=" dsmk"]{box-sizing:border-box}',
			".dsmkFooterBtn{display:inline-flex;align-items:center;gap:8px;width:100%;height:32px;padding:0 8px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);cursor:pointer;font-size:13px;font-family:inherit;transition:background .15s ease,color .15s ease}",
			".dsmkFooterBtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkFooterBtnActive{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkFooterBtn svg{flex:none;display:block}",
			".dsmkFooterBtnLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			// 遮罩与面板的 z-index 必须站到 1000 这一档——这是 dsh 内置弹窗遮罩用的层级，
			// 不是随手取的大数。桌面端（dsDesktop）自绘的标题栏是 z-index:900，它最左段
			// 专门用 --dsw-specific-sidebar-fill 跟侧边栏拼同一种底色。挂在 shell.overlay
			// 里那层是 layout 包的 .overlayLayer{z-index:20}，遮罩最多压到 20，压不过 900：
			// 结果是侧边栏被压暗、标题栏左段纹丝不动，接缝处直接露出色差。所以面板与遮罩
			// 一起 createPortal 到 document.body，跳出那个层叠上下文再用 1000/1001。
			".dsmkBackdrop{position:fixed;inset:0;z-index:1000;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.32));opacity:0;pointer-events:none;transition:opacity .16s ease}",
			".dsmkBackdrop.dsmkOpen{opacity:1;pointer-events:auto}",
			// 面板比 Git 面板宽一点（460 vs 420）：这里一行要放下包名、版本、徽章，
			// 描述还要能看出个大概，420 会让每一行都在省略号里结束。
			".dsmkPanel{position:fixed;top:50%;right:20px;z-index:1001;width:460px;max-width:94vw;height:min(780px,88vh);display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,#1b1b1c);border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.32);color:var(--dsw-alias-label-primary,#f9fafb);font-size:13px;overflow:hidden;" +
			"opacity:0;pointer-events:none;transform:translateY(-50%) translateX(12px) scale(.98);transition:opacity .16s ease,transform .16s ease}",
			".dsmkPanel.dsmkOpen{opacity:1;pointer-events:auto;transform:translateY(-50%) translateX(0) scale(1)}",
			".dsmkHeader{flex:none;display:flex;align-items:center;gap:6px;padding:12px 14px 10px}",
			".dsmkHeaderTitle{font-weight:600;font-size:14px;margin-right:auto}",
			".dsmkIconBtn{flex:none;width:26px;height:26px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s ease,color .15s ease}",
			".dsmkIconBtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkIconBtn:disabled{opacity:.5;cursor:default}",
			// 分段控件（已安装 / 发现）。用一整块底色 + 选中项实心，比两个下划线 tab
			// 更容易一眼看出「现在在哪一边」，也不需要额外的分隔线。
			".dsmkTabs{flex:none;display:flex;gap:2px;margin:0 14px 10px;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-1,#151517)}",
			".dsmkTab{flex:1;height:28px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:12.5px;font-family:inherit;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:background .15s ease,color .15s ease}",
			".dsmkTab:hover{color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkTabActive{background:var(--dsw-specific-input-major,#2c2c2e);color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkTabCount{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e);font-variant-numeric:tabular-nums}",
			".dsmkTabActive .dsmkTabCount{color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			// 搜索区
			".dsmkSearch{flex:none;padding:0 14px 8px}",
			".dsmkSearchBox{display:flex;align-items:center;gap:8px;height:32px;padding:0 10px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:var(--dsw-specific-input-major,#2c2c2e);transition:border-color .15s ease}",
			".dsmkSearchBox:focus-within{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}",
			".dsmkSearchBox svg{flex:none;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkSearchInput{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--dsw-alias-label-primary,#f9fafb);font-size:12.5px;font-family:inherit}",
			".dsmkSearchInput::placeholder{color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkSearchMeta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			// 「搜索全部 npm」开关：整行可点（label 包着 input），不是只有那个小方块可点。
			".dsmkToggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;white-space:nowrap}",
			".dsmkToggle input{margin:0;accent-color:var(--dsw-alias-brand-primary,#4d6bfe);cursor:pointer}",
			// 排序：原生 select。这里刻意不像 Git 面板那样自绘——那边自绘是因为分支
			// 下拉要跟一行文字混排、还要显示当前项高亮；这里只是三个固定选项，原生
			// 控件的键盘行为和无障碍是白拿的，没有理由重新实现一遍。
			".dsmkSortSelect{height:22px;padding:0 4px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:11.5px;font-family:inherit;cursor:pointer}",
			".dsmkSortSelect:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}",
			".dsmkSortSelect:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}",
			// option 在部分平台不继承容器配色，显式给一次，避免深色主题下白底白字。
			".dsmkSortSelect option{background:var(--dsw-specific-menu,#353638);color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkDownloads{font-variant-numeric:tabular-nums}",
			// 列表
			// scrollbar-gutter:stable —— 滚动条是画在 padding 区里、盖在内容右缘上的，
			// 而「已安装」那一行的卸载按钮正好贴着右缘，于是被压住一半。留出固定的
			// gutter 让内容整体左移，比给每一行单独加右边距可靠（有没有滚动条都一致）。
			".dsmkBody{flex:1;min-height:0;overflow-y:auto;padding:2px 8px 14px;scrollbar-gutter:stable}",
			// 顺带把滚动条本身收细，跟 dsh 自己的列表观感一致。
			".dsmkBody::-webkit-scrollbar{width:8px}",
			".dsmkBody::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2,rgba(255,255,255,.16));border-radius:999px}",
			".dsmkBody::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-bg-l3,rgba(255,255,255,.26))}",
			".dsmkBody::-webkit-scrollbar-track{background:transparent}",
			".dsmkRow{border-radius:10px;transition:background .15s ease}",
			".dsmkRow+.dsmkRow{margin-top:2px}",
			".dsmkRowHead{width:100%;display:flex;align-items:flex-start;gap:10px;padding:9px 8px;border:none;border-radius:10px;background:transparent;color:inherit;font-family:inherit;font-size:13px;text-align:left;cursor:pointer}",
			".dsmkRow:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.05))}",
			".dsmkRowOpen{background:var(--dsw-alias-bg-layer-1,#151517)}",
			".dsmkRowOpen:hover{background:var(--dsw-alias-bg-layer-1,#151517)}",
			".dsmkRowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}",
			".dsmkRowTitle{display:flex;align-items:center;gap:6px;min-width:0}",
			".dsmkRowName{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsmkRowVersion{flex:none;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b949e);font-variant-numeric:tabular-nums}",
			// 描述两行截断：一行太少（很多插件描述前半句都是套话），三行会让列表
			// 一屏放不下几个。-webkit-line-clamp 在 Electron 里是稳的。
			".dsmkRowDesc{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#cfd3d6);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
			".dsmkRowMeta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkRowChevron{flex:none;margin-top:2px;color:var(--dsw-alias-label-tertiary,#8b949e);transition:transform .16s ease}",
			".dsmkRowChevronOpen{transform:rotate(90deg)}",
			// 徽章
			".dsmkBadge{flex:none;display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 7px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.01em;white-space:nowrap}",
			".dsmkBadgeOk{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#3fb950) 16%,transparent);color:var(--dsw-alias-state-success-primary,#3fb950)}",
			".dsmkBadgeMuted{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkBadgeWarn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e3a008) 16%,transparent);color:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".dsmkBadgeBrand{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d6bfe) 16%,transparent);color:var(--dsw-alias-brand-primary,#4d6bfe)}",
			// 展开区
			".dsmkDetail{padding:2px 10px 12px;display:flex;flex-direction:column;gap:10px}",
			".dsmkDetailNote{font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			".dsmkDetailWarn{color:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".dsmkDetailErr{color:var(--dsw-alias-state-error-primary,#f0617a)}",
			".dsmkFacts{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:12px;align-items:baseline}",
			".dsmkFactKey{color:var(--dsw-alias-label-tertiary,#8b949e);white-space:nowrap}",
			".dsmkFactValue{min-width:0;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			".dsmkLink{color:var(--dsw-alias-brand-primary,#4d6bfe);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;max-width:100%;vertical-align:bottom}",
			".dsmkLink:hover{text-decoration:underline}",
			".dsmkChips{display:flex;flex-wrap:wrap;gap:4px}",
			// 截图条：横向滚动而不是换行铺开。插件截图多是宽图，铺开会把详情区撑得
			// 老长，把下面的安装按钮挤出视野——而那才是用户看完截图要点的东西。
			".dsmkShots{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}",
			".dsmkMirrorBox{display:flex;flex-direction:column;gap:6px;padding:9px 11px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,#151517);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			".dsmkMirrorHint{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkShot{flex:none;height:110px;width:auto;max-width:100%;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:var(--dsw-alias-bg-layer-1,#151517);object-fit:contain;cursor:zoom-in}",
			// 放大查看：又一个铺满视口的层，所以同样要站在 1000 这一档之上（面板本身
			// 是 1001，它得压过面板）。
			".dsmkLightbox{position:fixed;inset:0;z-index:1002;display:grid;place-items:center;padding:40px;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.6));cursor:zoom-out}",
			".dsmkLightbox img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.45)}",
			".dsmkChip{height:18px;padding:0 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));color:var(--dsw-alias-label-tertiary,#8b949e);font-size:10.5px;display:inline-flex;align-items:center}",
			// 命令行：等宽字体 + 可横向滚动。别让它换行——命令被折成两行之后，
			// 用户复制粘贴时经常会漏掉后半截。
			".dsmkCommand{display:flex;align-items:stretch;gap:0;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:var(--dsw-alias-bg-layer-1,#151517);overflow:hidden}",
			".dsmkCommandText{flex:1;min-width:0;padding:7px 9px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-secondary,#cfd3d6);overflow-x:auto;white-space:nowrap}",
			".dsmkCopyBtn{flex:none;padding:0 10px;border:none;border-left:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:11.5px;font-family:inherit;cursor:pointer;transition:background .15s ease,color .15s ease}",
			".dsmkCopyBtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkCopyBtnDone{color:var(--dsw-alias-state-success-primary,#3fb950)}",
			// 动作区：主按钮（安装）+ 次要按钮（重启/卸载）。安装是这个面板的主要动作，
			// 给它品牌色实心；卸载是破坏性的，静置时低调、进入确认态才变红。
			".dsmkActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
			".dsmkPrimaryBtn{height:28px;padding:0 14px;border:none;border-radius:8px;background:var(--dsw-alias-button-primary-fill,#4d6bfe);color:var(--dsw-alias-label-primary-inverted,#fff);font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s ease,opacity .15s ease}",
			".dsmkPrimaryBtn:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#5a77ff)}",
			".dsmkPrimaryBtn:disabled{opacity:.55;cursor:default}",
			".dsmkGhostBtn{height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#f9fafb);font-size:12.5px;font-family:inherit;cursor:pointer;transition:background .15s ease}",
			".dsmkGhostBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}",
			".dsmkGhostBtn:disabled{opacity:.55;cursor:default}",
			// 卸载是实体按钮（有边框），不是「看起来像文字的东西」：它和上面那个开关是
			// 两种不同性质的动作，长得像会让人以为它们是一组的。静置时中性描边，进入
			// 确认态才变红——红色留给「下一次点击真的会删」那一刻。
			".dsmkDangerBtn{height:28px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:12.5px;font-family:inherit;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}",
			".dsmkDangerBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb);border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.2))}",
			".dsmkDangerBtnArmed{background:var(--dsw-alias-state-error-primary,#f0617a);color:var(--dsw-alias-label-primary-inverted,#fff);border-color:var(--dsw-alias-state-error-primary,#f0617a)}",
			// 动作行：和内容分开的一行，按钮右对齐。上面那行放开关（状态），这行放卸载
			// （破坏性动作）——两者性质不同，不该并排。
			".dsmkRowFooter{display:flex;justify-content:flex-end;padding:0 8px 9px}",
			".dsmkDangerBtnArmed:hover:not(:disabled){background:var(--dsw-alias-state-error-primary,#f0617a);color:var(--dsw-alias-label-primary-inverted,#fff)}",
			".dsmkDangerBtn:disabled{opacity:.55;cursor:default}",
			".dsmkResult{font-size:12px;line-height:1.55}",
			".dsmkResultOk{color:var(--dsw-alias-state-success-primary,#3fb950)}",
			".dsmkResultErr{color:var(--dsw-alias-state-error-primary,#f0617a)}",
			// 失败时把包管理器的原始输出摊出来。「操作失败」四个字对排查毫无帮助，
			// 真实原因（网络、权限、peer 冲突）都写在 pnpm 输出的末尾。
			".dsmkOutput{margin:0;padding:8px 9px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,#151517);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#8b949e);max-height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word}",
			".dsmkRowActions{flex:none;display:flex;align-items:center;gap:6px;margin-left:auto;padding-left:8px}",
			// 分组标题：已安装 tab 分「桌面自带」与「从市场安装」两组，两组的可操作性
			// 完全不同（一个只能开关、一个只能卸载），不分开会让用户以为自带的也能卸。
			".dsmkGroup{margin-top:6px}",
			".dsmkGroup:first-child{margin-top:0}",
			".dsmkGroupTitle{display:flex;align-items:baseline;gap:8px;padding:8px 8px 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkGroupHint{text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsmkPending{margin:2px 8px 6px;font-size:11.5px;color:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".dsmkSafeMode{margin:0 8px 8px;padding:9px 11px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,#151517);border:1px solid var(--dsw-alias-state-warn-primary,#e3a008);color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:12px;line-height:1.55}",
			// 开关。原生 checkbox 撑不起这个观感，但**不能丢掉那个真 input**——键盘可达
			// 与屏幕阅读器全靠它，所以是把它铺满、透明地盖在轨道上，而不是换成 div。
			//
			// 滑块用**真实元素**而不是 `::after` 伪元素：第一版用伪元素，实际渲染出来
			// 只有一条底色、小圆点根本不出现（CSS 本身语法是对的，dump 出来验过），
			// 在这套 inline-flex + 绝对定位 input 的结构里不值得继续排查——真实元素
			// 没有任何不确定性，代价只是多一个 span。
			//
			// 颜色**开是绿、关是灰**，而不是品牌蓝：这个开关的语义是「这插件现在开着
			// 吗」，是状态而非选中，绿/灰比蓝/灰更直觉；而且万一滑块又出问题，光凭
			// 底色也能分辨开关状态，不至于像第一版那样完全看不出来。
			".dsmkSwitch{flex:none;position:relative;display:inline-flex;align-items:center;width:34px;height:20px;cursor:pointer}",
			".dsmkSwitch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}",
			".dsmkSwitchTrack{position:relative;display:block;width:34px;height:20px;border-radius:999px;background:var(--dsw-alias-label-tertiary,#8b949e);transition:background .16s ease;pointer-events:none}",
			".dsmkSwitchKnob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .16s ease;pointer-events:none}",
			".dsmkSwitch input:checked+.dsmkSwitchTrack{background:var(--dsw-alias-state-success-primary,#3fb950)}",
			".dsmkSwitch input:checked+.dsmkSwitchTrack>.dsmkSwitchKnob{transform:translateX(14px)}",
			".dsmkSwitch input:focus-visible+.dsmkSwitchTrack{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:2px}",
			".dsmkSwitch input:disabled{cursor:default}",
			".dsmkSwitch input:disabled+.dsmkSwitchTrack{opacity:.45}",
			// 空 / 错误 / 加载
			".dsmkNotice{padding:18px 12px;text-align:center;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkNoticeErr{color:var(--dsw-alias-state-error-primary,#f0617a)}",
			".dsmkRetry{margin-top:8px;height:26px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary,#f9fafb);font-size:12px;font-family:inherit;cursor:pointer}",
			".dsmkRetry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}",
			// 底部一行：显示当前 profile。装到哪儿去了是这个面板最该说清楚的一件事。
			".dsmkFooter{flex:none;padding:8px 14px 12px;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e);border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.06));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
		].join("");
		const tagId = "dsh-market/panel.css";
		if (typeof document !== "undefined") {
			// 已经有这个标签时**改内容**，而不是跳过。
			//
			// 跳过是常见写法（同作者其它插件就是这么写的），但它让 CSS 完全不能热重载：
			// dsh 的 client-hmr 重载插件时只会 invalidate JS 模块并重新执行 factory，
			// **不会清掉之前注入的 style 标签**（模块系统把 styles 记在 loadCache 里，
			// invalidate 只删记录、不动 DOM）。于是 factory 再跑一次时发现标签还在、
			// 直接跳过，页面上留着的还是旧样式——改了半天没反应，很容易误判成「样式没写对」。
			const existing = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]");
			if (existing !== null) {
				existing.textContent = css;
			} else {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-market";
				tag.dataset.pluginCss = tagId;
				tag.textContent = css;
				document.head.appendChild(tag);
			}
		}
		//#endregion

		//#region 共享的开关状态（footer 按钮与浮层面板之间唯一的耦合）
		// 两个槽各自独立注册，唯一要同步的是「面板开没开」，用最小的手写 store +
		// useSyncExternalStore 代替额外状态管理库——跟 dsh 内部同一个模式。
		function createOpenStore() {
			let open = false;
			const listeners = new Set();
			const notify = () => listeners.forEach((fn) => fn());
			return {
				getSnapshot: () => open,
				subscribe: (fn) => {
					listeners.add(fn);
					return () => listeners.delete(fn);
				},
				toggle: () => { open = !open; notify(); },
				close: () => { if (open) { open = false; notify(); } }
			};
		}
		//#endregion

		//#region 小图标
		function svg(children, size, extra) {
			return react_jsx_runtime.jsx("svg", Object.assign({
				viewBox: "0 0 24 24", width: size, height: size, fill: "none",
				stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
				children
			}, extra || {}));
		}
		function MarketIcon({ size }) {
			// 一个小店铺/货架的形：雨棚 + 箱体。和终端的方块、Git 的分支图都不撞。
			return svg([
				react_jsx_runtime.jsx("path", { d: "M3 9h18l-1.2-4.2A1.5 1.5 0 0 0 18.35 3.6H5.65A1.5 1.5 0 0 0 4.2 4.8Z" }, "a"),
				react_jsx_runtime.jsx("path", { d: "M5 9v10.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V9" }, "b"),
				react_jsx_runtime.jsx("path", { d: "M9.5 21v-5.5h5V21" }, "c")
			], size);
		}
		function SearchIcon({ size }) {
			return svg([
				react_jsx_runtime.jsx("circle", { cx: "11", cy: "11", r: "7" }, "a"),
				react_jsx_runtime.jsx("path", { d: "m20 20-3.6-3.6" }, "b")
			], size);
		}
		function ChevronIcon({ size }) {
			return svg(react_jsx_runtime.jsx("path", { d: "m9 6 6 6-6 6" }), size);
		}
		function RefreshIcon({ size }) {
			return svg([
				react_jsx_runtime.jsx("path", { d: "M21 12a9 9 0 1 1-2.64-6.36" }, "a"),
				react_jsx_runtime.jsx("path", { d: "M21 3v6h-6" }, "b")
			], size || 15);
		}
		function CloseIcon({ size }) {
			return svg([
				react_jsx_runtime.jsx("path", { d: "m6 6 12 12" }, "a"),
				react_jsx_runtime.jsx("path", { d: "M18 6 6 18" }, "b")
			], size || 15);
		}
		//#endregion

		//#region 小工具
		async function getJson(url) {
			const res = await fetch(url);
			return res.json();
		}
		async function postJson(url, body) {
			const res = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
			return res.json();
		}
		/** 桌面外壳有没有给我们「重启应用」的入口（preload 注入的薄桥，网页版没有）。 */
		function restartAvailable() {
			return typeof window !== "undefined" && window.desktop && typeof window.desktop.restartApp === "function";
		}
		/** 极简插值：`{n}` → 值。locale 包不提供插值，这里自己来。 */
		function fmt(text, values) {
			return String(text).replace(/\{(\w+)\}/g, (whole, key) => (
				Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole
			));
		}
		/**
		 * 12345 → `1.2万`。列表上精确到个位没有意义，还占宽度。
		 * 只做中文档位（万/亿）：面板文案本来就以中文为主，英文界面下显示 `1.2万`
		 * 比显示一串裸数字更糟，所以英文走 k/M。
		 */
		function formatDownloads(value, locale) {
			if (!Number.isFinite(value)) return "";
			const zh = locale !== "en";
			if (zh) {
				if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`;
				if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
				return String(value);
			}
			if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
			if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
			return String(value);
		}
		/** ISO 时间 → `2026-08-31`。列表上只要看个新旧，精确到分钟没意义。 */
		function shortDate(iso) {
			return typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : "";
		}
		/** 记住上次停在哪个 tab。localStorage 在隐私模式下会抛，读写都得包 try。 */
		const TAB_KEY = "dsmk:tab";
		function readTab() {
			try {
				const stored = localStorage.getItem(TAB_KEY);
				return stored === "discover" || stored === "installed" ? stored : "installed";
			} catch { return "installed"; }
		}
		function storeTab(tab) {
			try { localStorage.setItem(TAB_KEY, tab); } catch { /* 忽略 */ }
		}
		const SORT_KEY = "dsmk:sort";
		const SORT_VALUES = ["relevance", "downloads", "updated"];
		function readSort() {
			try {
				const stored = localStorage.getItem(SORT_KEY);
				return SORT_VALUES.includes(stored) ? stored : "relevance";
			} catch { return "relevance"; }
		}
		function storeSort(value) {
			try { localStorage.setItem(SORT_KEY, value); } catch { /* 忽略 */ }
		}
		//#endregion

		//#region 展示组件
		function Badge({ kind, children, title }) {
			return react_jsx_runtime.jsx("span", {
				className: "dsmkBadge dsmkBadge" + kind,
				title: title || undefined,
				children
			});
		}

		function Notice({ kind, children }) {
			return react_jsx_runtime.jsx("div", {
				className: "dsmkNotice" + (kind === "error" ? " dsmkNoticeErr" : ""),
				children
			});
		}

		/** 详情里的「事实表」：左键右值，值可能是链接。 */
		function Facts({ rows }) {
			const visible = rows.filter((row) => row && row.value !== null && row.value !== undefined && row.value !== "");
			if (visible.length === 0) return null;
			return react_jsx_runtime.jsx("div", { className: "dsmkFacts", children: visible.flatMap((row) => [
				react_jsx_runtime.jsx("span", { className: "dsmkFactKey", children: row.key }, row.key + ":k"),
				react_jsx_runtime.jsx("span", { className: "dsmkFactValue", children: row.href
					? react_jsx_runtime.jsx("a", { className: "dsmkLink", href: row.href, target: "_blank", rel: "noreferrer noopener", children: row.value })
					: row.value }, row.key + ":v")
			]) });
		}

		/**
		 * 手动安装命令 + 复制按钮。
		 *
		 * 这一步（一键安装还没做）它是主路径；一键安装做出来之后它仍然留着——参考实现
		 * 也保留了这条：pnpm 失败时用户需要一条能自己在终端里跑的确切命令，而不是一个
		 * 只会再失败一次的按钮。命令里的版本号是详情接口给的精确版本，不是范围。
		 */
		function CommandBox({ t, command }) {
			const [copied, setCopied] = react.useState(false);
			react.useEffect(() => {
				if (!copied) return undefined;
				const timer = setTimeout(() => setCopied(false), 1600);
				return () => clearTimeout(timer);
			}, [copied]);
			const onCopy = react.useCallback(() => {
				// clipboard API 在非安全上下文/无权限时会 reject，别让它冒泡成未处理错误。
				try {
					navigator.clipboard.writeText(command).then(() => setCopied(true), () => {});
				} catch { /* 忽略 */ }
			}, [command]);
			return react_jsx_runtime.jsxs("div", { className: "dsmkCommand", children: [
				react_jsx_runtime.jsx("code", { className: "dsmkCommandText", children: command }),
				react_jsx_runtime.jsx("button", {
					type: "button",
					className: "dsmkCopyBtn" + (copied ? " dsmkCopyBtnDone" : ""),
					onClick: onCopy,
					children: copied ? t("market.detail.copied") : t("market.detail.copy")
				})
			] });
		}

		/**
		 * 一次安装/卸载的结果条。成功时给「重启应用」——装好的插件要下次内核启动才被
		 * 加载，不说这句用户会以为没生效；失败时把包管理器的原始输出摊出来。
		 */
		function ActionResult({ t, action }) {
			if (!action || action.status === "running") return null;
			if (action.status === "ok") {
				return react_jsx_runtime.jsxs("div", { className: "dsmkActions", children: [
					react_jsx_runtime.jsx("span", { className: "dsmkResult dsmkResultOk", children: action.message }),
					restartAvailable()
						? react_jsx_runtime.jsx("button", { type: "button", className: "dsmkGhostBtn", onClick: () => window.desktop.restartApp(), children: t("market.detail.restart") })
						: react_jsx_runtime.jsx("span", { className: "dsmkResult", children: t("market.detail.restartManual") })
				] });
			}
			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
				react_jsx_runtime.jsx("div", { className: "dsmkResult dsmkResultErr", children: action.message }),
				action.output ? react_jsx_runtime.jsx("pre", { className: "dsmkOutput", children: action.output }) : null
			] });
		}

		/**
		 * 截图条 + 点开放大。
		 *
		 * src 全是我们自己的代理地址（`/api/dsdesktop/market/image?...`），浏览器不会
		 * 直连 README 里写的任何主机——那是第三方可控内容。加载失败的图直接从 DOM 里
		 * 摘掉（onError 置隐），而不是留一个破图图标：README 里链到已删除文件的情况很常见。
		 */
		function Shots({ t, images, mirror, onEnableMirror, mirrorBusy }) {
			const [broken, setBroken] = react.useState({});
			const [zoomed, setZoomed] = react.useState(null);
			// 换了镜像之后要让浏览器重新取一遍：src 一样的话它会直接用缓存里的失败结果。
			// 用一个随 mirror 变化的 query 串把缓存打掉。
			const bust = mirror ? `&m=${encodeURIComponent(mirror)}` : "";
			react.useEffect(() => { setBroken({}); }, [mirror]);
			react.useEffect(() => {
				if (zoomed === null) return undefined;
				const onKeyDown = (e) => { if (e.key === "Escape") setZoomed(null); };
				document.addEventListener("keydown", onKeyDown);
				return () => document.removeEventListener("keydown", onKeyDown);
			}, [zoomed]);
			const visible = images.filter((image) => !broken[image.src]);
			// 一张都加载不出来时，八成不是这个插件没图，而是网络到不了 GitHub。这时候
			// 与其留一片空白，不如把原因和解法直接摆出来——这是那个「镜像」设置唯一
			// 需要出现的时机，不必为它单开一个设置页。
			if (visible.length === 0) {
				if (mirror || images.length === 0) return null;
				return react_jsx_runtime.jsxs("div", { className: "dsmkMirrorBox", children: [
					react_jsx_runtime.jsx("span", { children: t("market.mirror.failed") }),
					react_jsx_runtime.jsx("span", { className: "dsmkMirrorHint", children: t("market.mirror.hint") }),
					react_jsx_runtime.jsx("div", { children: react_jsx_runtime.jsx("button", {
						type: "button", className: "dsmkGhostBtn", disabled: mirrorBusy,
						onClick: onEnableMirror,
						children: mirrorBusy ? t("market.mirror.enabling") : t("market.mirror.enable")
					}) })
				] });
			}
			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
				react_jsx_runtime.jsx("div", { className: "dsmkShots", children: visible.map((image) => react_jsx_runtime.jsx("img", {
					className: "dsmkShot",
					src: image.src + bust,
					alt: image.alt || "",
					loading: "lazy",
					onClick: () => setZoomed({ ...image, src: image.src + bust }),
					onError: () => setBroken((prev) => ({ ...prev, [image.src]: true }))
				}, image.src)) }),
				zoomed ? react_dom.createPortal(react_jsx_runtime.jsx("div", {
					className: "dsmkLightbox",
					onClick: () => setZoomed(null),
					children: react_jsx_runtime.jsx("img", { src: zoomed.src, alt: zoomed.alt || "" })
				}), document.body) : null
			] });
		}

		/** 展开后的详情内容（发现 tab）。 */
		function DiscoverDetail({ t, state, profileName, canInstall, installed, action, busy, onInstall, mirror, onEnableMirror, mirrorBusy }) {
			if (!state || state.status === "loading") {
				return react_jsx_runtime.jsx("div", { className: "dsmkDetail", children:
					react_jsx_runtime.jsx("div", { className: "dsmkDetailNote", children: t("market.detail.loading") })
				});
			}
			if (state.status === "error") {
				return react_jsx_runtime.jsx("div", { className: "dsmkDetail", children:
					react_jsx_runtime.jsx("div", { className: "dsmkDetailNote dsmkDetailErr", children: state.message })
				});
			}
			const data = state.data;
			const command = data.installable && profileName
				? `dsh plugin --profile ${profileName} add ${data.name}@${data.version}`
				: null;
			return react_jsx_runtime.jsxs("div", { className: "dsmkDetail", children: [
				data.deprecated !== null ? react_jsx_runtime.jsx("div", { className: "dsmkDetailNote dsmkDetailWarn", children:
					data.deprecated ? fmt(t("market.detail.deprecated"), { msg: data.deprecated }) : t("market.detail.deprecatedBare")
				}) : null,

				// 不能装时，说清楚为什么。「安装按钮是灰的」而不给理由是最让人困惑的一种 UI。
				!data.installable ? react_jsx_runtime.jsx("div", { className: "dsmkDetailNote dsmkDetailWarn", children:
					t("market.detail.reason." + (data.reason || "no-bundle"))
				}) : null,

				// 截图排在最前：皮肤/主题类插件靠一眼看图判断要不要装，把它压在
				// 协议、依赖数下面等于让用户先读完一堆无关信息。
				Array.isArray(data.images) && data.images.length > 0
					? react_jsx_runtime.jsx(Shots, { t, images: data.images, mirror, onEnableMirror, mirrorBusy })
					: null,

				data.keywords.length > 0 ? react_jsx_runtime.jsx("div", { className: "dsmkChips", children:
					data.keywords.slice(0, 10).map((keyword) => react_jsx_runtime.jsx("span", { className: "dsmkChip", children: keyword }, keyword))
				}) : null,

				react_jsx_runtime.jsx(Facts, { rows: [
					{ key: t("market.detail.license"), value: data.license },
					{ key: t("market.detail.deps"), value: fmt(t("market.detail.depsValue"), { n: data.dependencies }) },
					{ key: t("market.detail.repo"), value: data.github || data.repository, href: data.github ? `https://github.com/${data.github}` : data.repository },
					{ key: t("market.detail.homepage"), value: data.homepage, href: data.homepage }
				] }),

				// 动作区。已安装的不再给安装按钮（卸载在「已安装」tab 里做，那里能同时
				// 看到版本与激活状态，比在搜索结果里顺手卸载更不容易点错）。
				data.installable ? react_jsx_runtime.jsxs("div", { className: "dsmkActions", children: [
					installed
						? react_jsx_runtime.jsx(Badge, { kind: "Ok", children: t("market.detail.installed") })
						: react_jsx_runtime.jsx("button", {
							type: "button",
							className: "dsmkPrimaryBtn",
							// busy 是**全局**的：服务端一次只跑一个 pnpm，别的包正在装的时候
							// 这个按钮就该是灰的，而不是点下去才收到一句 busy。
							disabled: !canInstall || busy,
							onClick: () => onInstall(data.name, data.version),
							children: action && action.status === "running" ? t("market.detail.installing") : t("market.detail.install")
						}),
					!canInstall && !installed
						? react_jsx_runtime.jsx("span", { className: "dsmkResult", children: t("market.detail.cannotInstall") })
						: null
				] }) : null,

				react_jsx_runtime.jsx(ActionResult, { t, action }),

				// 命令框一直留着，不只是「没有一键安装时的退路」：一键安装失败时用户需要
				// 一条能自己在终端里跑的确切命令，而不是一个只会再失败一次的按钮。
				command ? react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
					react_jsx_runtime.jsx("div", { className: "dsmkFactKey", style: { fontSize: "11.5px" }, children: t("market.detail.manual") }),
					react_jsx_runtime.jsx(CommandBox, { t, command })
				] }) : null
			] });
		}

		/** 发现 tab 的一行。整行是按钮，点哪儿都能展开——不要求用户去点那个小箭头。 */
		function DiscoverRow({ t, item, expanded, onToggle, detail, installedNames, profileName, canInstall, action, busy, onInstall, mirror, onEnableMirror, mirrorBusy }) {
			const installed = installedNames.has(item.name);
			return react_jsx_runtime.jsxs("div", { className: "dsmkRow" + (expanded ? " dsmkRowOpen" : ""), children: [
				react_jsx_runtime.jsxs("button", { type: "button", className: "dsmkRowHead", onClick: onToggle, "aria-expanded": expanded, children: [
					react_jsx_runtime.jsxs("div", { className: "dsmkRowMain", children: [
						react_jsx_runtime.jsxs("div", { className: "dsmkRowTitle", children: [
							react_jsx_runtime.jsx("span", { className: "dsmkRowName", children: item.name }),
							item.version ? react_jsx_runtime.jsx("span", { className: "dsmkRowVersion", children: item.version }) : null,
							installed ? react_jsx_runtime.jsx(Badge, { kind: "Ok", children: t("market.badge.installed") }) : null,
							!installed && item.tagged ? react_jsx_runtime.jsx(Badge, { kind: "Brand", children: t("market.badge.tagged") }) : null
						] }),
						item.description ? react_jsx_runtime.jsx("div", { className: "dsmkRowDesc", children: item.description }) : null,
						react_jsx_runtime.jsxs("div", { className: "dsmkRowMeta", children: [
							// 下载量排在最前：它是这一行里信息量最大的一个数字（有多少人在用）。
							// 抓不到时整个不显示，而不是显示 0——「没数据」和「没人用」是两回事。
							item.downloads !== null && item.downloads !== undefined
								? react_jsx_runtime.jsx("span", { className: "dsmkDownloads", children: fmt(t("market.meta.downloads"), { n: formatDownloads(item.downloads) }) })
								: null,
							item.publisher ? react_jsx_runtime.jsx("span", { children: item.publisher }) : null,
							item.date ? react_jsx_runtime.jsx("span", { children: shortDate(item.date) }) : null,
							item.license ? react_jsx_runtime.jsx("span", { children: item.license }) : null
						] })
					] }),
					react_jsx_runtime.jsx("span", { className: "dsmkRowChevron" + (expanded ? " dsmkRowChevronOpen" : ""), children:
						react_jsx_runtime.jsx(ChevronIcon, { size: 14 })
					})
				] }),
				expanded ? react_jsx_runtime.jsx(DiscoverDetail, {
					t, state: detail, profileName, canInstall, installed, busy, mirror, onEnableMirror, mirrorBusy,
					action: action && action.name === item.name ? action : null,
					onInstall
				}) : null
			] });
		}

		/**
		 * 随应用分发、但**当前没装**的插件。
		 *
		 * 装着的不在这里显示 —— 它们和别的插件一样出现在「已安装」组里，因为管理模式
		 * 本来就一样。这一组只解决一件事：卸掉之后怎么装回来。npm 上可能还没发、用户
		 * 此刻可能没网，而发行包里明明躺着那个 tgz，没有入口就是一扇单向门。
		 */
		function BundledRow({ t, item, busy, onInstall }) {
			return react_jsx_runtime.jsx("div", { className: "dsmkRow", children:
				react_jsx_runtime.jsxs("div", { className: "dsmkRowHead", style: { cursor: "default" }, children: [
					react_jsx_runtime.jsxs("div", { className: "dsmkRowMain", children: [
						react_jsx_runtime.jsxs("div", { className: "dsmkRowTitle", children: [
							react_jsx_runtime.jsx("span", { className: "dsmkRowName", children: item.packageName }),
							item.version ? react_jsx_runtime.jsx("span", { className: "dsmkRowVersion", children: item.version }) : null,
							react_jsx_runtime.jsx(Badge, { kind: "Muted", children: t("market.bundled.removed") })
						] })
					] }),
					react_jsx_runtime.jsx("div", { className: "dsmkRowActions", children:
						react_jsx_runtime.jsx("button", {
							type: "button", className: "dsmkGhostBtn", disabled: busy,
							onClick: () => onInstall(item.packageName),
							children: busy ? t("market.bundled.reinstalling") : t("market.bundled.reinstall")
						})
					})
				] })
			});
		}

		/** 分组标题。 */
		function GroupTitle({ title, hint }) {
			return react_jsx_runtime.jsxs("div", { className: "dsmkGroupTitle", children: [
				react_jsx_runtime.jsx("span", { children: title }),
				hint ? react_jsx_runtime.jsx("span", { className: "dsmkGroupHint", children: hint }) : null
			] });
		}


		/**
		 * 已安装 tab 的一行。
		 *
		 * 卸载做成**两段式**（点一下变成「确认卸载？」，再点才真执行），不弹对话框：
		 * 这是个破坏性动作，但弹窗会打断心流，而误点一次的代价（装回去要重新下载）
		 * 又没大到值得一个模态。和同作者 Git 面板的「撤销提交」用同一个交互。
		 */
		function InstalledRow({ t, item, action, busy, onUninstall, canInstall }) {
			const [armed, setArmed] = react.useState(false);
			// 离开这一行的操作态就解除武装，免得下次展开还停在「确认卸载？」上。
			react.useEffect(() => {
				if (!armed) return undefined;
				const timer = setTimeout(() => setArmed(false), 4000);
				return () => clearTimeout(timer);
			}, [armed]);
			const running = action && action.name === item.name && action.status === "running";
			// 声明成范围（`^1.2.0`）时提示一句：这解释了「为什么它会自己变版本」。
			const isRange = typeof item.spec === "string" && /^[\^~>=<]|x|\*/.test(item.spec);
			return react_jsx_runtime.jsxs("div", { className: "dsmkRow", children: [
				react_jsx_runtime.jsxs("div", { className: "dsmkRowHead", style: { cursor: "default" }, children: [
					react_jsx_runtime.jsxs("div", { className: "dsmkRowMain", children: [
						react_jsx_runtime.jsxs("div", { className: "dsmkRowTitle", children: [
							react_jsx_runtime.jsx("span", { className: "dsmkRowName", children: item.name }),
							// 三种状态互斥，按「用户最关心什么」排：他自己停用的排最前；
							// 「装了但没有 dsh.bundle」是包本身的毛病；最后才是正常激活。
							item.enabled === false
								? react_jsx_runtime.jsx(Badge, { kind: "Warn", children: t("market.badge.disabled") })
								: item.activated
									? react_jsx_runtime.jsx(Badge, { kind: "Ok", children: t("market.badge.active") })
									: react_jsx_runtime.jsx(Badge, { kind: "Warn", title: t("market.badge.inactiveHint"), children: t("market.badge.inactive") })
						] }),
						item.description ? react_jsx_runtime.jsx("div", { className: "dsmkRowDesc", children: item.description }) : null,
						react_jsx_runtime.jsxs("div", { className: "dsmkRowMeta", children: [
							item.installedVersion ? react_jsx_runtime.jsx("span", { children: fmt(t("market.installed.version"), { v: item.installedVersion }) }) : null,
							item.spec ? react_jsx_runtime.jsx("span", { title: isRange ? t("market.installed.range") : undefined, children: fmt(t("market.installed.spec"), { s: item.spec }) }) : null
						] })
					] }),
					// 右上角只放开关。它表达的是**状态**（这插件现在开着吗），和标题同一行
					// 读起来是「某某插件：开着」；卸载是**动作**，挪到下面单独一行。
					react_jsx_runtime.jsx("div", { className: "dsmkRowActions", children:
						item.canDisable ? react_jsx_runtime.jsxs("label", {
							className: "dsmkSwitch",
							title: fmt(t("market.toggle.label"), { name: item.name }),
							children: [
								react_jsx_runtime.jsx("input", {
									type: "checkbox",
									checked: item.enabled !== false,
									disabled: busy,
									"aria-label": fmt(t("market.toggle.label"), { name: item.name }),
									onChange: (e) => onToggle(item.name, e.target.checked)
								}),
								react_jsx_runtime.jsx("span", { className: "dsmkSwitchTrack", children:
									react_jsx_runtime.jsx("span", { className: "dsmkSwitchKnob" })
								})
							]
						}) : null
					})
				] }),
				item.removable ? react_jsx_runtime.jsx("div", { className: "dsmkRowFooter", children:
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dsmkDangerBtn" + (armed ? " dsmkDangerBtnArmed" : ""),
						disabled: busy || !canInstall,
						title: item.name,
						onClick: () => {
							if (!armed) { setArmed(true); return; }
							setArmed(false);
							onUninstall(item.name);
						},
						children: running ? t("market.detail.uninstalling") : armed ? t("market.detail.uninstallConfirm") : t("market.detail.uninstall")
					})
				}) : null,
				action && action.name === item.name
					? react_jsx_runtime.jsx("div", { className: "dsmkDetail", children: react_jsx_runtime.jsx(ActionResult, { t, action }) })
					: null
			] });
		}
		//#endregion

		/**
		 * 面板内容。首次打开后由 MarketPanel 常驻挂载（为了关闭动画），所以这里靠 open
		 * 自己判断要不要发请求——`open` 不是渲染开关，是「现在该不该请求」。
		 */
		function MarketPanelBody({ t, open, onClose }) {
			const [tab, setTab] = react.useState(readTab);
			const [rescan, setRescan] = react.useState(0);

			// 已安装列表在两个 tab 都要用：发现 tab 拿它标「已安装」徽章，详情拿它的
			// profileName 拼安装命令。所以面板一打开就拉，不管当前在哪个 tab。
			const [installed, setInstalled] = react.useState({ status: "idle", items: [], profileName: null, profileDir: null, error: null });
			react.useEffect(() => {
				if (!open) return undefined;
				let alive = true;
				setInstalled((prev) => ({ ...prev, status: "loading" }));
				getJson("/api/dsdesktop/market/installed").then((result) => {
					if (!alive) return;
					if (result && result.ok) {
						setInstalled({ status: "ready", items: result.data.items, profileName: result.data.profileName, profileDir: result.data.profileDir, error: null });
					} else {
						setInstalled({ status: "error", items: [], profileName: null, profileDir: null, error: (result && result.error && result.error.message) || t("market.state.error") });
					}
				}).catch((error) => {
					if (!alive) return;
					setInstalled({ status: "error", items: [], profileName: null, profileDir: null, error: String(error && error.message ? error.message : error) });
				});
				return () => { alive = false; };
			}, [open, rescan, t]);

			const installedNames = react.useMemo(() => new Set(installed.items.map((item) => item.name)), [installed.items]);

			// 能不能一键安装是**环境**决定的（定位得到 dsh 的 bin、定位得到 profile），
			// 先问清楚再决定按钮长什么样——让用户点下去才发现不行是最差的一种反馈。
			const [canInstall, setCanInstall] = react.useState(false);
			// 镜像开没开也从 capabilities 一起拿：截图区要据此决定是显示图、还是显示
			// 「加载不出来，要不要开镜像」那个提示。
			const [mirror, setMirror] = react.useState("");
			const [mirrorBusy, setMirrorBusy] = react.useState(false);
			react.useEffect(() => {
				if (!open) return undefined;
				let alive = true;
				getJson("/api/dsdesktop/market/capabilities").then((result) => {
					if (!alive || !result || !result.ok) return;
					setCanInstall(Boolean(result.data.canInstall));
					setMirror(String(result.data.imageMirror ?? ""));
				}).catch(() => {});
				return () => { alive = false; };
			}, [open, rescan]);

			// 默认镜像地址。写死一个已知可用的值，是为了让那个提示能**一键**生效——
			// 让用户自己去搜一个 GitHub 代理地址填进来，等于这个功能不存在。用户想换
			// 别的，改 profile 里的 dsh-market.json 或插件 Config 都行。
			const DEFAULT_MIRROR = "https://gh-proxy.com/";
			const onEnableMirror = react.useCallback(async () => {
				setMirrorBusy(true);
				try {
					const result = await postJson("/api/dsdesktop/market/settings/save", { imageMirror: DEFAULT_MIRROR });
					if (result && result.ok) setMirror(String(result.data.imageMirror ?? ""));
				} catch { /* 失败就保持原样，提示还在，用户可以再点 */ }
				setMirrorBusy(false);
			}, []);

			// 随应用分发的插件清单。只用它回答一个问题：「哪些自带插件现在没装」——
			// 装着的走「已安装」那组，管理模式和别的插件完全一样。
			const [bundled, setBundled] = react.useState([]);
			react.useEffect(() => {
				if (!open) return undefined;
				let alive = true;
				getJson("/api/dsdesktop/market/bundled").then((result) => {
					if (!alive) return;
					setBundled(result && result.ok ? result.data.plugins : []);
				}).catch(() => { if (alive) setBundled([]); });
				return () => { alive = false; };
			}, [open, rescan]);

			// 一次只跟踪一个动作：服务端也只允许一个 pnpm 在跑（并发跑会踩 lockfile），
			// 前端的状态形状跟着这个事实走，而不是维护一张「每个包各自的状态」表。
			const [action, setAction] = react.useState(null);
			const busy = Boolean(action && action.status === "running");

			const runInstall = react.useCallback(async (name, version) => {
				setAction({ kind: "install", name, status: "running" });
				try {
					const result = await postJson("/api/dsdesktop/market/install", { name, version });
					if (result && result.ok) {
						const message = fmt(t("market.detail.needRestart"), { name: result.data.name, version: result.data.version })
							+ (result.data.drifted ? "（" + fmt(t("market.detail.drifted"), { version: result.data.version }) + "）" : "");
						setAction({ kind: "install", name, status: "ok", message });
						setRescan((n) => n + 1);
					} else {
						setAction({ kind: "install", name, status: "error",
							message: (result && result.error && result.error.message) || t("market.detail.failed"),
							output: result && result.error && result.error.output });
					}
				} catch (error) {
					setAction({ kind: "install", name, status: "error", message: String(error && error.message ? error.message : error) });
				}
			}, [t]);

			// 停用/启用。改动要下次启动才生效，所以计数提示重启——和桌面自带插件的开关
			// 是同一套体验，只是那边写的是「不生成 insert」、这边写的是「压一条 disabled」。
			const [togglePending, setTogglePending] = react.useState(0);
			const runToggle = react.useCallback(async (name, enabled) => {
				setToggleError(null);
				try {
					const result = await postJson("/api/dsdesktop/market/profile-plugins/toggle", { name, enabled });
					if (result && result.ok) {
						setTogglePending((n) => n + 1);
						setRescan((n) => n + 1);
					} else {
						setToggleError(fmt(t("market.toggle.failed"), { msg: (result && result.error && result.error.message) || "" }));
					}
				} catch (error) {
					setToggleError(fmt(t("market.toggle.failed"), { msg: String(error && error.message ? error.message : error) }));
				}
			}, [t]);

			const runBundledInstall = react.useCallback(async (name) => {
				setAction({ kind: "install", name, status: "running" });
				try {
					const result = await postJson("/api/dsdesktop/market/bundled/install", { name });
					if (result && result.ok) {
						setAction({ kind: "install", name, status: "ok",
							message: fmt(t("market.detail.needRestart"), { name, version: result.data.version ?? "" }) });
						setRescan((n) => n + 1);
					} else {
						setAction({ kind: "install", name, status: "error",
							message: (result && result.error && result.error.message) || t("market.detail.failed"),
							output: result && result.error && result.error.output });
					}
				} catch (error) {
					setAction({ kind: "install", name, status: "error", message: String(error && error.message ? error.message : error) });
				}
			}, [t]);

			const runUninstall = react.useCallback(async (name) => {
				setAction({ kind: "uninstall", name, status: "running" });
				try {
					const result = await postJson("/api/dsdesktop/market/uninstall", { name });
					if (result && result.ok) {
						setAction({ kind: "uninstall", name, status: "ok", message: fmt(t("market.detail.removed"), { name }) });
						setRescan((n) => n + 1);
					} else {
						setAction({ kind: "uninstall", name, status: "error",
							message: (result && result.error && result.error.message) || t("market.detail.failed"),
							output: result && result.error && result.error.output });
					}
				} catch (error) {
					setAction({ kind: "uninstall", name, status: "error", message: String(error && error.message ? error.message : error) });
				}
			}, [t]);

			// 搜索。query 是输入框的即时值，debounced 是真正发请求用的值——每敲一个字母
			// 就打一次 npm 既慢又容易被限流。
			const [query, setQuery] = react.useState("");
			const [debounced, setDebounced] = react.useState("");
			const [searchAll, setSearchAll] = react.useState(false);
			// 排序记住上次的选择：一个习惯按下载量看的用户，不该每次打开都要再选一遍。
			const [sort, setSort] = react.useState(readSort);
			react.useEffect(() => {
				const timer = setTimeout(() => setDebounced(query), 300);
				return () => clearTimeout(timer);
			}, [query]);

			const [results, setResults] = react.useState({ status: "idle", items: [], total: 0, error: null });
			react.useEffect(() => {
				// 只在发现 tab 且面板打开时才搜：面板关着、或者用户在看已安装列表时，
				// 没有任何理由去打 npm。
				if (!open || tab !== "discover") return undefined;
				let alive = true;
				setResults((prev) => ({ ...prev, status: "loading" }));
				const qs = `q=${encodeURIComponent(debounced)}&size=30&sort=${encodeURIComponent(sort)}${searchAll ? "&all=1" : ""}`;
				getJson(`/api/dsdesktop/market/search?${qs}`).then((result) => {
					if (!alive) return;
					if (result && result.ok) setResults({ status: "ready", items: result.data.items, total: result.data.total, error: null });
					else setResults({ status: "error", items: [], total: 0, error: (result && result.error && result.error.message) || t("market.state.error") });
				}).catch((error) => {
					if (!alive) return;
					setResults({ status: "error", items: [], total: 0, error: String(error && error.message ? error.message : error) });
				});
				return () => { alive = false; };
			}, [open, tab, debounced, searchAll, sort, rescan, t]);

			// 展开哪一条 + 那一条的详情。一次只展开一条：同时展开多条会让列表长度
			// 剧烈跳动，滚动位置立刻失去参照。
			const [expanded, setExpanded] = react.useState(null);
			const [detail, setDetail] = react.useState(null);
			react.useEffect(() => {
				if (expanded === null) return undefined;
				let alive = true;
				setDetail({ name: expanded, status: "loading" });
				getJson(`/api/dsdesktop/market/detail?name=${encodeURIComponent(expanded)}`).then((result) => {
					if (!alive) return;
					setDetail((prev) => {
						// 期间用户折叠了、或者展开了别的一条，这次的结果就作废。
						if (!prev || prev.name !== expanded) return prev;
						return result && result.ok
							? { name: expanded, status: "ready", data: result.data }
							: { name: expanded, status: "error", message: (result && result.error && result.error.message) || t("market.state.error") };
					});
				}).catch((error) => {
					if (!alive) return;
					setDetail((prev) => (prev && prev.name === expanded
						? { name: expanded, status: "error", message: String(error && error.message ? error.message : error) }
						: prev));
				});
				return () => { alive = false; };
			}, [expanded, t]);

			// 换 tab / 换搜索词时收起展开项：展开的是上一批结果里的东西。
			react.useEffect(() => { setExpanded(null); }, [tab, debounced, searchAll, sort]);

			const onSelectTab = react.useCallback((next) => {
				setTab(next);
				storeTab(next);
			}, []);

			const discoverContent = () => {
				if (results.status === "loading" && results.items.length === 0) return react_jsx_runtime.jsx(Notice, { children: t("market.state.loading") });
				if (results.status === "error") {
					return react_jsx_runtime.jsxs("div", { className: "dsmkNotice dsmkNoticeErr", children: [
						react_jsx_runtime.jsx("div", { children: results.error }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsmkRetry", onClick: () => setRescan((n) => n + 1), children: t("market.state.retry") })
					] });
				}
				if (results.items.length === 0) return react_jsx_runtime.jsx(Notice, { children: t("market.state.empty") });
				return results.items.map((item) => react_jsx_runtime.jsx(DiscoverRow, {
					t, item, installedNames, canInstall, action, busy, onInstall: runInstall,
					mirror, onEnableMirror, mirrorBusy,
					profileName: installed.profileName,
					expanded: expanded === item.name,
					detail: detail && detail.name === item.name ? detail : null,
					onToggle: () => setExpanded(expanded === item.name ? null : item.name)
				}, item.name));
			};

			// 只显示「随应用分发 + 当前没装」的那些。required 的（市场自己）不列——
			// 它卸不掉，永远不会出现在这一组里，列出来只会让人以为它可以被卸。
			const removedBundled = bundled.filter((b) => !b.installed && !b.required);
			// 卸不掉的 = 桌面版内置。用 removable 而不是硬编码包名：判据来自服务端的
			// 保护名单，两边不会各说各话。
			const builtinItems = installed.items.filter((i) => !i.removable);
			const normalItems = installed.items.filter((i) => i.removable);

			const installedContent = () => {
				if (installed.status === "loading" && installed.items.length === 0 && desktop.plugins.length === 0) {
					return react_jsx_runtime.jsx(Notice, { children: t("market.state.loading") });
				}
				if (installed.status === "error" && desktop.plugins.length === 0) {
					return react_jsx_runtime.jsxs("div", { className: "dsmkNotice dsmkNoticeErr", children: [
						react_jsx_runtime.jsx("div", { children: installed.error }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsmkRetry", onClick: () => setRescan((n) => n + 1), children: t("market.state.retry") })
					] });
				}
				if (installed.items.length === 0 && desktop.plugins.length === 0 && removedBundled.length === 0) {
					return react_jsx_runtime.jsx(Notice, { children: t("market.state.emptyInstalled") });
				}
				return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
					// 安全模式的说明要顶在最上面：那一次启动里插件全被跳过，不解释一句
					// 用户只会更慌（以为插件都丢了）。这个标志由外壳经环境变量告知，
					// 服务端在 /installed 里透出来。
					safeMode ? react_jsx_runtime.jsx("div", { className: "dsmkSafeMode", children: t("market.safeMode") }) : null,

					// 随应用分发但当前没装的：给一个「装回来」的入口。全都装着时整组不出现。
					removedBundled.length > 0 ? react_jsx_runtime.jsxs("div", { className: "dsmkGroup", children: [
						react_jsx_runtime.jsx(GroupTitle, { title: t("market.group.bundled"), hint: t("market.group.bundledHint") }),
						removedBundled.map((item) => react_jsx_runtime.jsx(BundledRow, {
							t, item, busy, onInstall: runBundledInstall
						}, item.packageName)),
						action && removedBundled.some((b) => b.packageName === action.name)
							? react_jsx_runtime.jsx("div", { className: "dsmkDetail", children: react_jsx_runtime.jsx(ActionResult, { t, action }) })
							: null
					] }) : null,

					// 内置的（卸不掉的那些，目前只有市场自己）单独成组。它们和别的插件混在
					// 一起时，用户看到的是「为什么这个没有卸载按钮」；分开并写明「桌面版
					// 内置，无法卸载」，问题就不存在了。
					builtinItems.length > 0 ? react_jsx_runtime.jsxs("div", { className: "dsmkGroup", children: [
						react_jsx_runtime.jsx(GroupTitle, { title: t("market.group.builtin"), hint: t("market.group.builtinHint") }),
						builtinItems.map((item) => react_jsx_runtime.jsx(InstalledRow, {
							t, item, action, busy, canInstall, onUninstall: runUninstall, onToggle: runToggle
						}, item.name))
					] }) : null,

					react_jsx_runtime.jsxs("div", { className: "dsmkGroup", children: [
						builtinItems.length > 0 || desktop.plugins.length > 0 || removedBundled.length > 0
							? react_jsx_runtime.jsx(GroupTitle, { title: t("market.group.profile") }) : null,
						togglePending > 0 ? react_jsx_runtime.jsx("div", { className: "dsmkPending", children: fmt(t("market.toggle.pending"), { n: togglePending }) }) : null,
						toggleError ? react_jsx_runtime.jsx("div", { className: "dsmkPending dsmkResultErr", children: toggleError }) : null,
						normalItems.length === 0
							? react_jsx_runtime.jsx(Notice, { children: t("market.state.emptyInstalled") })
							: normalItems.map((item) => react_jsx_runtime.jsx(InstalledRow, {
								t, item, action, busy, canInstall, onUninstall: runUninstall, onToggle: runToggle
							}, item.name))
					] })
				] });
			};

			return react_jsx_runtime.jsxs("div", { className: "dsmkPanel" + (open ? " dsmkOpen" : ""), children: [
				react_jsx_runtime.jsxs("div", { className: "dsmkHeader", children: [
					react_jsx_runtime.jsx("span", { className: "dsmkHeaderTitle", children: t("market.panel.label") }),
					react_jsx_runtime.jsx("button", {
						type: "button", className: "dsmkIconBtn",
						"aria-label": t("market.panel.refresh"), title: t("market.panel.refresh"),
						onClick: () => setRescan((n) => n + 1),
						children: react_jsx_runtime.jsx(RefreshIcon, {})
					}),
					react_jsx_runtime.jsx("button", {
						type: "button", className: "dsmkIconBtn",
						"aria-label": t("market.panel.close"), title: t("market.panel.close"),
						onClick: onClose,
						children: react_jsx_runtime.jsx(CloseIcon, {})
					})
				] }),

				react_jsx_runtime.jsxs("div", { className: "dsmkTabs", children: [
					react_jsx_runtime.jsxs("button", {
						type: "button",
						className: "dsmkTab" + (tab === "installed" ? " dsmkTabActive" : ""),
						onClick: () => onSelectTab("installed"),
						children: [
							t("market.tab.installed"),
							installed.items.length + desktop.plugins.length > 0
								? react_jsx_runtime.jsx("span", { className: "dsmkTabCount", children: installed.items.length + desktop.plugins.length })
								: null
						]
					}),
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dsmkTab" + (tab === "discover" ? " dsmkTabActive" : ""),
						onClick: () => onSelectTab("discover"),
						children: t("market.tab.discover")
					})
				] }),

				tab === "discover" ? react_jsx_runtime.jsxs("div", { className: "dsmkSearch", children: [
					react_jsx_runtime.jsxs("div", { className: "dsmkSearchBox", children: [
						react_jsx_runtime.jsx(SearchIcon, { size: 14 }),
						react_jsx_runtime.jsx("input", {
							className: "dsmkSearchInput",
							type: "text",
							value: query,
							placeholder: t("market.search.placeholder"),
							"aria-label": t("market.search.placeholder"),
							onChange: (e) => setQuery(e.target.value)
						})
					] }),
					react_jsx_runtime.jsxs("div", { className: "dsmkSearchMeta", children: [
						react_jsx_runtime.jsxs("span", { children: [
							results.status === "ready" ? fmt(t("market.result.count"), { n: results.total }) : "",
							react_jsx_runtime.jsx("select", {
								className: "dsmkSortSelect",
								value: sort,
								"aria-label": t("market.sort.label"),
								title: t("market.sort.label"),
								onChange: (e) => { setSort(e.target.value); storeSort(e.target.value); },
								children: SORT_VALUES.map((value) => react_jsx_runtime.jsx("option", { value, children: t("market.sort." + value) }, value))
							})
						] }),
						react_jsx_runtime.jsxs("label", { className: "dsmkToggle", title: t("market.search.allHint"), children: [
							react_jsx_runtime.jsx("input", { type: "checkbox", checked: searchAll, onChange: (e) => setSearchAll(e.target.checked) }),
							react_jsx_runtime.jsx("span", { children: t("market.search.all") })
						] })
					] })
				] }) : null,

				react_jsx_runtime.jsx("div", { className: "dsmkBody", children: tab === "discover" ? discoverContent() : installedContent() }),

				react_jsx_runtime.jsx("div", { className: "dsmkFooter", title: installed.profileDir || undefined, children:
					installed.profileName ? fmt(t("market.footer.profile"), { name: installed.profileName }) : ""
				})
			] });
		}

		function MarketFooterAction({ wide, t, store }) {
			const open = react.useSyncExternalStore(store.subscribe, store.getSnapshot);
			return react_jsx_runtime.jsxs("button", {
				type: "button",
				className: "dsmkFooterBtn" + (open ? " dsmkFooterBtnActive" : ""),
				"aria-label": t("market.panel.label"),
				"aria-pressed": open,
				title: t("market.panel.label"),
				onClick: () => store.toggle(),
				children: [
					react_jsx_runtime.jsx(MarketIcon, { size: 16 }),
					wide ? react_jsx_runtime.jsx("span", { className: "dsmkFooterBtnLabel", children: t("market.panel.label") }) : null
				]
			});
		}

		function MarketPanel({ t, store }) {
			const open = react.useSyncExternalStore(store.subscribe, store.getSnapshot);
			// 第一次打开后常驻挂载，开关只切 dsmkOpen 这个 class（见 CSS transition）——
			// 这样关闭时面板和遮罩能一起淡出，而不是内容瞬间抽掉、只剩空壳飘走。
			const [mounted, setMounted] = react.useState(false);
			react.useEffect(() => {
				if (open) setMounted(true);
			}, [open]);

			// Esc 关闭，和点背景遮罩是同一件事的两种触发方式。
			react.useEffect(() => {
				if (!open) return undefined;
				const onKeyDown = (e) => {
					if (e.key === "Escape") store.close();
				};
				document.addEventListener("keydown", onKeyDown);
				return () => document.removeEventListener("keydown", onKeyDown);
			}, [open, store]);

			if (!mounted) return null;
			// createPortal：槽位仍然是 shell.overlay（生命周期跟着插件走），但真正的 DOM
			// 挂到 document.body —— 只有跳出 .overlayLayer{z-index:20} 这个层叠上下文，
			// 遮罩的 1000 才有意义（理由见 .dsmkBackdrop 的注释）。
			return react_dom.createPortal(react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
				children: [
					react_jsx_runtime.jsx("div", {
						className: "dsmkBackdrop" + (open ? " dsmkOpen" : ""),
						onClick: () => store.close()
					}),
					react_jsx_runtime.jsx(MarketPanelBody, { t, open, onClose: () => store.close() })
				]
			}), document.body);
		}

		const inject = ["slots", "locale"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "market: dictionaries");
			const store = createOpenStore();

			ctx.slots.inject("sidebar.footer.action", () => {
				const dispose = ctx.slots.register({
					name: "sidebar.footer.action",
					id: "market",
					// order: 110 —— 排序升序，数字小的在上面。终端面板是 90、Git 是 100，
					// 所以 110 让市场排在 Git **下面**（footer 最末）。市场是低频入口，
					// 放在天天用的终端和 Git 之下更合理。
					order: 110,
					locale: NS,
					inject: () => ({ store })
				}, MarketFooterAction);
				return () => dispose();
			});

			ctx.slots.inject("shell.overlay", () => {
				const dispose = ctx.slots.register({
					name: "shell.overlay",
					id: "market-panel",
					locale: NS,
					inject: () => ({ store })
				}, MarketPanel);
				return () => dispose();
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		// 只给单测用。
		exports.__test__ = { fmt, shortDate, CommandBox, DiscoverRow, InstalledRow };
		return module.exports;
	}
});
