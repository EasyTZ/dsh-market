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

		/**
		 * 本插件自己的包名。跟文件头 `__ModuleLoader__.load({ id })` 里那个是同一个串，
		 * 改包名时两处都要动——写死在这里是因为 factory 里拿不到那个 id。
		 *
		 * 只用在一个地方：认出「这次更新的是市场自己」，见 SELF_UPDATE_KEY 的注释。
		 */
		const SELF_NAME = "@easytz/dsh-market";

		const zh = {
			"market.panel.label": "插件市场",
			"market.updates.hint": "{n} 个插件有新版本",
			"market.panel.close": "关闭",
			"market.panel.refresh": "刷新",
			"market.tab.installed": "已安装",
			"market.tab.discover": "发现",
			"market.search.placeholder": "搜索插件…",
			"market.search.clear": "清空搜索",
			"market.search.onlyDsh": "只搜 dsh-plugin",
			"market.search.onlyDshHint": "只搜声明了 dsh-plugin 关键词的包；关掉则搜整个 npm（结果里绝大多数装不进来）",
			"market.search.cnMirror": "国内镜像",
			"market.search.cnMirrorHint": "搜索、详情、安装都改走 npmmirror.com（阿里云维护的 npm 镜像），访问不了 registry.npmjs.org 时打开；默认关闭",
			"market.sort.downloads-week": "周下载量",
			"market.sort.downloads-month": "月下载量",
			"market.sort.updated": "最近更新",
			"market.sort.label": "排序",
			"market.meta.downloadsWeek": "周下载 {n}",
			"market.meta.downloadsMonth": "月下载 {n}",
			// 卡片上那个日期指的是**这个包最后一次发版**的时间（npm 搜索结果的 date
			// 字段），不是「你装它的时间」，也不是「你上次更新它的时间」。光甩一个
			// 裸日期，三种理解都成立——写清楚才有信息量。
			"market.meta.updated": "更新于 {d}",
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
			"market.card.viewDetail": "详情",
			"market.detail.install": "安装",
			"market.detail.installing": "安装中…",
			"market.detail.installed": "已安装",
			"market.detail.uninstall": "卸载",
			"market.detail.uninstalling": "卸载中…",
			"market.detail.uninstallConfirm": "确认卸载？",
			"market.detail.needRestart": "已装好 {name}@{version}",
			"market.detail.removed": "已卸载 {name}",
			"market.detail.restart": "重启应用",
			"market.detail.drifted": "作者在你浏览期间发布了新版本，实际装的是 {version}",
			"market.detail.busy": "已有一个安装/卸载正在进行",
			"market.detail.cannotInstall": "当前环境无法一键安装，请用下面的命令",
			"market.detail.manual": "手动安装命令",
			"market.detail.failed": "操作失败",
			"market.detail.loading": "读取详情…",
			"market.detail.back": "返回",
			"market.installed.version": "版本 {v}",
			"market.installed.spec": "声明 {s}",
			"market.installed.range": "声明的是范围，下次安装可能漂到新版本",
			"market.installed.bundledSpec": "App内置",
			"market.footer.profile": "profile：{name}",
			"market.group.bundled": "随应用分发",
			"market.group.builtin": "桌面自带",
			"market.group.builtinHint": "桌面版内置，无法卸载",
			"market.toggle.label": "停用 / 启用 {name}",
			"market.badge.disabled": "已停用",
			"market.badge.removed": "已卸载",
			"market.badge.removedHint": "包已经从磁盘删掉了，当前这次运行仍然加载着它——重启后这张卡片就不在了",
			"market.badge.update": "有更新 {v}",
			"market.detail.updateTo": "更新到 {v}",
			"market.detail.updating": "更新中…",
			"market.updateAll": "一键更新 {n} 个",
			"market.updateAll.upToDate": "已全部更新",
			"market.updateAll.running": "更新中 {done}/{total}…",
			"market.updateAll.hint": "把有新版本的插件逐个更新到最新版。一次只跑一个（包管理器不能并发），插件市场自己排在最后 —— 更新它会把这个面板热换掉。",
			"market.updateAll.done": "已更新 {n} 个插件",
			"market.updateAll.failed": "{n} 个没更新成功：{names}",
			"market.pending.restart": "有 {n} 项改动，重启后生效",
			// 网页版（浏览器里开 dsh，没有桌面外壳）没有「重启应用」按钮可点，见
			// restartAvailable。那就把该按的地方说清楚：要重启的是跑着 dsh 的那个进程。
			"market.pending.restartWeb": "有 {n} 项改动，重启 dsh 进程后生效",
			"market.toggle.failed": "操作失败：{msg}",
			"market.group.bundledHint": "装在发行包里，可以随时卸载；卸了也能从这里装回来",
			"market.bundled.reinstall": "装回来",
			"market.bundled.reinstalling": "安装中…",
			"market.bundled.removed": "已卸载",
			"market.bundled.required": "必备",
			"market.bundled.requiredHint": "插件市场自己，卸载了就没有管理插件的入口了",
			"market.group.profile": "从市场安装",
			"market.safeMode": "安全模式：本次启动跳过了插件市场以外的全部插件。把可疑插件停用或卸载后重启即可恢复正常启动。",
			"market.desktop.nav": "更新",
			"market.desktop.header.update": "有新版本",
			"market.desktop.header.updateHint": "DeepSeek Harness Desktop {v} 已发布，点击查看下载页",
			"market.desktop.checking": "检查中…",
			"market.desktop.appUpdate.available": "更新 Desktop App",
			"market.desktop.appUpdate.upToDate": "Desktop App 已是最新",
			"market.desktop.kernelUpdate.available": "更新 dsh 内核",
			"market.desktop.kernelUpdate.upToDate": "dsh 内核已是最新"
		};
		const en = {
			"market.panel.label": "Plugin Market",
			"market.updates.hint": "{n} plugin update(s) available",
			"market.panel.close": "Close",
			"market.panel.refresh": "Refresh",
			"market.tab.installed": "Installed",
			"market.tab.discover": "Discover",
			"market.search.placeholder": "Search plugins…",
			"market.search.clear": "Clear search",
			"market.search.onlyDsh": "dsh-plugin only",
			"market.search.onlyDshHint": "Only packages keyworded dsh-plugin; turn off to search all of npm (most results will not be installable)",
			"market.search.cnMirror": "CN mirror",
			"market.search.cnMirrorHint": "Route search, detail, and install through npmmirror.com (Alibaba's npm mirror) — turn on if registry.npmjs.org is unreachable for you; off by default",
			"market.sort.downloads-week": "Weekly downloads",
			"market.sort.downloads-month": "Monthly downloads",
			"market.sort.updated": "Recently updated",
			"market.sort.label": "Sort",
			"market.meta.downloadsWeek": "{n}/week",
			"market.meta.downloadsMonth": "{n}/month",
			"market.meta.updated": "Updated {d}",
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
			"market.card.viewDetail": "Details",
			"market.detail.install": "Install",
			"market.detail.installing": "Installing…",
			"market.detail.installed": "Installed",
			"market.detail.uninstall": "Uninstall",
			"market.detail.uninstalling": "Uninstalling…",
			"market.detail.uninstallConfirm": "Confirm uninstall?",
			"market.detail.needRestart": "Installed {name}@{version}",
			"market.detail.removed": "Removed {name}",
			"market.detail.restart": "Restart app",
			"market.detail.drifted": "The author published a newer version while you were browsing — {version} was installed",
			"market.detail.busy": "An install/uninstall is already running",
			"market.detail.cannotInstall": "One-click install is unavailable here — use the command below",
			"market.detail.manual": "Manual install command",
			"market.detail.failed": "Operation failed",
			"market.detail.loading": "Loading details…",
			"market.detail.back": "Back",
			"market.installed.version": "version {v}",
			"market.installed.spec": "declared {s}",
			"market.installed.range": "A range was declared — a later install may drift to a newer version",
			"market.installed.bundledSpec": "Built into the app",
			"market.footer.profile": "profile: {name}",
			"market.group.bundled": "Ships with the app",
			"market.group.builtin": "Built in",
			"market.group.builtinHint": "Ships with the desktop app; cannot be uninstalled",
			"market.toggle.label": "Enable / disable {name}",
			"market.badge.disabled": "Disabled",
			"market.badge.removed": "Uninstalled",
			"market.badge.removedHint": "The package is already deleted from disk; this running instance still has it loaded — the card disappears after a restart",
			"market.badge.update": "Update {v}",
			"market.detail.updateTo": "Update to {v}",
			"market.detail.updating": "Updating…",
			"market.updateAll": "Update all ({n})",
			"market.updateAll.upToDate": "All updated",
			"market.updateAll.running": "Updating {done}/{total}…",
			"market.updateAll.hint": "Update every plugin that has a newer version, one at a time (the package manager cannot run concurrently). The market itself goes last — updating it swaps this panel out.",
			"market.updateAll.done": "Updated {n} plugin(s)",
			"market.updateAll.failed": "{n} could not be updated: {names}",
			"market.pending.restart": "{n} change(s) pending — restart to apply",
			"market.pending.restartWeb": "{n} change(s) pending — restart the dsh process to apply",
			"market.toggle.failed": "Failed: {msg}",
			"market.group.bundledHint": "Included in the release; removable any time, and restorable from here",
			"market.bundled.reinstall": "Reinstall",
			"market.bundled.reinstalling": "Installing…",
			"market.bundled.removed": "Removed",
			"market.bundled.required": "Required",
			"market.bundled.requiredHint": "The market itself — removing it would leave no way to manage plugins",
			"market.group.profile": "Installed from the market",
			"market.safeMode": "Safe mode: every plugin except the market was skipped this time. Disable or uninstall the suspect one, then restart.",
			"market.desktop.nav": "Update",
			"market.desktop.header.update": "Update available",
			"market.desktop.header.updateHint": "DeepSeek Harness Desktop {v} is out — click to view the download page",
			"market.desktop.checking": "Checking…",
			"market.desktop.appUpdate.available": "Update Desktop App",
			"market.desktop.appUpdate.upToDate": "Desktop App is up to date",
			"market.desktop.kernelUpdate.available": "Update dsh kernel",
			"market.desktop.kernelUpdate.upToDate": "dsh kernel is up to date"
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
			// 「有插件能升级」的角标：文字右上角一个蓝色小叹号。
			//
			// 角标必须挂在**包一层的 wrap** 上，不能直接塞进 .dsmkFooterBtnLabel —— 那个
			// 元素为了省略号带着 overflow:hidden，绝对定位的子元素会被它裁掉，叹号只剩
			// 半个。wrap 不设 overflow，默认 visible，它才能探出文字边界。
			// 折叠态（只剩图标）没有文字可以贴，就退到图标右上角，位置由下面两条
			// 后代选择器分别给——同一个叹号，两种锚点。
			//
			// 叹号是画出来的（见 UpdateBangIcon），不是排一个「!」字符：字形那一竖在这个
			// 尺寸下细到一两个物理像素，肉眼读起来就是个圆点，等于没有叹号。
			//
			// **本文件里所有「蓝」都写死 #4d6bfe，刻意不走 --dsw-alias-brand-primary。**
			//
			// 那个 token 在这套主题下的实际取值是 `#f9fafb`（近白），不是蓝色。它定义在
			// body 上而不是 :root，所以在 documentElement 上读是空字符串，极容易误判成
			// 「未定义、会走 var() 的兜底」——实测（Electron 里读 getComputedStyle）角标
			// 算出来是 rgb(249,250,251)，而当时 svg 上写死了 stroke 属性、CSS 里还挂着
			// !important，三层保护全都忠实地画了那个白色，一层都没错。
			//
			// 教训不是「兜底不够多」，是**别把一个语义不符的 token 当颜色源**：这里要的是
			// 「蓝」这个具体视觉，不是「品牌色」这个语义，而这套主题的品牌色就是白的。
			// 链接、焦点边框、Brand 徽章、开关的 accent-color 原先全走那个 token，于是也
			// 全是白的，这一版一起换成同一个字面值。
			".dsmkFooterBtnLabelWrap{position:relative;min-width:0;display:inline-flex;align-items:center}",
			".dsmkFooterBtnIconWrap{position:relative;flex:none;display:inline-flex;align-items:center}",
			".dsmkUpdDot{position:absolute;display:inline-flex;align-items:center;justify-content:center;pointer-events:none}",
			".dsmkUpdDot svg{display:block;fill:none;stroke:#4d6bfe}",
			".dsmkFooterBtnLabelWrap .dsmkUpdDot{top:-1px;right:-12px}",
			".dsmkFooterBtnIconWrap .dsmkUpdDot{top:-2px;right:-7px}",
			// 侧边栏 footer 的容器在上游是 `display:flex`（默认 row，且不换行），每个
			// footer action 都是一个 width:100% 的按钮 —— 两个以上插件同时注册，就被
			// 挤成同一行的半宽/三分宽按钮，文字全被省略号吃掉。改成纵向，一个 action
			// 独占一行。
			//
			// **这条规则在四个 footer 插件里各写一份，是有意的重复**：终端面板最早写下
			// 它，于是「装了终端面板的机器」看着一切正常，而只装了市场 + 余额的机器上
			// 三个图标挤成一行 —— 一个插件的样式在替别的插件兜底，这是隐性依赖。任何
			// 一个插件都可能被单独安装，所以每个往这个槽里放东西的插件都得自带这条。
			// 声明完全相同，重复注入无副作用（后写的覆盖前一条同样的值）。
			//
			// [class*="footerActions"] 与上游 CSS module 的 hash class 弱耦合（同
			// 标题栏 [class*="sidebarCol"] 的先例）；本插件样式运行时注入、晚于 bundle，
			// 同特异性下后写的规则生效。折叠态（图标条）上游另有一条只设
			// width:auto/justify-content:center 的规则，不冲突。
			'[class*="footerActions"]{flex-direction:column;align-items:stretch}',
			// 遮罩与面板的 z-index 必须站到 1000 这一档——这是 dsh 内置弹窗遮罩用的层级，
			// 不是随手取的大数。桌面端（dsDesktop）自绘的标题栏是 z-index:900，它最左段
			// 专门用 --dsw-specific-sidebar-fill 跟侧边栏拼同一种底色。挂在 shell.overlay
			// 里那层是 layout 包的 .overlayLayer{z-index:20}，遮罩最多压到 20，压不过 900：
			// 结果是侧边栏被压暗、标题栏左段纹丝不动，接缝处直接露出色差。所以面板与遮罩
			// 一起 createPortal 到 document.body，跳出那个层叠上下文再用 1000/1001。
			".dsmkBackdrop{position:fixed;inset:0;z-index:1000;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.32));opacity:0;pointer-events:none;transition:opacity .16s ease}",
			".dsmkBackdrop.dsmkOpen{opacity:1;pointer-events:auto}",
			// 从「贴右侧的小抽屉」改成「居中的大弹窗」：卡片网格一行要摆三个，460px 的
			// 抽屉宽度放不下，只能把整个面板做到和应用窗口差不多大（90%），居中显示。
			".dsmkPanel{position:fixed;top:50%;left:50%;z-index:1001;width:90vw;height:90vh;max-width:1320px;max-height:920px;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,#1b1b1c);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.4);color:var(--dsw-alias-label-primary,#f9fafb);font-size:13px;overflow:hidden;" +
			"opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.97);transition:opacity .16s ease,transform .16s ease}",
			".dsmkPanel.dsmkOpen{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}",
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
			".dsmkSearchBox:focus-within{border-color:#4d6bfe}",
			".dsmkSearchBox svg{flex:none;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkSearchInput{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--dsw-alias-label-primary,#f9fafb);font-size:12.5px;font-family:inherit}",
			".dsmkSearchInput::placeholder{color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkSearchClearBtn{flex:none;width:18px;height:18px;padding:0;border:none;border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary,#8b949e);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s ease,color .15s ease}",
			".dsmkSearchClearBtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkSearchMeta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:7px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkResultCount{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			// 排序 + 「只搜 dsh-plugin」整体挪到右侧，和左边的结果计数分开一段距离——
			// 排序下拉之前挤在计数文字的同一个 <span> 里，看着像盖住了那行字。
			".dsmkSearchControls{flex:none;display:flex;align-items:center;gap:14px}",
			".dsmkSortField{display:flex;align-items:center;gap:6px;white-space:nowrap;cursor:default}",
			".dsmkSortFieldLabel{color:var(--dsw-alias-label-tertiary,#8b949e)}",
			// 「搜索全部 npm」开关：整行可点（label 包着 input），不是只有那个小方块可点。
			".dsmkToggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;white-space:nowrap}",
			".dsmkToggle input{margin:0;accent-color:#4d6bfe;cursor:pointer}",
			// 排序：自绘下拉，不用原生 select——原生控件在部分平台不认自定义边框/底色，
			// 会在我们画的 1px 描边外面叠一层它自己的原生黑色边框，看着像描边加粗了；
			// 展开的选项列表同样是系统原生弹层，字号、圆角、阴影全对不上面板的设计，
			// 且几乎没有 CSS 能改——两条投诉的根都在“它是原生 select”这一件事上，
			// 干脆整个换成自己画的按钮 + 弹出菜单，而不是继续在 select 上打补丁。
			".dsmkSortMenuWrap{position:relative}",
			".dsmkSortTrigger{height:24px;padding:0 6px 0 8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:7px;background:var(--dsw-specific-input-major,#2c2c2e);color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:11.5px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:4px}",
			".dsmkSortTrigger:hover{border-color:var(--dsw-alias-border-l2,rgba(255,255,255,.16))}",
			".dsmkSortTrigger:focus-visible{outline:2px solid #4d6bfe;outline-offset:1px}",
			".dsmkSortChevron{display:inline-flex;transform:rotate(90deg);transition:transform .15s ease;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkSortChevronOpen{transform:rotate(-90deg)}",
			// 弹出菜单：面板本身 overflow:hidden 会裁掉超出面板的部分，但排序控件在
			// 顶部搜索栏，面板还有 90vh 高，菜单展开的这几行完全落在面板内，不会被裁。
			".dsmkSortMenu{position:absolute;top:calc(100% + 4px);right:0;z-index:5;min-width:136px;padding:4px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:9px;background:var(--dsw-specific-menu,#353638);box-shadow:0 8px 24px rgba(0,0,0,.32)}",
			".dsmkSortOption{display:block;width:100%;text-align:left;padding:6px 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:12px;font-family:inherit;cursor:pointer}",
			".dsmkSortOption:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb)}",
			".dsmkSortOptionActive{color:#4d6bfe;font-weight:600}",
			".dsmkDownloads{font-variant-numeric:tabular-nums}",
			// 列表
			// scrollbar-gutter:stable —— 滚动条是画在 padding 区里、盖在内容右缘上的，
			// 而「已安装」那一行的卸载按钮正好贴着右缘，于是被压住一半。留出固定的
			// gutter 让内容整体左移，比给每一行单独加右边距可靠（有没有滚动条都一致）。
			".dsmkBody{flex:1;min-height:0;overflow-y:auto;padding:2px 8px 14px;scrollbar-gutter:stable}",
			// 已卸载但还没重启的那张卡片压暗（见 removedNames 的注释）。压暗的范围
			// **只到这一张卡**：面板其余部分照常可用，用户可以接着卸下一个，攒够了
			// 一次重启。
			".dsmkCardRemoved{opacity:.5}",
			// 顺带把滚动条本身收细，跟 dsh 自己的列表观感一致。
			".dsmkBody::-webkit-scrollbar{width:8px}",
			".dsmkBody::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2,rgba(255,255,255,.16));border-radius:999px}",
			".dsmkBody::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-bg-l3,rgba(255,255,255,.26))}",
			".dsmkBody::-webkit-scrollbar-track{background:transparent}",
			// 卡片网格：固定三列（不用 auto-fill——面板宽度已经固定在 90vw，用户要的
			// 就是「一行三个」这个数，不是「能塞几个塞几个」）。
			// minmax(0,1fr) 而不是裸 1fr——裸 1fr 的列宽仍然会被列里最长的 min-content
			// （比如一个不换行的长包名）撑大，三列各自撑的量不一样，就是「左窄右宽」
			// 外加面板整体溢出出现底部横向滚动条这两个现象的根。minmax(0,…) 把列的
			// 最小宽度钉死在 0，配合下面 .dsmkCard 上的 min-width:0，宽度完全交给
			// 网格本身平分，超长文本交给 ellipsis/line-clamp 而不是撑破布局。
			".dsmkGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:2px 4px 6px}",
			".dsmkCard{position:relative;display:flex;flex-direction:column;gap:8px;min-width:0;padding:14px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:12px;background:var(--dsw-alias-bg-layer-1,#151517);color:inherit;font-family:inherit;font-size:13px;text-align:left;transition:background .15s ease,border-color .15s ease}",
			// 发现卡片现在是 div（不能再是 button——里面嵌了安装按钮，button 套 button
			// 是无效 HTML），靠 :not(.dsmkCardStatic) 认出「可点开详情的那种」，不再
			// 靠标签名区分。
			".dsmkCard:not(.dsmkCardStatic){cursor:pointer}",
			".dsmkCardStatic{cursor:default}",
			".dsmkCard:not(.dsmkCardStatic):hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}",
			".dsmkCardSelected{border-color:#4d6bfe}",
			".dsmkCardTitle{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}",
			".dsmkCardName{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}",
			".dsmkCardVersion{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e);font-variant-numeric:tabular-nums}",
			".dsmkCardBadges{display:flex;gap:4px;flex-wrap:wrap}",
			// 描述三行截断：卡片比原来的整行列表窄，两行经常只够放半句话。
			".dsmkCardDesc{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#cfd3d6);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
			// 没有缩略图的卡片，把省下来的高度还给简介（3 行 → 8 行）。8 是照着缩略图
			// 那块地方算的：104px 的图加上它上面的 8px 间距，约等于 6 行 18px 的正文，
			// 再加原本的 3 行——凑不满就是一片空白，同一排里一半卡片显得「没写完」。
			".dsmkCardDescTall{-webkit-line-clamp:8}",
			// 缩略图：16:9 的一条，object-fit:cover 裁剪而不是留黑边——插件截图的长宽比
			// 五花八门，contain 会让每张卡片的图各占一块不同大小的地方，一排看过去很乱。
			".dsmkCardThumb{position:relative;flex:none;height:104px;border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}",
			".dsmkCardThumb img{width:100%;height:100%;object-fit:cover;display:block}",
			// 图还没问出结果时的占位块：形状和真图一模一样，所以图到位那一刻卡片内部
			// 一个像素都不动。轻微呼吸感表示「还在取」，别做成跑马灯——一屏九个跑马灯
			// 比慢本身更烦人。
			".dsmkCardThumbPending{animation:dsmkThumbPulse 1.6s ease-in-out infinite}",
			"@keyframes dsmkThumbPulse{0%,100%{opacity:1}50%{opacity:.45}}",
			".dsmkCardMeta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			// margin-top:auto 把这一行推到卡片底部，不管上面描述/标签占几行——同一
			// 排三张卡片内容多少不一样，footer 不这样处理的话，位置会跟着上面文字的
			// 长短高低不一，三张卡片的按钮对不齐，看着很乱。这是 InstalledRow /
			// BundledRow 用的默认行为；发现卡片改成绝对定位（见下面
			// dsmkCardFooterSplit），margin-top:auto 对 flex 子元素才有意义，被
			// position:absolute 顶掉后这条规则对它不再生效，两边互不影响。
			".dsmkCardFooter{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:auto;padding-top:2px}",
			// 已安装卡片专用：左边是版本/声明（含「App 内置」那句），右边是按钮组，
			// 同一行垂直居中——跟发现卡片的 dsmkCardFooterSplit 是同一个视觉逻辑，
			// 只是这张卡片是自然高度（非绝对定位），复用基础 .dsmkCardFooter 的
			// margin-top:auto 贴底就够了，不需要另外算 padding-bottom。
			".dsmkCardFooterBetween{justify-content:space-between}",
			// 发现卡片的下载量之前用 margin-top:auto 推到底部，实测不够可靠——同一排
			// 三张卡片是否真的等高取决于网格拉伸有没有生效，一旦没有，下载量的位置
			// 又会变回「跟着上面文字长短走」。改成绝对定位，直接钉死在卡片的左下角/
			// 右下角，不再依赖卡片高度是否一致。dsmkCardDiscover 给卡片本身留出这条
			// 绝对定位横条需要的底部空间，不然会盖住描述/标签。
			// **高度是钉死的，不是 min-height。** 这一条修的是「页面一直跳来跳去」：
			// 缩略图是滚进视野才异步去要的，min-height 之下，图一到卡片就长高 100 多
			// 像素，同一行三张卡各自在不同时刻长高，下面所有内容跟着往下弹——用户正
			// 看着的东西会自己跑掉。钉死高度之后，图什么时候到都只影响卡片**内部**
			// 的排版，网格的几何形状从第一帧起就是最终的。
			//
			// 320 是照着「有图」那种卡片的自然高度取的（标题 20 + 图 104 + 简介 3 行 54
			// + 关键词 22 + 各段 8px 间距 + 上下留白 88）。有徽章时会多出一行的量，
			// 那时靠简介自己收缩让位（见下面 dsmkCardDesc 的 flex 规则），不再顶高卡片。
			// padding-bottom 给下面那条绝对定位的页脚留出位置——页脚现在是一整行
			// （按钮和下载量/日期左右对齐、垂直居中），只需要按钮的高度 + 底边距，
			// 不再是从前两行摞起来的高度。
			".dsmkCardDiscover{height:320px;padding-bottom:44px;overflow:hidden}",
			// 简介的高度钉死成刚好 3 行（12px × 1.5 行高 × 3 = 54px），不再靠 flex 收缩
			// 去给徽章多出的一行让位——`flex:0 1 auto` 配 `min-height:0` 曾经让浏览器把
			// 这个盒子压缩到「比 3 行矮、又不是 2 行」的任意高度，line-clamp 还是按 3 行
			// 排版，结果是第三行被从中间切开，只冒出一点点字冠（这正是这条注释要修的
			// bug）。`flex:none` 之后这块高度不会再被别的兄弟元素挤压，代价是徽章多一行
			// 的极端情况可能顶出卡片底部——比「每张卡片的简介随机切出一条不完整的线」
			// 更容易接受。
			".dsmkCardDiscover .dsmkCardDesc{flex:none;height:54px}",
			// 没有缩略图、简介放宽到 8 行（见 dsmkCardDescTall）的卡片，高度按同样的
			// 换算：12px × 1.5 行高 × 8 = 144px。
			".dsmkCardDiscover .dsmkCardDesc.dsmkCardDescTall{height:144px}",
			// 简介高度固定之后，标签行自然会被推低；这里再加一点顶部间距，跟正文分得
			// 更开，不然 54px 卡着刚好 3 行文字，标签紧贴着最后一行看着很挤。
			".dsmkCardDiscover .dsmkChips{flex:none}",
			// 见 DiscoverRow 里加这个 class 的地方：只有「这张卡片上正有安装结果要显示」
			// 才放开高度。
			".dsmkCardGrown{height:auto;min-height:320px;overflow:visible}",
			// 页脚一整行：下载量/更新日期贴左，按钮贴右，垂直居中对齐——按钮的高度
			// 和这行字的中线齐平，而不是文字单独占一行、按钮再摞在上面。之前试过把
			// 元信息单独摞一行在按钮上面，是因为怕「周下载 1.2万 · 更新于 08-31」
			// 加两个按钮在窄卡片上放不下；现在两者对齐同一行，靠 dsmkCardMetaLine
			// 自己的 ellipsis 兜底——真放不下就省略号收尾，不会把按钮挤出卡片。
			//
			// bottom 给 12px 而不是跟着卡片 padding 走的 14px：这一整行的视觉底边比
			// 盒子本身的 padding-box 高一截（文字行盒、按钮圆角都会留白），取 14px
			// 看着反而是「浮着的」。
			".dsmkCardFooterSplit{position:absolute;left:14px;right:14px;bottom:12px;margin-top:0;flex-direction:row;align-items:center;justify-content:space-between;gap:8px}",
			".dsmkCardFooterActions{flex:none;display:flex;gap:8px;justify-content:flex-end}",
			// 元信息一行放不下就整体省略，不换行——换行会把卡片顶高，而卡片是等高的。
			".dsmkCardMetaLine{flex:1;display:flex;align-items:center;gap:6px;min-width:0;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e);white-space:nowrap;overflow:hidden}",
			".dsmkCardMetaLine>span{overflow:hidden;text-overflow:ellipsis}",
			".dsmkCardMetaDot{flex:none;opacity:.5}",
			// 下载量字号比正文小一档、颜色用更淡的三级文字色——它是辅助信息，不该跟
			// 「详情」「安装」这两个按钮抢视觉重量。
			".dsmkCardFooterSplit .dsmkDownloads{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			// 详情态：点开一张卡片后，网格整个换成这个——而不是在网格里就地撑高那一张卡，
			// 后者会让同一行另外两张卡片下面空出一大块，看着像排版坏了。
			".dsmkDetailView{display:flex;flex-direction:column;gap:10px;padding:2px 6px 12px}",
			// 返回按钮吸顶：详情内容（截图、依赖表）可以很长，按钮和普通内容一起放在
			// 里面的话，滚下去之后它就跟着看不见了——「返回」这种导航动作理应随时够得着。
			// 背景色对齐面板底色（不是卡片底色），这样贴顶之后盖住下面滚过来的内容时
			// 看不出接缝。
			".dsmkBackBtn{position:sticky;top:0;z-index:2;align-self:flex-start;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px 0 8px;border:none;border-radius:8px;background:var(--dsw-specific-sidebar-fill,#1b1b1c);color:var(--dsw-alias-label-primary,#f9fafb);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}",
			".dsmkBackBtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.1))}",
			".dsmkBackBtn svg{transform:rotate(180deg)}",
			// 详情内容包一层跟卡片同款的边框/圆角/底色——从网格点进来时视觉上是
			// 「同一张卡片被打开看大图」，而不是跳进另一套完全不同风格的页面。
			".dsmkDetailCard{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:12px;background:var(--dsw-alias-bg-layer-1,#151517);padding:14px;display:flex;flex-direction:column;gap:10px}",
			".dsmkDetailCard>.dsmkDetail{padding:0}",
			".dsmkDetailHead{display:flex;align-items:center;flex-wrap:wrap;gap:8px}",
			".dsmkDetailHeadName{font-weight:600;font-size:15px}",
			".dsmkDetailDesc{font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			".dsmkLoadMore{padding:12px;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			// 徽章
			".dsmkBadge{flex:none;display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 7px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.01em;white-space:nowrap}",
			".dsmkBadgeOk{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#3fb950) 16%,transparent);color:var(--dsw-alias-state-success-primary,#3fb950)}",
			".dsmkBadgeMuted{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkBadgeWarn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e3a008) 16%,transparent);color:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".dsmkBadgeBrand{background:color-mix(in srgb,#4d6bfe 16%,transparent);color:#4d6bfe}",
			// 展开区
			".dsmkDetail{padding:2px 10px 12px;display:flex;flex-direction:column;gap:10px}",
			".dsmkDetailNote{font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			".dsmkDetailWarn{color:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".dsmkDetailErr{color:var(--dsw-alias-state-error-primary,#f0617a)}",
			".dsmkFacts{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:12px;align-items:baseline}",
			".dsmkFactKey{color:var(--dsw-alias-label-tertiary,#8b949e);white-space:nowrap}",
			".dsmkFactValue{min-width:0;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			".dsmkLink{color:#4d6bfe;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;max-width:100%;vertical-align:bottom}",
			".dsmkLink:hover{text-decoration:underline}",
			// margin-top 一点：紧跟在简介后面，不加的话最后一行字和标签贴得太近。
			".dsmkChips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}",
			// 截图条：横向滚动而不是换行铺开。插件截图多是宽图，铺开会把详情区撑得
			// 老长，把下面的安装按钮挤出视野——而那才是用户看完截图要点的东西。
			".dsmkShots{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}",
			".dsmkMirrorBox{display:flex;flex-direction:column;gap:6px;padding:9px 11px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,#151517);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#cfd3d6)}",
			".dsmkMirrorHint{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkShot{flex:none;height:110px;width:auto;max-width:100%;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:var(--dsw-alias-bg-layer-1,#151517);object-fit:contain;cursor:zoom-in}",
			// 放大查看：又一个铺满视口的层，所以同样要站在 1000 这一档之上（面板本身
			// 是 1001，它得压过面板）。
			".dsmkLightbox{position:fixed;inset:0;z-index:1002;display:flex;align-items:center;justify-content:center;padding:40px;box-sizing:border-box;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.6));cursor:zoom-out}",
			// **尺寸用 vw/vh 算死，不用百分比。** 原来是 `display:grid;place-items:center`
			// 加 `max-width/max-height:100%`：网格行是 auto 尺寸，行高又要由图片自己
			// 决定，百分比上限于是解析成 none —— 大图按原始尺寸铺出去，顶天立地一张，
			// 上下都看不全（这就是「点开以后太大了、显示不全」）。改成 flex 居中，
			// 上限直接对着视口算（减掉两边各 40px 的 padding），不再依赖任何一层
			// 容器把高度传下来。width/height:auto 保住原始长宽比。
			".dsmkLightbox img{max-width:calc(100vw - 80px);max-height:calc(100vh - 80px);width:auto;height:auto;object-fit:contain;border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.45)}",
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
			// 「一键更新」那个绿按钮。绿色是刻意的，不跟安装那个品牌蓝共用：蓝色在这个面板里
			// 表示「装一个新东西」，一键更新处理的全是**已经装着的**插件，它不新增任何东西，
			// 只是把手上的推到最新。用同一个蓝会让人误以为它要装点什么。绿也正好和结果条里
			// 那句成功提示（.dsmkResultOk）用的是同一个 success token，视觉上是一路的。
			".dsmkOkBtn{flex:none;height:30px;padding:0 14px;border:none;border-radius:8px;background:var(--dsw-alias-state-success-primary,#3fb950);color:var(--dsw-alias-label-primary-inverted,#fff);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:filter .15s ease,opacity .15s ease}",
			".dsmkOkBtn:hover:not(:disabled){filter:brightness(1.12)}",
			".dsmkOkBtn:disabled{opacity:.55;cursor:default}",
			// 已安装 tab 顶上那一条：左边说明「有几个能升」，右边是一键更新按钮。位置跟
			// 发现 tab 的搜索栏（.dsmkSearch）对齐 —— 同一个位置在两个 tab 里各放各的
			// 工具条，切 tab 时按钮不会跳。它在滚动区之外，列表滚多远这个按钮都在。
			//
			// **右边距 20px 不是随手取的**：按钮的右缘要和最右那一列卡片的右边框对齐，
			// 而卡片右缘离面板右边正好 20px —— .dsmkBody 的 8px padding + 它
			// scrollbar-gutter:stable 留出的 8px（滚动条宽度，见下面 ::-webkit-scrollbar）
			// + .dsmkGrid 的 4px padding。这三个数任何一个改了，这里要跟着重算，
			// 否则按钮就会比卡片多探出去（或缩进去）一截。test 里锁了这条等式。
			//
			// 左边距仍是 14px，跟发现 tab 的搜索栏一致：那半边是说明文字，不跟卡片对齐
			// 也看不出来，跟同槽位的另一个工具条对齐反而更要紧（切 tab 时不跳）。
			".dsmkUpdateAllBar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 20px 8px 14px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkUpdateAllNote{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			// 卸载是实体按钮（有边框），不是「看起来像文字的东西」：它和上面那个开关是
			// 两种不同性质的动作，长得像会让人以为它们是一组的。静置时中性描边，进入
			// 确认态才变红——红色留给「下一次点击真的会删」那一刻。
			".dsmkDangerBtn{height:28px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:12.5px;font-family:inherit;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}",
			".dsmkDangerBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#f9fafb);border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.2))}",
			".dsmkDangerBtnArmed{background:var(--dsw-alias-state-error-primary,#f0617a);color:var(--dsw-alias-label-primary-inverted,#fff);border-color:var(--dsw-alias-state-error-primary,#f0617a)}",
			// 动作行：和内容分开的一行，按钮右对齐。上面那行放开关（状态），这行放卸载
			// （破坏性动作）——两者性质不同，不该并排。
			".dsmkDangerBtnArmed:hover:not(:disabled){background:var(--dsw-alias-state-error-primary,#f0617a);color:var(--dsw-alias-label-primary-inverted,#fff)}",
			".dsmkDangerBtn:disabled{opacity:.55;cursor:default}",
			".dsmkResult{font-size:12px;line-height:1.55}",
			".dsmkResultOk{color:var(--dsw-alias-state-success-primary,#3fb950)}",
			".dsmkResultErr{color:var(--dsw-alias-state-error-primary,#f0617a)}",
			// 失败时把包管理器的原始输出摊出来。「操作失败」四个字对排查毫无帮助，
			// 真实原因（网络、权限、peer 冲突）都写在 pnpm 输出的末尾。
			".dsmkOutput{margin:0;padding:8px 9px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,#151517);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#8b949e);max-height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word}",
			// 分组标题：已安装 tab 分「桌面自带」与「从市场安装」两组，两组的可操作性
			// 完全不同（一个只能开关、一个只能卸载），不分开会让用户以为自带的也能卸。
			".dsmkGroup{margin-top:6px}",
			".dsmkGroup:first-child{margin-top:0}",
			".dsmkGroupTitle{display:flex;align-items:baseline;gap:8px;padding:8px 8px 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkGroupHint{text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsmkPending{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 8px 6px;font-size:11.5px;color:var(--dsw-alias-state-warn-primary,#e3a008)}",
			".dsmkPending .dsmkGhostBtn{height:24px;padding:0 10px;font-size:11.5px;color:inherit;border-color:currentColor}",
			// 没有改动时仍占位（见上面 JSX 的注释），只是不可见/不可交互。
			".dsmkPendingHidden{visibility:hidden}",
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
			".dsmkSwitch input:focus-visible+.dsmkSwitchTrack{outline:2px solid #4d6bfe;outline-offset:2px}",
			".dsmkSwitch input:disabled{cursor:default}",
			".dsmkSwitch input:disabled+.dsmkSwitchTrack{opacity:.45}",
			// 空 / 错误 / 加载
			".dsmkNotice{padding:18px 12px;text-align:center;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-tertiary,#8b949e)}",
			".dsmkNoticeErr{color:var(--dsw-alias-state-error-primary,#f0617a)}",
			".dsmkRetry{margin-top:8px;height:26px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary,#f9fafb);font-size:12px;font-family:inherit;cursor:pointer}",
			".dsmkRetry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}",
			// 底部一行：显示当前 profile。装到哪儿去了是这个面板最该说清楚的一件事。
			".dsmkFooter{flex:none;padding:8px 14px 12px;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b949e);border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.06));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			// 设置面板里的「更新」分区：外壳与内核各自的更新状态（见 DesktopSection）。
			// 这个分区渲染在**原生设置弹窗**里，不是市场自己那个深色面板——`height:100%`
			// 撑满 dsh 那个 `.options` 容器（它本身已经是撑满弹窗高度的），两个按钮才能
			// 在整个可视区域里居中，而不是贴在容器顶部（容器不设高度时，`min-height` 那种
			// 写法量出来的只是内容自身高度，看着完全没居中）。
			".dsmkDesktopSection{height:100%;box-sizing:border-box;padding:24px 16px;display:flex;align-items:center;justify-content:center}",
			".dsmkDesktopRow{display:flex;flex-direction:column;align-items:center;gap:14px}",
			// 专门给这两个按钮起的类，不复用 .dsmkGhostBtn/.dsmkPrimaryBtn——那两个是
			// 给市场自己那个深色面板调的观感，糊到原生浅色设置页里边框全糊在背景色里，
			// 跟旁边「打开配置文件」那种原生药丸按钮明显不是一路。
			".dsmkDesktopBtn{min-width:240px;height:38px;padding:0 22px;border-radius:999px;border:1.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.03));color:var(--dsw-alias-label-primary,#1b1b1c);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s ease,border-color .15s ease,opacity .15s ease}",
			".dsmkDesktopBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}",
			".dsmkDesktopBtn:disabled{opacity:.6;cursor:default}",
			".dsmkDesktopBtnPrimary{background:#4d6bfe;border-color:#4d6bfe;color:#fff}",
			".dsmkDesktopBtnPrimary:hover:not(:disabled){background:#3f5ce0;border-color:#3f5ce0}",
			// 设置面板顶部工具栏的角标按钮：跟侧边栏那个插件更新叹号是同一个视觉语言，
			// 但这个管的是外壳自己的版本，数据来源是 window.desktop，只有桌面端才会挂载。
			".dsmkHeaderUpdateBtn{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border:none;border-radius:999px;background:color-mix(in srgb,#4d6bfe 16%,transparent);color:#4d6bfe;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap}",
			".dsmkHeaderUpdateBtn:hover{background:color-mix(in srgb,#4d6bfe 26%,transparent)}"
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
		function createOpenStore(initialOpen) {
			let open = initialOpen === true;
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

		/**
		 * 市场把**自己**更新掉的那一次，留给下一条命的字条。
		 *
		 * 这个插件的客户端半是被 dsh 的内核热换掉的：`@deepseek-ai/dsh-client-hmr` 每
		 * 500ms stat 一遍每个插件的 client.js，内容一变就推一帧 `rebuilt`，浏览器半
		 * 收到之后 **dispose 掉这个插件的 fiber 再拿新 bundle 重新 apply**。更新别的
		 * 插件时被换掉的是那个插件，市场面板安然无恙；更新市场自己时，被销毁的正是
		 * 正在显示「更新成功」的这个面板——用户看到的是「点完更新，面板闪了一下就没了，
		 * 也没提示要重启」。pnpm 写完文件到 HMR 发现，中间只有半秒，那条结果提示根本
		 * 来不及被看见。
		 *
		 * 拦不住那次热换（那是内核的机制，也确实该换），能做的是**先把话写下来**：
		 * 点更新之前就把「等会儿要说什么」存进 sessionStorage，新的一条命起来时读回来，
		 * 把面板重新打开、把「重启后生效」这条横幅接着显示。
		 *
		 * 为什么是 sessionStorage 而不是 localStorage：这条记录的有效期就是「到下次
		 * 重启为止」。重启应用 = 新的渲染进程 = sessionStorage 自然清空，不需要谁去
		 * 记得删它——用 localStorage 的话，重启之后那条「有 1 项改动没生效」还会顶在
		 * 那儿，而它已经生效了。
		 */
		const SELF_UPDATE_KEY = "dsmk:self-update";
		function readSelfUpdate() {
			try {
				const raw = sessionStorage.getItem(SELF_UPDATE_KEY);
				if (raw === null) return null;
				const parsed = JSON.parse(raw);
				return parsed && typeof parsed.name === "string" ? parsed : null;
			} catch { return null; }
		}
		function writeSelfUpdate(value) {
			try { sessionStorage.setItem(SELF_UPDATE_KEY, JSON.stringify(value)); } catch { /* 忽略 */ }
		}
		function clearSelfUpdate() {
			try { sessionStorage.removeItem(SELF_UPDATE_KEY); } catch { /* 忽略 */ }
		}

		/** 角标轮询间隔。见 createUpdatesStore 的注释：宁可慢，别把 registry 打疼。 */
		const UPDATES_POLL_MS = 30 * 60 * 1000;

		/**
		 * 「有几个已安装插件能升级」——侧边栏那个小叹号的唯一数据源。
		 *
		 * 跟开关状态分成两个 store 而不是合成一个：面板只关心「开没开」，合了之后
		 * 每半小时轮询回来一次就会把整个面板重渲染一遍，白费。快照是个**数字**，
		 * 原始值天然满足 useSyncExternalStore 「没变就必须全等」的要求，不用缓存对象。
		 */
		function createUpdatesStore() {
			let count = 0;
			const listeners = new Set();
			const set = (next) => {
				const value = Number.isFinite(next) && next > 0 ? Math.trunc(next) : 0;
				if (value === count) return;
				count = value;
				listeners.forEach((fn) => fn());
			};
			return {
				getSnapshot: () => count,
				subscribe: (fn) => {
					listeners.add(fn);
					return () => listeners.delete(fn);
				},
				set,
				/**
				 * 拉一次服务端的计数。`force` 跳过服务端那 10 分钟缓存。
				 *
				 * 失败（离线、定位不到 profile）**保持上一次的数字**，不清零：抹掉角标
				 * 等于谎报「没有更新」，而上一次那个数至少曾经是真的。
				 */
				refresh: async (force) => {
					try {
						const result = await getJson("/api/dsdesktop/market/updates" + (force ? "?force=1" : ""));
						if (result && result.ok) set(result.data.count);
					} catch { /* 同上：宁可显示旧的，也不假装没有 */ }
				}
			};
		}

		/**
		 * 外壳自身（不是插件）有没有新版本——数据来自 Electron 主进程的
		 * `AppUpdateChecker`（app-updater.js），经 preload 桥 `window.desktop` 转一手。
		 * 网页版没有这座桥，`isDesktopShell()` 为 false 时这整套都不会注册。
		 *
		 * 跟 `createUpdatesStore` 分开是两件事：那个查的是 profile 里插件有没有更新
		 * （host 端 HTTP 路由，10 分钟缓存），这个查的是外壳自己的 GitHub Release
		 * （Electron 主进程 24h 节流），数据源、缓存策略都不是一回事，硬合一个 store
		 * 只会让两条节流逻辑在一份状态里打架。
		 */
		function createAppUpdateStore() {
			let state = { phase: "idle", latestVersion: null, releaseUrl: null };
			const listeners = new Set();
			const set = (next) => {
				if (!next) return;
				if (next.phase === state.phase && next.latestVersion === state.latestVersion && next.releaseUrl === state.releaseUrl) return;
				state = next;
				listeners.forEach((fn) => fn());
			};
			return {
				getSnapshot: () => state,
				subscribe: (fn) => {
					listeners.add(fn);
					return () => listeners.delete(fn);
				},
				// 轻量：只读主进程内存里已经知道的结果，不发起网络请求——设置面板顶部的
				// 角标要在**设置面板一次都没打开过**的时候就有数，跟侧边栏插件角标是
				// 同一个理由（见 apply() 里的轮询注释）。
				refresh: async () => {
					if (!isDesktopShell() || typeof window.desktop.getAppUpdateState !== "function") return;
					try {
						set(await window.desktop.getAppUpdateState());
					} catch { /* 拿不到就保留上一次的状态，不假装「没有更新」 */ }
				},
				// 重：真的去 GitHub 查一遍。只在设置面板「桌面版」分区打开时跑。
				check: async () => {
					if (!isDesktopShell() || typeof window.desktop.checkAppUpdate !== "function") return state;
					try {
						set(await window.desktop.checkAppUpdate());
					} catch { /* 同上 */ }
					return state;
				}
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
		function UpdateBangIcon({ size }) {
			// 圆圈 + 一竖 + 一点。`h.01` 配 round 线帽就是那个点——比画一个 circle 少一个
			// 节点，且粗细跟着 strokeWidth 一起变，三笔永远配套。
			// r 取 9.5 而不是 10：描边 2.6 会往外溢 1.3，10 的话圆的上下左右刚好被
			// viewBox 切掉一线，缩到 12px 尤其明显。
			return svg([
				react_jsx_runtime.jsx("circle", { cx: "12", cy: "12", r: "9.5" }, "a"),
				react_jsx_runtime.jsx("path", { d: "M12 7.4v5.2" }, "b"),
				react_jsx_runtime.jsx("path", { d: "M12 16.6h.01" }, "c")
			// stroke 写死而不是留 currentColor：currentColor 会去继承按钮的文字色（灰/白），
			// 而这个角标的全部意义就是从那片灰里跳出来。CSS 里同色的那条是主力，这个
			// 表现属性兜的是「样式表没挂上」的极端情况。
			], size, { strokeWidth: "2.6", stroke: "#4d6bfe" });
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
		/**
		 * 发现页卡片的缩略图：包名 → 代理地址（或 null＝这个包没有可用的图）。
		 *
		 * 一张缩略图的真实代价是服务端去抓一次 npm 的全量 packument（README 只在那里
		 * 面，dshmarket 实测 416KB），所以这条路上每一层都在压请求数：
		 *
		 *   - 只有**滚进视野**的卡片才要图（IntersectionObserver，见 DiscoverRow）；
		 *   - 同一个包只要一次，结果连 null 一起缓存（`previewCache` 存的是「问过了」，
		 *     不是「有图」）——翻回上一屏、切排序、重搜都直接命中；
		 *   - 同时最多 3 个在飞，其余排队。一屏二十几张卡片同时进视野是常态，一口气
		 *     发二十几个请求出去，先撞的是 registry 的限流，然后是所有卡片一起变慢；
		 *   - 队列是**后进先出**，而且滚出视野的会被撤回。理由见下面 previewQueue。
		 *
		 * 缓存放在模块作用域而不是组件里：卡片会随搜索/翻页反复卸载重建，挂在组件上
		 * 等于每次重建都重抓一遍。
		 */
		const previewCache = new Map();
		/** 包名 → `{ item, list: onDone[], started }`，同一个包的多张卡片搭同一趟车。 */
		const previewWaiters = new Map();
		/**
		 * 待抓队列，**当栈用（后进先出）**。
		 *
		 * 先进先出是这个面板「越滚越慢」的根：队列里排着的是**你已经滚过去的**那些
		 * 卡片，而你正看着的这一屏排在它们后面。一屏 9 张、每张背后是一次 416KB 的
		 * packument、同时只跑 3 个——滚过三屏，眼前的图就得等前面二十几个先跑完。
		 *
		 * 后进先出正好相反：最后排进来的一定是刚滚进视野的那一批，先给它们。配合
		 * DiscoverRow 里「滚出视野就撤回排队」（loadPreview 返回的那个函数），队列里
		 * 剩下的永远只有当前这一屏和它上下各一行。
		 */
		const previewQueue = [];
		const PREVIEW_CONCURRENCY = 3;
		let previewActive = 0;
		/**
		 * 提前量：视野上下各多算一行卡片（一行约 320px + 12px 间距）。
		 *
		 * 用户要的就是「滚到哪一屏就加载哪一屏，外加下面一行」——多预取一行是为了
		 * 匀速下滚时图能先一步就位，再多就又变回「替看不见的卡片抢带宽」了。
		 */
		const PREVIEW_AHEAD = "340px 0px";
		/**
		 * 「还没有答案」这个态。用 undefined 是为了和 previewCache.get 的「没问过」
		 * 天然对上——卡片的初值直接取缓存就行，不用再翻译一层。
		 */
		const THUMB_PENDING = undefined;
		/**
		 * `/preview` 这条路由在当前这个内核上不存在。
		 *
		 * **这不是假想的情况，是这个插件的常态窗口期**：市场更新自己时，内核的
		 * client-hmr 只换客户端半（见 SELF_UPDATE_KEY），node 半要等内核重启才是新的。
		 * 也就是说「新客户端跑在旧服务端上」这段时间里，这一版新加的路由必然 404 ——
		 * 缩略图会**整片空白**，而用户刚更新完，只会以为是新版本坏了。
		 *
		 * 所以退回 `/detail`：它一直就有，返回的 `images[0].src` 和 `/preview` 是同一个
		 * 代理地址，只是多打一次 latest manifest（README 那次抓取两边共用同一份缓存）。
		 * 一旦发现 404 就整场都走这条路，不必每张卡片各撞一次。
		 */
		let previewRouteMissing = false;
		/** 拿一个包的第一张预览图地址；拿不到（没图、没网、路由不在）一律 null。 */
		async function fetchPreviewSrc(item) {
			const name = item.name;
			if (!previewRouteMissing) {
				const qs = `name=${encodeURIComponent(name)}` + (item.github ? `&slug=${encodeURIComponent(item.github)}` : "");
				// 404 的响应体是 `text/plain` 的 "not found"，`res.json()` 会抛 —— 抛了
				// 才算「路由不在」。服务端正常回的 `{ok:false,…}` 是**答案**，不是缺路由。
				const result = await getJson(`/api/dsdesktop/market/preview?${qs}`).catch(() => null);
				if (result !== null) return result.ok && typeof result.data.src === "string" ? result.data.src : null;
				previewRouteMissing = true;
			}
			const detail = await getJson(`/api/dsdesktop/market/detail?name=${encodeURIComponent(name)}`).catch(() => null);
			if (detail === null || !detail.ok || !Array.isArray(detail.data.images) || detail.data.images.length === 0) return null;
			return detail.data.images[0].src;
		}
		function pumpPreview() {
			while (previewActive < PREVIEW_CONCURRENCY && previewQueue.length > 0) {
				// pop 而不是 shift：先服务最后排进来的，见 previewQueue 的注释。
				const name = previewQueue.pop();
				const entry = previewWaiters.get(name);
				// 排队期间卡片全滚走了（cancel 把 waiters 摘掉了）：这一趟不用跑。
				if (entry === undefined) continue;
				entry.started = true;
				previewActive += 1;
				// catch 在前：任务体本身已经把错误都吞干净了，但真漏出来一个的话，
				// 计数不减就等于把这条队列永久卡死，剩下的卡片一张图都拿不到。
				runPreview(entry).catch(() => {}).then(() => {
					previewActive -= 1;
					pumpPreview();
				});
			}
		}
		async function runPreview(entry) {
			const name = entry.item.name;
			let src = null;
			// slug 会一起带上：README 里写相对路径的图，服务端要靠它还原成
			// GitHub raw 地址，不给就只能丢掉那些图。
			try { src = await fetchPreviewSrc(entry.item); } catch { /* 取不到就是没有图，卡片照常显示 */ }
			previewCache.set(name, src);
			previewWaiters.delete(name);
			// 请求已经发出去了就跑完、结果照样进缓存——哪怕这会儿一个等的人都没有。
			// 白等一趟总比「滚回去还得重抓一次」强。
			for (const notify of entry.list) {
				try { notify(src); } catch { /* 某张卡片已经卸载了，不影响其余的 */ }
			}
		}
		/**
		 * 要一个包的缩略图地址。
		 * @returns {() => void} 撤回这次等待。卡片滚出视野或卸载时**必须**调它：
		 *   还没轮到的会直接从队列里摘掉，把 3 个并发的名额让给用户正看着的那一屏。
		 */
		function loadPreview(item, onDone) {
			const name = item.name;
			const cached = previewCache.get(name);
			if (cached !== undefined) { onDone(cached); return () => {}; }
			const waiting = previewWaiters.get(name);
			// 已经有人在等同一个包了：搭上那一趟，别再排一次队。
			if (waiting !== undefined) waiting.list.push(onDone);
			else {
				previewWaiters.set(name, { item, list: [onDone], started: false });
				previewQueue.push(name);
				pumpPreview();
			}
			return () => {
				const entry = previewWaiters.get(name);
				if (entry === undefined) return;
				const at = entry.list.indexOf(onDone);
				if (at >= 0) entry.list.splice(at, 1);
				// 还在排队、而且没人等了才撤：已经在飞的那趟让它跑完（见 runPreview）。
				if (entry.list.length > 0 || entry.started) return;
				previewWaiters.delete(name);
				const queued = previewQueue.indexOf(name);
				if (queued >= 0) previewQueue.splice(queued, 1);
			};
		}
		/** 桌面外壳有没有给我们「重启应用」的入口（preload 注入的薄桥，网页版没有）。 */
		function restartAvailable() {
			return typeof window !== "undefined" && window.desktop && typeof window.desktop.restartApp === "function";
		}
		/** 同一座桥在不在——「桌面版」设置分区与外壳更新角标整体只在桌面端注册。 */
		function isDesktopShell() {
			return typeof window !== "undefined" && window.desktop && window.desktop.isDesktop === true;
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
		const SORT_VALUES = ["downloads-week", "downloads-month", "updated"];
		function readSort() {
			try {
				const stored = localStorage.getItem(SORT_KEY);
				return SORT_VALUES.includes(stored) ? stored : "downloads-week";
			} catch { return "downloads-week"; }
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

		/**
		 * 排序下拉，自己画，不用原生 `<select>`——理由见 CSS 里 `.dsmkSortMenuWrap`
		 * 上面那段注释：原生控件的自带边框、以及展开列表的系统原生弹层，两条都是
		 * 没法用 CSS 完全压下去的。
		 */
		function SortMenu({ t, value, values, onChange }) {
			const [open, setOpen] = react.useState(false);
			const rootRef = react.useRef(null);
			react.useEffect(() => {
				if (!open) return undefined;
				const onDocDown = (e) => {
					if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
				};
				const onKeyDown = (e) => { if (e.key === "Escape") setOpen(false); };
				document.addEventListener("mousedown", onDocDown);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("mousedown", onDocDown);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open]);
			return react_jsx_runtime.jsxs("div", { className: "dsmkSortField", children: [
				react_jsx_runtime.jsx("span", { className: "dsmkSortFieldLabel", children: t("market.sort.label") }),
				react_jsx_runtime.jsxs("div", { className: "dsmkSortMenuWrap", ref: rootRef, children: [
					react_jsx_runtime.jsxs("button", {
						type: "button",
						className: "dsmkSortTrigger",
						"aria-haspopup": "listbox",
						"aria-expanded": open,
						"aria-label": t("market.sort.label"),
						onClick: () => setOpen((v) => !v),
						children: [
							react_jsx_runtime.jsx("span", { children: t("market.sort." + value) }),
							react_jsx_runtime.jsx("span", {
								className: "dsmkSortChevron" + (open ? " dsmkSortChevronOpen" : ""),
								children: react_jsx_runtime.jsx(ChevronIcon, { size: 12 })
							})
						]
					}),
					open ? react_jsx_runtime.jsx("div", { className: "dsmkSortMenu", role: "listbox", children:
						values.map((v) => react_jsx_runtime.jsx("button", {
							type: "button",
							role: "option",
							"aria-selected": v === value,
							className: "dsmkSortOption" + (v === value ? " dsmkSortOptionActive" : ""),
							onClick: () => { onChange(v); setOpen(false); },
							children: t("market.sort." + v)
						}, v))
					}) : null
				] })
			] });
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
		 * 一次安装/卸载的结果条。「重启应用」不单独画在这——装好的插件要下次内核启动
		 * 才被加载，但那个入口跟停用/启用共用面板底部那一条（见下面的 dsmkPending），
		 * 不必每张卡片各配一个重启按钮。失败时把包管理器的原始输出摊出来。
		 */
		function ActionResult({ t, action }) {
			if (!action || action.status === "running") return null;
			if (action.status === "ok") {
				return react_jsx_runtime.jsx("div", { className: "dsmkActions", children:
					react_jsx_runtime.jsx("span", { className: "dsmkResult dsmkResultOk", children: action.message })
				});
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

		// 卡片上关键词那一排是给「一眼看出这插件是干嘛的」用的，不是给「它是不是
		// dsh 插件」用的——这一族插件人人都打这几个标配词，全展示等于没展示，
		// 挤占了本该留给真正有信息量的词（比如 "terminal"、"billing"）的位置。
		const DISCOVER_CHIP_STOPWORDS = new Set(["dsh-plugin", "dsh", "deepseek", "deepseek-harness", "harness"]);

		/** 从 package.json 的 repository.url 里拆一个 `owner/repo` 出来，拆不出来就是 null。
		 * 已安装卡片没有搜索结果自带的 `github` 字段，只有这条 URL，缩略图想要跟
		 * 发现页一样能还原 README 里的相对路径图，就得自己拆一次。 */
		function repositoryToGithubSlug(repository) {
			if (typeof repository !== "string") return null;
			const m = repository.match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(\.git)?$/);
			return m ? `${m[1]}/${m[2]}` : null;
		}

		/**
		 * 卡片缩略图的懒加载：滚进视野才去要图，命中缓存就立刻给结果。发现卡片和
		 * 已安装卡片现在共用同一份——两者对「缩略图该怎么取」的答案完全一样，只是
		 * item 的来源不同（搜索结果 vs 本地 package.json），拆成 hook 避免两处各写
		 * 一遍、迟早改岔了。
		 * @param {{name: string, github?: string|null}} item
		 */
		function useCardThumbnail(item) {
			const cardRef = react.useRef(null);
			const [thumb, setThumb] = react.useState(() => previewCache.get(item.name));
			const [thumbBroken, setThumbBroken] = react.useState(false);
			react.useEffect(() => {
				setThumbBroken(false);
				const cached = previewCache.get(item.name);
				if (cached !== undefined) { setThumb(cached); return undefined; }
				const node = cardRef.current;
				// IntersectionObserver 在测试环境（伪 DOM）里没有。拿不到就干脆不要图：
				// 退化成「所有卡片都立刻要图」等于把上面那套压请求的努力全抵消掉。
				// 也别停在占位块上——那会变成一片永远转不完的灰块。
				if (node === null || typeof IntersectionObserver !== "function") { setThumb(null); return undefined; }
				setThumb(THUMB_PENDING);
				let alive = true;
				let cancel = null;
				let settled = false;
				const finish = (src) => {
					if (!alive || settled) return;
					settled = true;
					cancel = null;
					// 有答案了就不用再盯着：图要么有要么没有，不会因为再滚进来一次就变。
					observer.disconnect();
					setThumb(src);
				};
				const observer = new IntersectionObserver((entries) => {
					const visible = entries.some((entry) => entry.isIntersecting);
					if (visible) {
						if (settled || cancel !== null) return;
						const undo = loadPreview(item, finish);
						// finish 可能是同步跑完的（缓存命中），那就没什么好撤的了。
						if (!settled) cancel = undo;
					} else if (cancel !== null) {
						// 还没轮到就滚出去了：撤回排队，把并发名额让给眼前这一屏。
						// 下次滚回来会重新排（结果那时多半已经在缓存里了）。
						cancel();
						cancel = null;
					}
				}, { rootMargin: PREVIEW_AHEAD });
				observer.observe(node);
				return () => { alive = false; if (cancel !== null) cancel(); observer.disconnect(); };
			}, [item.name, item.github]);
			const showThumb = typeof thumb === "string" && !thumbBroken;
			// 还没有答案：占位块占住图的位置（高度和真图一模一样）。
			const pendingThumb = thumb === THUMB_PENDING;
			return { cardRef, thumb, showThumb, pendingThumb, setThumbBroken };
		}

		/**
		 * 发现 tab 的一张卡片：点卡片本身、或点「详情」按钮，都进详情态（见
		 * MarketPanelBody 里的 discoverContent）；点「安装」直接装，不用先展开。
		 *
		 * 卡片因此不能再是原生 `<button>`：装/详情两个按钮本身也是 `<button>`，
		 * `<button>` 嵌 `<button>` 是无效 HTML（浏览器会把内层的挤出去，行为不可
		 * 预期）。改成 `<div role="button">` + 手动接键盘事件，两个按钮点击时都要
		 * `stopPropagation`，不然点它们会同时触发卡片自己的展开。
		 *
		 * 卡片上不知道这个包**能不能装**（那要看 manifest 里的 dsh.bundle，得展开
		 * 详情才能拿到，搜索结果里没有这个字段）——不等于不能给安装按钮，装不上时
		 * `/install` 自己会返回 `not-installable` 错误，跟展开详情后再点没有区别，
		 * 只是提前到点下去那一刻才发现，而不是先多一步展开。
		 */
		function DiscoverRow({ t, item, expanded, onToggle, installedNames, downloadsLabel, showTagged, action, canInstall, busy, onInstall }) {
			const installed = installedNames.has(item.name);
			const installing = action && action.status === "running";
			// 缩略图：卡片滚进视野才去要（代价见 loadPreview 的注释），逻辑在
			// useCardThumbnail 里——已安装卡片现在也用同一份。
			//
			// 「还没有答案」画成占位块而不是当成没有图：卡片高度虽然是钉死的（见
			// .dsmkCardDiscover），但简介的行数会跟着图的有无变（3 行 / 8 行），
			// 图晚几秒到就是一次文字重排。占位块让**有图的那些卡片**（绝大多数）
			// 从第一帧起就是最终版式。
			const { cardRef, thumb, showThumb, pendingThumb, setThumbBroken } = useCardThumbnail(item);
			// 原生 title：鼠标悬浮就能看到完整名字 + 版本 + 描述，不用点进详情才知道
			// 这张卡片说的是什么——尤其是描述被三行截断、名字被省略号截断的时候。
			const hint = [item.name, item.version, item.description].filter(Boolean).join(" · ");
			const chips = (item.keywords || []).filter((k) => !DISCOVER_CHIP_STOPWORDS.has(k)).slice(0, 4);
			return react_jsx_runtime.jsxs("div", {
				// action 在的时候放开固定高度：安装结果那几行字是在卡片正文流里画的，
				// 高度钉死 + overflow:hidden 会把它裁掉，用户点完安装什么反馈都看不到。
				// 这时候卡片长高是**对点击的直接回应**，不是「自己乱跳」。
				className: "dsmkCard dsmkCardDiscover" + (action ? " dsmkCardGrown" : "") + (expanded ? " dsmkCardSelected" : ""),
				ref: cardRef,
				role: "button",
				tabIndex: 0,
				"aria-pressed": expanded,
				title: hint,
				onClick: onToggle,
				onKeyDown: (e) => {
					if (e.key !== "Enter" && e.key !== " ") return;
					e.preventDefault();
					onToggle();
				},
				children: [
					react_jsx_runtime.jsxs("div", { className: "dsmkCardTitle", children: [
						react_jsx_runtime.jsx("span", { className: "dsmkCardName", children: item.name }),
						item.version ? react_jsx_runtime.jsx("span", { className: "dsmkCardVersion", children: item.version }) : null
					] }),
					react_jsx_runtime.jsxs("div", { className: "dsmkCardBadges", children: [
						installed ? react_jsx_runtime.jsx(Badge, { kind: "Ok", children: t("market.badge.installed") }) : null,
						// 只在「搜全部 npm」模式下才有意义——默认搜索本来就限定了
						// keywords:dsh-plugin，那种情况下结果个个都命中，标签等于废话。
						showTagged && !installed && item.tagged ? react_jsx_runtime.jsx(Badge, { kind: "Brand", children: t("market.badge.tagged") }) : null
					] }),
					// 缩略图排在名字/徽章下面、简介上面：一排卡片扫过去先看到图，
					// 「长什么样」比一段字更快说明这插件是干嘛的。
					//
					// 图加载失败就整块摘掉（README 里链到已删文件的情况很常见），简介
					// 顺势放宽到 dsmkCardDescTall。
					showThumb ? react_jsx_runtime.jsx("div", { className: "dsmkCardThumb", children:
						react_jsx_runtime.jsx("img", {
							src: thumb, alt: "", loading: "lazy",
							onError: () => setThumbBroken(true)
						})
					}) : (pendingThumb ? react_jsx_runtime.jsx("div", { className: "dsmkCardThumb dsmkCardThumbPending" }) : null),
					item.description ? react_jsx_runtime.jsx("div", {
						className: "dsmkCardDesc" + (showThumb || pendingThumb ? "" : " dsmkCardDescTall"),
						children: item.description
					}) : null,
					// 关键词标签：卡片内容「再丰富一些」的主要来源——npm 搜索结果里本来
					// 就带了这个字段，不用多打一次请求。
					chips.length > 0 ? react_jsx_runtime.jsx("div", { className: "dsmkChips", children:
						chips.map((keyword) => react_jsx_runtime.jsx("span", { className: "dsmkChip", children: keyword }, keyword))
					}) : null,
					// 贴着卡片底边一整行：左边是这张卡片的两个旁证数字（下载量、最后
					// 发版日期），右边是「详情」+「安装」，两边垂直居中对齐——按钮的
					// 高度和这行字的中线齐平，而不是文字单独占一行、按钮再摞在上面。
					//
					// 下载量抓不到就是空，不显示 0——「没数据」和「没人用」是两回事。
					// 安装排在最右侧：它不是破坏性动作，反而是这张卡片上最常被点的那个，
					// 该放在最顺手的位置。
					react_jsx_runtime.jsxs("div", { className: "dsmkCardFooter dsmkCardFooterSplit", children: [
						react_jsx_runtime.jsxs("div", { className: "dsmkCardMetaLine", children: [
							item.downloads !== null && item.downloads !== undefined
								? react_jsx_runtime.jsx("span", { className: "dsmkDownloads", children: downloadsLabel })
								: null,
							item.downloads !== null && item.downloads !== undefined && item.date
								? react_jsx_runtime.jsx("span", { className: "dsmkCardMetaDot", "aria-hidden": "true", children: "·" })
								: null,
							item.date ? react_jsx_runtime.jsx("span", {
								children: fmt(t("market.meta.updated"), { d: shortDate(item.date) })
							}) : null
						] }),
						react_jsx_runtime.jsxs("div", { className: "dsmkCardFooterActions", children: [
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "dsmkGhostBtn",
								title: item.name,
								onClick: (e) => {
									e.stopPropagation();
									onToggle();
								},
								children: t("market.card.viewDetail")
							}),
							installed ? null : react_jsx_runtime.jsx("button", {
								type: "button",
								className: "dsmkPrimaryBtn",
								disabled: !canInstall || busy,
								title: item.name,
								onClick: (e) => {
									e.stopPropagation();
									onInstall(item.name, item.version);
								},
								children: installing ? t("market.detail.installing") : t("market.detail.install")
							})
						] })
					] }),
					action ? react_jsx_runtime.jsx(ActionResult, { t, action }) : null
				]
			});
		}

		/**
		 * 随应用分发、但**当前没装**的插件。
		 *
		 * 装着的不在这里显示 —— 它们和别的插件一样出现在「已安装」组里，因为管理模式
		 * 本来就一样。这一组只解决一件事：卸掉之后怎么装回来。npm 上可能还没发、用户
		 * 此刻可能没网，而发行包里明明躺着那个 tgz，没有入口就是一扇单向门。
		 */
		function BundledRow({ t, item, busy, onInstall }) {
			return react_jsx_runtime.jsxs("div", { className: "dsmkCard dsmkCardStatic", title: item.packageName, children: [
				react_jsx_runtime.jsxs("div", { className: "dsmkCardTitle", children: [
					react_jsx_runtime.jsx("span", { className: "dsmkCardName", children: item.packageName }),
					item.version ? react_jsx_runtime.jsx("span", { className: "dsmkCardVersion", children: item.version }) : null
				] }),
				react_jsx_runtime.jsx("div", { className: "dsmkCardBadges", children:
					react_jsx_runtime.jsx(Badge, { kind: "Muted", children: t("market.bundled.removed") })
				}),
				react_jsx_runtime.jsx("div", { className: "dsmkCardFooter", children:
					react_jsx_runtime.jsx("button", {
						type: "button", className: "dsmkGhostBtn", disabled: busy,
						onClick: () => onInstall(item.packageName),
						children: busy ? t("market.bundled.reinstalling") : t("market.bundled.reinstall")
					})
				})
			] });
		}



		/** 分组标题。 */
		function GroupTitle({ title, hint }) {
			return react_jsx_runtime.jsxs("div", { className: "dsmkGroupTitle", children: [
				react_jsx_runtime.jsx("span", { children: title }),
				hint ? react_jsx_runtime.jsx("span", { className: "dsmkGroupHint", children: hint }) : null
			] });
		}


		/**
		 * 已安装 tab 的一张卡片。
		 *
		 * 卸载做成**两段式**（点一下变成「确认卸载？」，再点才真执行），不弹对话框：
		 * 这是个破坏性动作，但弹窗会打断心流，而误点一次的代价（装回去要重新下载）
		 * 又没大到值得一个模态。和同作者 Git 面板的「撤销提交」用同一个交互。
		 *
		 * 内容和交互都对齐发现页的卡片（缩略图、简介三行、关键词标签，点卡片本身
		 * 或「查看详情」都进详情态）——以前这里只画描述一行 + 版本/声明两个字，
		 * 装了什么插件全靠猜，比发现页寒酸一大截，用户也点不进详情看更多。版本/
		 * 声明这两条 installed 独有的信息（尤其是随包插件那句「本地锁定版本」）
		 * 挪到简介和标签下面，降格成一行说明文字，而不是卡片唯一的内容。
		 *
		 * 卡片本身可点开详情之后，开关、更新、卸载这几个按钮都要 `stopPropagation`，
		 * 不然点它们会连带把详情也展开了——跟 DiscoverRow 里「装」按钮的道理一样。
		 */
		function InstalledRow({ t, item, action, busy, removed, onUninstall, onUpdate, onToggle, canInstall, expanded, onOpenDetail }) {
			// useCardThumbnail 排在最前面：它和 DiscoverRow 调的是同一个 hook，钩子
			// 调用顺序因此在两种卡片之间对齐——这个顺序本身不影响运行时行为，纯粹是
			// 保持两处一致，读起来是「同一件事只写一遍」。
			const { cardRef, thumb, showThumb, pendingThumb, setThumbBroken } = useCardThumbnail({
				name: item.name,
				github: repositoryToGithubSlug(item.repository)
			});
			const [armed, setArmed] = react.useState(false);
			// 离开这一行的操作态就解除武装，免得下次展开还停在「确认卸载？」上。
			react.useEffect(() => {
				if (!armed) return undefined;
				const timer = setTimeout(() => setArmed(false), 4000);
				return () => clearTimeout(timer);
			}, [armed]);

			// 卸载和更新走同一个全局 action（服务端一次只跑一个 pnpm），但要按 kind
			// 分开判断，否则更新中途这一行的卸载按钮也会被错误地显示成「卸载中…」。
			const uninstalling = action && action.name === item.name && action.kind === "uninstall" && action.status === "running";
			const updating = action && action.name === item.name && action.kind === "install" && action.status === "running";
			// 更新刚成功、但 /installed 还没刷新回来时，列表里仍是旧的 installedVersion。
			// 这种短暂状态下不能再把「更新到 x.y.z」按钮画出来——等 rescan 回来后按钮
			// 本来就会因为 updateAvailable 变 false 而消失，提前挡住它，避免完成时闪一下。
			const updateJustFinished = action && action.name === item.name && action.kind === "install"
				&& action.status === "ok" && typeof action.version === "string"
				&& item.installedVersion !== action.version;
			// 声明成范围（`^1.2.0`）时提示一句：这解释了「为什么它会自己变版本」。
			const isRange = typeof item.spec === "string" && /^[\^~>=<]|x|\*/.test(item.spec);
			// 随应用分发的插件走的是本地 tgz（`file:C:\Users\...\bundled\xxx.tgz`），
			// 不是 npm 版本号——这是刻意的设计（见桌面端 profile-plugins-installer.js
			// 的注释：这样卸载了才能离线装回来），但原样把这条绝对路径糊在「声明」
			// 后面，用户看到的是一串本地文件系统路径，一头雾水地以为哪里出错了。
			// 换成一句人话，完整路径还留在 title 里，好奇的人 hover 还是能看到。
			const isFileSpec = typeof item.spec === "string" && item.spec.startsWith("file:");
			const hint = [item.name, item.installedVersion ? "v" + item.installedVersion : null, item.description].filter(Boolean).join(" · ");
			const chips = (item.keywords || []).filter((k) => !DISCOVER_CHIP_STOPWORDS.has(k)).slice(0, 4);
			return react_jsx_runtime.jsxs("div", {
				className: "dsmkCard" + (removed ? " dsmkCardRemoved" : "") + (expanded ? " dsmkCardSelected" : ""),
				ref: cardRef,
				role: "button",
				tabIndex: 0,
				"aria-pressed": expanded,
				title: hint,
				onClick: onOpenDetail,
				onKeyDown: (e) => {
					if (e.key !== "Enter" && e.key !== " ") return;
					e.preventDefault();
					onOpenDetail();
				},
				children: [
					react_jsx_runtime.jsxs("div", { className: "dsmkCardTitle", children: [
						react_jsx_runtime.jsx("span", { className: "dsmkCardName", children: item.name }),
						// 右上角只放开关。它表达的是**状态**（这插件现在开着吗），和标题同一行
						// 读起来是「某某插件：开着」；卸载是**动作**，挪到下面单独一行。
						//
						// 已卸载的卡片不给开关：包已经不在磁盘上了，停用/启用写进状态文件的
						// 那条记录指向一个不存在的插件，重启后只会留下一条垃圾。
						item.canDisable && !removed ? react_jsx_runtime.jsxs("label", {
							className: "dsmkSwitch",
							title: fmt(t("market.toggle.label"), { name: item.name }),
							onClick: (e) => e.stopPropagation(),
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
					] }),
					react_jsx_runtime.jsxs("div", { className: "dsmkCardBadges", children: [
						// 「已卸载」压过其余状态：包都不在了，再说它「已激活」只会让人以为
						// 卸载没成功。
						removed
							? react_jsx_runtime.jsx(Badge, { kind: "Warn", title: t("market.badge.removedHint"), children: t("market.badge.removed") })
						// 三种状态互斥，按「用户最关心什么」排：他自己停用的排最前；
						// 「装了但没有 dsh.bundle」是包本身的毛病；最后才是正常激活。
						: item.enabled === false
							? react_jsx_runtime.jsx(Badge, { kind: "Warn", children: t("market.badge.disabled") })
							: item.activated
								? react_jsx_runtime.jsx(Badge, { kind: "Ok", children: t("market.badge.active") })
								: react_jsx_runtime.jsx(Badge, { kind: "Warn", title: t("market.badge.inactiveHint"), children: t("market.badge.inactive") }),
						// 「有更新」和上面那个状态徽章不互斥——停用的插件一样可能有新版本。
						// 已卸载的除外：那张卡片上不该再出现任何指向「还能操作它」的东西。
						// 更新刚完成、列表还没刷新回来时也先不画这个徽章，避免和更新按钮一起闪现。
						!removed && item.updateAvailable && !updateJustFinished
							? react_jsx_runtime.jsx(Badge, { kind: "Brand", children: fmt(t("market.badge.update"), { v: item.latestVersion }) })
							: null
					] }),
					showThumb ? react_jsx_runtime.jsx("div", { className: "dsmkCardThumb", children:
						react_jsx_runtime.jsx("img", {
							src: thumb, alt: "", loading: "lazy",
							onError: () => setThumbBroken(true)
						})
					}) : (pendingThumb ? react_jsx_runtime.jsx("div", { className: "dsmkCardThumb dsmkCardThumbPending" }) : null),
					item.description ? react_jsx_runtime.jsx("div", {
						className: "dsmkCardDesc" + (showThumb || pendingThumb ? "" : " dsmkCardDescTall"),
						children: item.description
					}) : null,
					chips.length > 0 ? react_jsx_runtime.jsx("div", { className: "dsmkChips", children:
						chips.map((keyword) => react_jsx_runtime.jsx("span", { className: "dsmkChip", children: keyword }, keyword))
					}) : null,
					// 版本/声明贴左，按钮组贴右，同一行垂直居中——按钮的高度和这行字的
					// 中线齐平，跟发现卡片的页脚是同一个视觉逻辑（见 dsmkCardFooterBetween）。
					react_jsx_runtime.jsxs("div", { className: "dsmkCardFooter dsmkCardFooterBetween", children: [
						react_jsx_runtime.jsxs("div", { className: "dsmkCardMetaLine", children: [
							item.installedVersion ? react_jsx_runtime.jsx("span", { children: fmt(t("market.installed.version"), { v: item.installedVersion }) }) : null,
							item.installedVersion && item.spec ? react_jsx_runtime.jsx("span", { className: "dsmkCardMetaDot", "aria-hidden": "true", children: "·" }) : null,
							item.spec ? react_jsx_runtime.jsx("span", {
								title: isFileSpec ? item.spec.slice("file:".length) : (isRange ? t("market.installed.range") : undefined),
								children: isFileSpec ? t("market.installed.bundledSpec") : fmt(t("market.installed.spec"), { s: item.spec })
							}) : null
						] }),
						react_jsx_runtime.jsxs("div", { className: "dsmkCardFooterActions", children: [
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "dsmkGhostBtn",
								title: item.name,
								onClick: (e) => { e.stopPropagation(); onOpenDetail(); },
								children: t("market.card.viewDetail")
							}),
							// 已卸载的卡片不再给更新/卸载按钮：它是一条「重启前的留影」，没有任何
							// 还能对它做的动作，只留「查看详情」。
							item.removable && !removed ? react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
								// 更新排在卸载左边：两者都是「动作」，但更新是常见操作、卸载是破坏性的，
								// 破坏性的那个理应排在最靠右、离手指最远的位置。
								// 更新完成后只留结果提示，不再把「更新到 x.y.z」按钮闪出来。
								item.updateAvailable && !updateJustFinished ? react_jsx_runtime.jsx("button", {
									type: "button",
									className: "dsmkGhostBtn",
									disabled: busy || !canInstall,
									title: item.name,
									// 把要更到的版本一起传下去：更新市场自己那一次，面板会在半秒后
									// 被热重载换掉，那条「已装好 x@y」的提示得在请求发出**之前**就
									// 写好（见 SELF_UPDATE_KEY），那时候只有这里知道版本号。
									// 顺带这条路和「发现」页点安装走的就是同一个形状了。
									onClick: (e) => { e.stopPropagation(); onUpdate(item.name, item.latestVersion); },
									children: updating ? t("market.detail.updating") : fmt(t("market.detail.updateTo"), { v: item.latestVersion })
								}) : null,
								react_jsx_runtime.jsx("button", {
									type: "button",
									className: "dsmkDangerBtn" + (armed ? " dsmkDangerBtnArmed" : ""),
									disabled: busy || !canInstall,
									title: item.name,
									onClick: (e) => {
										e.stopPropagation();
										if (!armed) { setArmed(true); return; }
										setArmed(false);
										onUninstall(item);
									},
									children: uninstalling ? t("market.detail.uninstalling") : armed ? t("market.detail.uninstallConfirm") : t("market.detail.uninstall")
								})
							] }) : null
						] })
					] }),
					// 已卸载的卡片不再挂结果条。那行「已卸载 XXX」的绿字跟旁边的「已卸载」
					// 徽章说的是同一件事，而且 action 是全局单例——卸第二个的时候第一个的
					// 绿字会凭空消失，看着像出了什么错。徽章是跟着卡片走的，不会有这问题。
					!removed && action && action.name === item.name
						? react_jsx_runtime.jsx(ActionResult, { t, action })
						: null
				]
			});
		}


		//#endregion

		/**
		 * 面板内容。首次打开后由 MarketPanel 常驻挂载（为了关闭动画），所以这里靠 open
		 * 自己判断要不要发请求——`open` 不是渲染开关，是「现在该不该请求」。
		 */
		function MarketPanelBody({ t, open, updates, onClose }) {
			const [tab, setTab] = react.useState(readTab);
			// 两个刷新信号，**故意分开**。
			//
			// `rescan`：重新读本机状态（/installed、/bundled、/capabilities）。装完、
			// 卸完、开关完都要走它。
			// `research`：重新去 npm 搜一次，会把「发现」列表整个换成新的第一页。
			//
			// 合成一个的代价是实打实的：装一个插件本来只需要刷新「哪些已安装」，却顺手
			// 把发现列表也重搜了——用户翻了几屏找到的那个包，装完之后列表塌回第一页
			// 24 条，滚动位置连带一起没了，还得从头再滚一遍。而 npm 上的搜索结果根本
			// 没因为你装了个包而改变，那次重搜纯属白费。
			//
			// 所以只有「结果本身真的会变」的操作才 setResearch：换镜像源（换了个
			// registry）、搜索出错后手动重试、以及顶部那个刷新按钮（用户明确要求
			// 「全部重来一遍」）。
			const [rescan, setRescan] = react.useState(0);
			const [research, setResearch] = react.useState(0);

			// 面板正文那个滚动容器，以及「发现」列表上一次滚到哪儿。
			//
			// 存 ref 不存 state：滚动位置每滚一像素就变一次，进 state 等于每帧重渲染
			// 整个面板；而且它只被副作用读写，从来不参与渲染输出。
			const bodyRef = react.useRef(null);
			const discoverScrollRef = react.useRef(0);
			// 「这次搜索要不要让服务端重抓全量索引」。
			//
			// 服务端把索引缓存 6 小时（3610 个包、15 次请求才抓得完，每次搜索都重抓就是
			// 429 的来源），所以要给用户一个显式的强制入口——顶部那个刷新按钮。用 ref
			// 不用 state：它是「下一次请求要不要带个参数」的一次性标记，不参与渲染，
			// 进 state 反而要处理「用完之后置回 false 又触发一轮」的自激问题。
			const forceIndexRefreshRef = react.useRef(false);

			// 已安装列表在两个 tab 都要用：发现 tab 拿它标「已安装」徽章，详情拿它的
			// profileName 拼安装命令。所以面板一打开就拉，不管当前在哪个 tab。
			// safeMode 跟着这份状态走，不单独开一个：它和 items 来自**同一个响应**
			// （/installed），拆成两处迟早出现「插件列表已更新、横幅还是上一次的」。
			const [installed, setInstalled] = react.useState({ status: "idle", items: [], profileName: null, profileDir: null, safeMode: false, error: null });
			react.useEffect(() => {
				if (!open) return undefined;
				let alive = true;
				setInstalled((prev) => ({ ...prev, status: "loading" }));
				getJson("/api/dsdesktop/market/installed").then((result) => {
					if (!alive) return;
					if (result && result.ok) {
						setInstalled({ status: "ready", items: result.data.items, profileName: result.data.profileName, profileDir: result.data.profileDir, safeMode: Boolean(result.data.safeMode), error: null });
						// /installed 里已经带着每个包的 updateAvailable 了——顺手把角标对齐，
						// 用户刚点完「更新到 x.y.z」就能看见叹号消失，不用等下一轮轮询。
						updates.set(result.data.items.filter((item) => item.updateAvailable).length);
					} else {
						setInstalled({ status: "error", items: [], profileName: null, profileDir: null, safeMode: false, error: (result && result.error && result.error.message) || t("market.state.error") });
					}
				}).catch((error) => {
					if (!alive) return;
					setInstalled({ status: "error", items: [], profileName: null, profileDir: null, safeMode: false, error: String(error && error.message ? error.message : error) });
				});
				return () => { alive = false; };
			}, [open, rescan, t, updates]);

			const installedNames = react.useMemo(() => new Set(installed.items.map((item) => item.name)), [installed.items]);

			// 停用/启用要重启内核才生效，所以要提示「还有几项没生效」。这个数不是
			// 「点了几次开关」，是「跟内核当前实际在跑的状态相比，有几个插件的启用
			// 状态不一样」——同一个插件先关再开等于没变，不该计成两项改动。基准是
			// **第一次**拉到的 /installed 快照（那就是内核现在正在跑的状态，此后每次
			// 开关只是改期望值，内核状态要等重启才会变），只在还没建立时设一次，
			// 之后每次 rescan 都不再动它——直到应用重启、整个面板重新挂载。
			const baselineEnabledRef = react.useRef(null);
			react.useEffect(() => {
				if (installed.status !== "ready" || baselineEnabledRef.current !== null) return;
				const map = {};
				for (const item of installed.items) map[item.name] = item.enabled;
				baselineEnabledRef.current = map;
			}, [installed.status, installed.items]);

			const togglePending = react.useMemo(() => {
				const baseline = baselineEnabledRef.current;
				if (!baseline) return 0;
				let count = 0;
				for (const item of installed.items) {
					if (!(item.name in baseline)) continue;
					if (baseline[item.name] !== item.enabled) count++;
				}
				return count;
			}, [installed.items]);

			// 能不能一键安装是**环境**决定的（定位得到 dsh 的 bin、定位得到 profile），
			// 先问清楚再决定按钮长什么样——让用户点下去才发现不行是最差的一种反馈。
			const [canInstall, setCanInstall] = react.useState(false);
			// 镜像开没开也从 capabilities 一起拿：截图区要据此决定是显示图、还是显示
			// 「加载不出来，要不要开镜像」那个提示。
			const [mirror, setMirror] = react.useState("");
			const [mirrorBusy, setMirrorBusy] = react.useState(false);
			// 国内 registry 镜像：跟图片镜像是两个独立开关，各管各的一路请求（见
			// lib/index.js 里 planSettingsUpdate 的注释——为什么这两个设置必须分开
			// 存取，不能按整份覆盖）。
			const [registryMirror, setRegistryMirror] = react.useState(false);
			const [registryMirrorBusy, setRegistryMirrorBusy] = react.useState(false);
			react.useEffect(() => {
				if (!open) return undefined;
				let alive = true;
				getJson("/api/dsdesktop/market/capabilities").then((result) => {
					if (!alive || !result || !result.ok) return;
					setCanInstall(Boolean(result.data.canInstall));
					setMirror(String(result.data.imageMirror ?? ""));
					setRegistryMirror(Boolean(result.data.registryMirror));
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

			// 开关本身乐观更新（翻页看得见），但「拿新源重新搜」必须等 /settings/save
			// 真的落盘之后再触发——这条不是随便挑的顺序。之前 search 的 effect 直接
			// 依赖 registryMirror 这个状态，翻开关那一刻就跟着重新搜，可这时候
			// postJson 请求可能还在路上、服务端还没把新设置写进 dsh-market.json。
			// setRegistryMirror(next) 触发的重渲染发生在 await 让出控制权之后、但早于
			// 那次 fetch 真正拿到响应——新搜索请求几乎肯定会在设置真正保存**之前**
			// 发出去，服务端读到的还是旧源，搜出来的东西看着就像「明明勾了镜像，
			// 结果/下载量却对不上」。改成搜索只认 research，而 research 只在 postJson
			// 成功之后才 +1——跟这个文件里其它「装/卸成功后才 setRescan」的写法
			// （runInstall / runUninstall）是同一个道理，不是这里独有的特例。
			const onToggleRegistryMirror = react.useCallback(async (next) => {
				setRegistryMirror(next);
				setRegistryMirrorBusy(true);
				try {
					const result = await postJson("/api/dsdesktop/market/settings/save", { registryMirror: next });
					if (result && result.ok) {
						// 换源：结果本身要重新搜（research），capabilities 也要重读一遍
						// 好让开关状态跟服务端对上（rescan）。
						setResearch((n) => n + 1);
						setRescan((n) => n + 1);
					} else {
						setRegistryMirror(!next);
					}
				} catch {
					setRegistryMirror(!next);
				}
				setRegistryMirrorBusy(false);
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
			//
			// 初值不一定是 null：市场更新自己那一次，这个组件是被内核的 HMR 换掉之后
			// 重新挂载的，上一条命写下的字条要在这里读回来，把「已装好 x@y」那行绿字
			// 接上（见 SELF_UPDATE_KEY 的注释）。
			const [action, setAction] = react.useState(() => {
				const note = readSelfUpdate();
				if (note === null) return null;
				return {
					kind: "install", name: note.name, version: note.version, status: "ok",
					message: fmt(t("market.detail.needRestart"), { name: note.name, version: note.version })
				};
			});
			// 装/卸/更新任意一个成功过，就该在面板底部那条共用横幅里给「重启应用」——
			// 跟停用/启用共用同一个入口，不必每张卡片各配一个按钮（见 dsmkPending）。
			// 是计数不是布尔：面板底部要能报「一共有几项没生效」，跟 togglePending
			// 那个数字加在一起给用户一个总数——只加不减，这一轮面板打开期间发生过
			// 几次就是几，不因为后来的刷新而回落。
			// 同上：被换掉之前攒了几项没生效，换回来之后要接着算，不能从 0 重来。
			const [installActionCount, setInstallActionCount] = react.useState(() => {
				const note = readSelfUpdate();
				return note !== null && Number.isFinite(note.n) ? note.n : 0;
			});
			// 这一轮面板打开期间被卸掉的包名。
			//
			// 卸载确实是**单向门**：pnpm remove 真的把包从磁盘删了，运行中的内核进程
			// 却还在内存里跑着它的代码。但这个「账面对不上」只对**被卸的那一个**成立
			// ——别的插件既没被删也没被改，凭什么跟着一起锁死？之前整块面板压暗、所有
			// 按钮禁用，直接后果是想卸三个插件就得重启三次。这里把范围收回到单张卡片。
			//
			// 存的是卸载那一刻的卡片快照（name → item）：`pnpm remove` 之后包就从
			// `/installed` 里消失了，没有快照就画不出那张「重启前的留影」。
			//
			// **这里曾经出过同名卡片显示两张的 bug**，根因是快照和刷新回来的真实数据
			// 各画各的、两边都可能包含同一个包。这一版靠构造消灭那个窗口，而不是靠时序
			// 去躲：真实数据永远优先，幽灵卡片只取「名字不在 installed 里」的那些
			// （见下面的 ghostItems）。两个集合按定义互斥，不存在「同时命中」的时刻，
			// 刷新早到晚到都一样。
			const [removedItems, setRemovedItems] = react.useState(() => new Map());
			// Map 是可变对象，就地 set/delete 之后引用没变，React 不会重渲染——每次都
			// 换一个新 Map。
			const markRemoved = react.useCallback((item) => {
				setRemovedItems((prev) => new Map(prev).set(item.name, item));
			}, []);
			const unmarkRemoved = react.useCallback((name) => {
				setRemovedItems((prev) => {
					if (!prev.has(name)) return prev;
					const next = new Map(prev);
					next.delete(name);
					return next;
				});
			}, []);
			// 「一键更新」这一批的进度。null = 这次面板打开以来没点过。
			//
			// 形状是 `{ total, done: [names], failed: [names], running }`，done 存**名字**
			// 而不是一个计数：跑完到 /installed 刷新回来之间有几百毫秒，这期间列表里那几个
			// 包仍然写着「有更新」（服务端还没重查），拿名字才能把它们从按钮的计数里排掉，
			// 否则整批跑完之后按钮会带着原来那个数字再亮一次，看着像「更新没生效」。
			// 跟单张卡片上的 updateJustFinished 是同一条道理，只是那边一次只管一个包。
			const [batch, setBatch] = react.useState(null);
			// 并发防护仍然只跟「有没有 pnpm 正在跑」挂钩：服务端一次只允许一个，
			// 前端跟着它，不再叠加任何「一路锁到重启」的状态。
			//
			// 一键更新那一批也算「正在跑」：整批是好几次请求串起来的，两次之间有一个
			// action 已经是 ok、下一个还没置 running 的空档，只看 action 的话所有按钮会在
			// 那一瞬间恢复可点——用户正好在这时点一下卸载，就撞上服务端的 busy 拒绝。
			const busy = Boolean(action && action.status === "running") || Boolean(batch && batch.running);
			const pendingCount = togglePending + installActionCount;
			const restartPending = pendingCount > 0;
			// 桌面外壳在不在，决定的不只是「画不画那个按钮」，还有底部横幅那句话怎么写
			// （见下面 dsmkPending）。算一次，两处用同一个答案。
			const canRestart = restartAvailable();

			// 一次安装/更新请求的正文，**不碰 rescan**。抽出来是给「一键更新」用的：那边
			// 要连着跑好几个，而每跑完一个就 setRescan 意味着 /installed 整个重拉一遍，
			// 而它每次都要给每个可升级的包问一遍 npm 的 latest（见后端 collectInstalled）
			// ——一批更新 N 个就是 N 轮全量重查，列表还会在中途反复重排。刷新留到整批
			// 跑完之后做一次。
			//
			// `noteCount` 是「市场更新自己」那张字条上要写的改动数（见 SELF_UPDATE_KEY）。
			// 由调用方算：单个更新是 pendingCount + 1，整批里则要把这批已经跑成功的也算上。
			const requestInstall = react.useCallback(async (name, version, noteCount) => {
				setAction({ kind: "install", name, status: "running" });
				// 更新的是市场自己：这次请求一回来，内核的 HMR 就会在半秒内把这个面板
				// 连根换掉（完整因果见 SELF_UPDATE_KEY 的注释），下面那些 setState 谁
				// 都活不到被看见。所以**先**把要说的话写下来，请求还没发就写——写早了
				// 顶多是更新失败时多留一条记录（下面的 catch/失败分支会擦掉），写晚了
				// 就可能压根没机会写。
				if (name === SELF_NAME) writeSelfUpdate({ name, version: version ?? "", n: noteCount });
				try {
					const result = await postJson("/api/dsdesktop/market/install", { name, version });
					if (result && result.ok) {
						const message = fmt(t("market.detail.needRestart"), { name: result.data.name, version: result.data.version })
							+ (result.data.drifted ? "（" + fmt(t("market.detail.drifted"), { version: result.data.version }) + "）" : "");
						setAction({ kind: "install", name, version: result.data.version, status: "ok", message });
						setInstallActionCount((n) => n + 1);
						// 卸完又装回来：撤掉「已卸载」标记，否则卡片会顶着一个「重启后
						// 消失」的徽章，而它明明又在磁盘上了。
						unmarkRemoved(name);
						return { ok: true };
					} else {
						// 没装成就没有「重启后生效」这回事：把上面预写的那条字条擦掉，
						// 否则失败一次就会留下一条永远消不掉的假横幅（面板没被换掉，
						// 这条记录也就没人来读、没人来清）。
						if (name === SELF_NAME) clearSelfUpdate();
						setAction({ kind: "install", name, status: "error",
							message: (result && result.error && result.error.message) || t("market.detail.failed"),
							output: result && result.error && result.error.output });
						return { ok: false };
					}
				} catch (error) {
					if (name === SELF_NAME) clearSelfUpdate();
					setAction({ kind: "install", name, status: "error", message: String(error && error.message ? error.message : error) });
					return { ok: false };
				}
			}, [t, unmarkRemoved]);

			const runInstall = react.useCallback(async (name, version) => {
				const result = await requestInstall(name, version, pendingCount + 1);
				if (result.ok) setRescan((n) => n + 1);
			}, [requestInstall, pendingCount]);

			/**
			 * 一键更新：把传进来的这些包依次更新到各自的 latestVersion。
			 *
			 * **串行，不并发。** 服务端一次只允许一个 pnpm 在跑（并发会踩 lockfile，见
			 * lib/index.js 的 pnpmBusy），并发发出去只会得到一串「已有一个安装正在进行」。
			 *
			 * **市场自己排在最后。** 更新它会让内核的 client-hmr 在半秒内把这个面板连根
			 * 换掉（见 SELF_UPDATE_KEY），排在中间的话，后面那几个包的请求压根没人去发
			 * ——用户点的是「一键更新」，结果只更新了前半截，而且没有任何提示。
			 *
			 * 中间某个失败**不中断**：几个插件之间没有依赖关系，一个包发布得有问题
			 * （或者刚好被下架）不该把剩下几个也拦住。失败的名字攒起来，整批跑完一起报。
			 */
			const runUpdateAll = react.useCallback(async (items) => {
				if (items.length === 0) return;
				const queue = [
					...items.filter((item) => item.name !== SELF_NAME),
					...items.filter((item) => item.name === SELF_NAME)
				];
				const done = [];
				const failed = [];
				setBatch({ total: queue.length, done: [], failed: [], running: true });
				for (const item of queue) {
					// 串行是这里的要求本身，不是疏漏（见上面的注释）。
					// eslint-disable-next-line no-await-in-loop
					const result = await requestInstall(item.name, item.latestVersion, pendingCount + done.length + 1);
					(result.ok ? done : failed).push(item.name);
					setBatch({ total: queue.length, done: [...done], failed: [...failed], running: true });
				}
				setBatch({ total: queue.length, done, failed, running: false });
				if (done.length > 0) setRescan((n) => n + 1);
			}, [requestInstall, pendingCount]);

			// 停用/启用。改动要下次启动才生效，提示用的计数见上面的 togglePending
			// （跟内核当前状态比对出来的，不是点击次数）。
			//
			// 开关和装卸不共用 `action` 那套状态：装卸是「一次一个、服务端串行跑 pnpm」，
			// 开关只是写一行 JSON，可以连点好几个。两者混在一起会让开关也被 pnpm 的忙
			// 状态挡住。
			const [toggleError, setToggleError] = react.useState(null);
			const setItemEnabled = react.useCallback((name, enabled) => {
				setInstalled((prev) => ({
					...prev,
					items: prev.items.map((item) => (item.name === name ? { ...item, enabled } : item))
				}));
			}, []);

			const runToggle = react.useCallback(async (name, enabled) => {
				setToggleError(null);
				// 乐观更新：开关立刻翻过去，不等网络往返。之前是等 POST 回来再
				// `setRescan`、再等 `/installed`整个重新拉一遍——两次网络串成一次等待，
				// 是「第一次点开关卡顿感很重」的根：不是某一步单独慢，是这条链路本身
				// 就得等两轮。真正的持久化仍在下面跑，写失败了再把开关翻回去并报错，
				// 不会让界面停留在一个没真正生效的状态上却不告诉用户。
				setItemEnabled(name, enabled);
				try {
					const result = await postJson("/api/dsdesktop/market/profile-plugins/toggle", { name, enabled });
					if (!(result && result.ok)) {
						setItemEnabled(name, !enabled);
						setToggleError(fmt(t("market.toggle.failed"), { msg: (result && result.error && result.error.message) || "" }));
					}
				} catch (error) {
					setItemEnabled(name, !enabled);
					setToggleError(fmt(t("market.toggle.failed"), { msg: String(error && error.message ? error.message : error) }));
				}
			}, [t, setItemEnabled]);

			const runBundledInstall = react.useCallback(async (name) => {
				setAction({ kind: "install", name, status: "running" });
				try {
					const result = await postJson("/api/dsdesktop/market/bundled/install", { name });
					if (result && result.ok) {
						setAction({ kind: "install", name, status: "ok",
							message: fmt(t("market.detail.needRestart"), { name, version: result.data.version ?? "" }) });
						setInstallActionCount((n) => n + 1);
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

			// 收的是整个 item 而不只是包名：卸载成功后这张卡片要靠这份快照继续画下去
			// （见 removedItems）。
			const runUninstall = react.useCallback(async (item) => {
				const name = item.name;
				setAction({ kind: "uninstall", name, status: "running" });
				try {
					const result = await postJson("/api/dsdesktop/market/uninstall", { name });
					if (result && result.ok) {
						setAction({ kind: "uninstall", name, status: "ok", message: fmt(t("market.detail.removed"), { name }) });
						setInstallActionCount((n) => n + 1);
						// 只标记这一个包（见 removedItems）：它的卡片压暗、按钮撤掉、挂上
						// 「重启后消失」的徽章，面板其余部分照常可用——用户可以接着卸
						// 下一个，攒够了一次重启。
						markRemoved(item);
						setRescan((n) => n + 1);
					} else {
						setAction({ kind: "uninstall", name, status: "error",
							message: (result && result.error && result.error.message) || t("market.detail.failed"),
							output: result && result.error && result.error.output });
					}
				} catch (error) {
					setAction({ kind: "uninstall", name, status: "error", message: String(error && error.message ? error.message : error) });
				}
			}, [t, markRemoved]);

			// 搜索。query 是输入框的即时值，debounced 是真正发请求用的值——每敲一个字母
			// 就打一次 npm 既慢又容易被限流。
			const [query, setQuery] = react.useState("");
			const [debounced, setDebounced] = react.useState("");
			// 默认开着：npm 上一百多万个包，不限定关键词搜出来的东西绝大多数装不进 dsh。
			// 勾选态表达「只看能装的」，取消才是放宽 —— 默认值放在噪音最少的那一侧。
			const [onlyDsh, setOnlyDsh] = react.useState(true);
			// 排序记住上次的选择：一个习惯按下载量看的用户，不该每次打开都要再选一遍。
			const [sort, setSort] = react.useState(readSort);
			react.useEffect(() => {
				const timer = setTimeout(() => setDebounced(query), 300);
				return () => clearTimeout(timer);
			}, [query]);

			// 一页 24 个（8 行 × 3 列），滚到底部再补一页——而不是一次搜索就把几十个
			// 结果全塞进来：npm 搜索一次最多给 50 个，全塞进来既慢又没必要，用户十有
			// 八九只看前一两屏。
			const PAGE_SIZE = 24;
			const [results, setResults] = react.useState({ status: "idle", items: [], total: 0, error: null });
			const [loadingMore, setLoadingMore] = react.useState(false);
			// 「这是第几次搜索」的世代号。只有 `alive` 挡不住翻页请求：翻页发起时用的
			// 是发起那一刻的 sort/onlyDsh，用户在它还没返回时切了排序，主搜索的 effect
			// 会重新拉第一页并整个替换 results；翻页请求晚到时不检查世代号的话，会把
			// 上一个排序（很可能是「最近更新」，那种请求根本不带下载量数据）的结果
			// 拼接到新排序的列表后面——用户看到的就是「排序好像没生效、还有几张卡片
			// 不显示下载量」，且只在手快切换排序时出现，正是「有时候」这种偶发描述。
			const searchGenRef = react.useRef(0);
			react.useEffect(() => {
				// 只在发现 tab 且面板打开时才搜：面板关着、或者用户在看已安装列表时，
				// 没有任何理由去打 npm。
				if (!open || tab !== "discover") return undefined;
				searchGenRef.current += 1;
				const gen = searchGenRef.current;
				// 列表马上要被换成新的第一页，之前记下的滚动位置随之作废。不清掉的话，
				// 新结果渲染完会被下面那个恢复 effect 拉回旧位置——那是**上一批**结果
				// 的位置，纯属乱跳。
				discoverScrollRef.current = 0;
				setResults({ status: "loading", items: [], total: 0, error: null });
				// 一次性标记，读完就清：强制重抓只对点了刷新按钮的那一次生效，后面
				// 改搜索词、切排序都不该再拖着服务端重爬一遍。
				const force = forceIndexRefreshRef.current;
				forceIndexRefreshRef.current = false;
				const qs = `q=${encodeURIComponent(debounced)}&from=0&size=${PAGE_SIZE}&sort=${encodeURIComponent(sort)}${onlyDsh ? "" : "&all=1"}${force ? "&refresh=1" : ""}`;
				getJson(`/api/dsdesktop/market/search?${qs}`).then((result) => {
					if (searchGenRef.current !== gen) return;
					if (result && result.ok) setResults({ status: "ready", items: result.data.items, total: result.data.total, error: null });
					else setResults({ status: "error", items: [], total: 0, error: (result && result.error && result.error.message) || t("market.state.error") });
				}).catch((error) => {
					if (searchGenRef.current !== gen) return;
					setResults({ status: "error", items: [], total: 0, error: String(error && error.message ? error.message : error) });
				});
				return undefined;
			// 不直接依赖 registryMirror——切换镜像开关要**等 /settings/save 落盘后**
			// 才能重新搜，不然搜索请求可能在设置真正保存前就发出去，服务端读到的还是
			// 旧源（见 onToggleRegistryMirror 的注释）。触发点走 research。
			//
			// **依赖里没有 rescan，这是刻意的**：装/卸插件只该刷新本机状态，不该把
			// 发现列表也重搜一遍（见上面 rescan / research 那段注释）。
			}, [open, tab, debounced, onlyDsh, sort, research, t]);

			// 无限滚动的下一页。用 results.items.length 当 `from`——npm 的搜索排序
			// 稳定，翻页不会重复或漏掉。
			const loadMoreDiscover = react.useCallback(() => {
				if (loadingMore || results.status !== "ready" || results.items.length >= results.total) return;
				const gen = searchGenRef.current;
				setLoadingMore(true);
				const qs = `q=${encodeURIComponent(debounced)}&from=${results.items.length}&size=${PAGE_SIZE}&sort=${encodeURIComponent(sort)}${onlyDsh ? "" : "&all=1"}`;
				getJson(`/api/dsdesktop/market/search?${qs}`).then((result) => {
					// 这一页是上一次排序/搜索发的，期间用户已经换了条件——主搜索的
					// effect 早把 results 换成新条件的第一页了，这页数据不能再拼进去。
					if (searchGenRef.current !== gen) return;
					if (result && result.ok) {
						setResults((prev) => ({ ...prev, items: prev.items.concat(result.data.items), total: result.data.total }));
					}
				}).catch(() => { /* 翻页失败就停在当前这页，用户再往下滚会重试 */ }).finally(() => setLoadingMore(false));
			}, [loadingMore, results.status, results.items.length, results.total, debounced, sort, onlyDsh]);

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

			// 换 tab / 换搜索词 / 切换国内镜像时收起展开项：展开的是上一批结果（或者
			// 上一个数据源）里的东西，源都换了还继续显示旧详情没有意义。
			react.useEffect(() => { setExpanded(null); }, [tab, debounced, onlyDsh, sort, registryMirror]);

			// 面板正文的滚动容器：发现 tab 滚到接近底部时补下一页。选中详情态时
			// 滚的是详情内容，不该顺手把发现列表的下一页也加载了。
			//
			// 顺带记下当前滚动位置（见 discoverScrollRef）。记在这里而不是「点详情
			// 的那一刻」：位置只在滚动时变，滚动时记下就一定是最新的，不用去每个可能
			// 离开列表的入口各埋一次。
			const onBodyScroll = react.useCallback((e) => {
				if (tab !== "discover" || expanded !== null) return;
				const el = e.currentTarget;
				discoverScrollRef.current = el.scrollTop;
				if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMoreDiscover();
			}, [tab, expanded, loadMoreDiscover]);

			// 从详情返回时把发现列表滚回原处。
			//
			// 为什么需要显式恢复：详情态是把 .dsmkBody 的内容**整个换成**详情视图，
			// 而详情比几十张卡片的列表矮得多——浏览器会立刻把 scrollTop 夹到新内容的
			// 高度上（基本等于归零）。等返回时列表重新长回来，scrollTop 早就不是原来
			// 那个值了。用户的体感就是「点进去看一眼，回来得从头再滚一遍」。
			//
			// 用 useLayoutEffect 而不是 useEffect：要在浏览器绘制**之前**改回去，
			// 否则会先闪一帧列表顶部。老 React 或测试替身没有这个 hook 时退回 useEffect，
			// 效果一样、只是会闪一下，不值得为此让面板整个起不来。
			const useIsoLayoutEffect = react.useLayoutEffect || react.useEffect;
			useIsoLayoutEffect(() => {
				if (tab !== "discover" || expanded !== null) return;
				const el = bodyRef.current;
				const want = discoverScrollRef.current;
				if (!el || want <= 0 || el.scrollTop === want) return;
				el.scrollTop = want;
			}, [tab, expanded, results.items.length]);

			const onSelectTab = react.useCallback((next) => {
				setTab(next);
				storeTab(next);
			}, []);

			// 下载量的文案跟着当前排序走：排周下载量时卡片上显示的就是周下载量，
			// 排月下载量时显示月下载量——排的是哪个数字，卡片上就该看到哪个数字，
			// 不然「按下载量排序」和卡片上的数字对不上，用户会怀疑排序是不是没生效。
			const downloadsLabel = (n) => fmt(t(sort === "downloads-month" ? "market.meta.downloadsMonth" : "market.meta.downloadsWeek"), { n: formatDownloads(n) });

			const discoverContent = () => {
				if (results.status === "loading" && results.items.length === 0) return react_jsx_runtime.jsx(Notice, { children: t("market.state.loading") });
				if (results.status === "error") {
					// 搜索本身失败了，重试就是「再搜一次」——这里要的是 research。
					return react_jsx_runtime.jsxs("div", { className: "dsmkNotice dsmkNoticeErr", children: [
						react_jsx_runtime.jsx("div", { children: results.error }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsmkRetry", onClick: () => setResearch((n) => n + 1), children: t("market.state.retry") })
					] });
				}
				if (results.items.length === 0) return react_jsx_runtime.jsx(Notice, { children: t("market.state.empty") });
				return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
					react_jsx_runtime.jsx("div", { className: "dsmkGrid", children: results.items.map((item) => react_jsx_runtime.jsx(DiscoverRow, {
						t, item, installedNames, downloadsLabel: downloadsLabel(item.downloads), showTagged: !onlyDsh,
						expanded: expanded === item.name,
						onToggle: () => setExpanded(item.name),
						action: action && action.name === item.name ? action : null,
						canInstall, busy, onInstall: runInstall
					}, item.name)) }),
					loadingMore ? react_jsx_runtime.jsx("div", { className: "dsmkLoadMore", children: t("market.state.loading") }) : null
				] });
			};

			// 只显示「随应用分发 + 当前没装」的那些。required 的（市场自己）不列——
			// 它卸不掉，永远不会出现在这一组里，列出来只会让人以为它可以被卸。
			const removedBundled = bundled.filter((b) => !b.installed && !b.required);
			// 卸不掉的 = 桌面版内置。用 removable 而不是硬编码包名：判据来自服务端的
			// 保护名单，两边不会各说各话。
			const builtinItems = installed.items.filter((i) => !i.removable);
			// 已经卸掉、`/installed` 里也不再有的那些——画成「重启前的留影」。
			// **`!installedNames.has` 这个条件就是防重复行的那道闸**：真实数据里还在的
			// 包一律走真实数据那条路径（只是多带一个 removed 标记），绝不会在这里再画
			// 一张。见 removedItems 的注释。
			const ghostItems = [...removedItems.values()].filter((i) => !installedNames.has(i.name));
			// 排序必须跟服务端一致（pure.js 的 normalizeInstalled 末尾按 name 排）。
			// 直接把幽灵卡片 append 在后面的话，卸掉的插件会当场跳到列表最末——连着卸
			// 两个，两张卡片按「卸载的先后」排在尾部，跟其余卡片的字母序对不上，看着
			// 就是整个列表乱了。按同一条规则重排，卡片就还待在它原来的位置上。
			const normalItems = [...installed.items.filter((i) => i.removable), ...ghostItems]
				.sort((left, right) => left.name.localeCompare(right.name));
			const installedTabCount = installed.items.length + ghostItems.length;
			// 刚更新完、但 /installed 还没刷新回来的那些包。列表里它们仍然写着
			// 「有更新」（服务端还没重查 npm），不排掉的话「一键更新」按钮会在这个
			// 几百毫秒的窗口里带着原来的数字再亮一次——用户刚点完，看着像没生效。
			// 卡片上的 updateJustFinished 挡的是同一个窗口，只是那边一次只管一个包。
			const justUpdated = react.useMemo(() => {
				const names = new Set(batch ? batch.done : []);
				if (action && action.kind === "install" && action.status === "ok" && typeof action.name === "string") {
					names.add(action.name);
				}
				return names;
			}, [batch, action]);
			// 一键更新要处理的那一批。只取「从市场装的、没被卸掉的、npm 上确实有个更新
			// 版本号的」——卸掉的那张卡片是重启前的留影（没有任何还能对它做的动作），
			// 桌面自带那组的 updateAvailable 服务端压根不算（它们不能经市场升级）。
			const updatableItems = normalItems.filter((item) => item.updateAvailable
				&& !removedItems.has(item.name)
				&& typeof item.latestVersion === "string"
				&& !justUpdated.has(item.name));
			const installedContent = () => {
				if (installed.status === "loading" && installed.items.length === 0) {
					return react_jsx_runtime.jsx(Notice, { children: t("market.state.loading") });
				}
				if (installed.status === "error") {
					return react_jsx_runtime.jsxs("div", { className: "dsmkNotice dsmkNoticeErr", children: [
						react_jsx_runtime.jsx("div", { children: installed.error }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsmkRetry", onClick: () => setRescan((n) => n + 1), children: t("market.state.retry") })
					] });
				}
				// ghostItems 也算「有东西可看」：把最后一个插件卸掉之后直接甩一句
				// 「还没装任何插件」，用户会以为卸载把别的也带走了。
				if (installed.items.length === 0 && ghostItems.length === 0 && removedBundled.length === 0) {
					return react_jsx_runtime.jsx(Notice, { children: t("market.state.emptyInstalled") });
				}
				return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
					// 安全模式的说明要顶在最上面：那一次启动里插件全被跳过，不解释一句
					// 用户只会更慌（以为插件都丢了）。这个标志由外壳经环境变量告知，
					// 服务端在 /installed 里透出来。
					installed.safeMode ? react_jsx_runtime.jsx("div", { className: "dsmkSafeMode", children: t("market.safeMode") }) : null,

					// 随应用分发但当前没装的：给一个「装回来」的入口。全都装着时整组不出现。
					removedBundled.length > 0 ? react_jsx_runtime.jsxs("div", { className: "dsmkGroup", children: [
						react_jsx_runtime.jsx(GroupTitle, { title: t("market.group.bundled"), hint: t("market.group.bundledHint") }),
						react_jsx_runtime.jsx("div", { className: "dsmkGrid", children: removedBundled.map((item) => react_jsx_runtime.jsx(BundledRow, {
							t, item, busy, onInstall: runBundledInstall
						}, item.packageName)) }),
						action && removedBundled.some((b) => b.packageName === action.name)
							? react_jsx_runtime.jsx("div", { className: "dsmkDetail", children: react_jsx_runtime.jsx(ActionResult, { t, action }) })
							: null
					] }) : null,

					// 内置的（卸不掉的那些，目前只有市场自己）单独成组。它们和别的插件混在
					// 一起时，用户看到的是「为什么这个没有卸载按钮」；分开并写明「桌面版
					// 内置，无法卸载」，问题就不存在了。
					builtinItems.length > 0 ? react_jsx_runtime.jsxs("div", { className: "dsmkGroup", children: [
						react_jsx_runtime.jsx(GroupTitle, { title: t("market.group.builtin"), hint: t("market.group.builtinHint") }),
						react_jsx_runtime.jsx("div", { className: "dsmkGrid", children: builtinItems.map((item) => react_jsx_runtime.jsx(InstalledRow, {
							t, item, action, busy, canInstall, onUninstall: runUninstall, onUpdate: runInstall, onToggle: runToggle,
							expanded: expanded === item.name, onOpenDetail: () => setExpanded(item.name)
						}, item.name)) })
					] }) : null,

					react_jsx_runtime.jsxs("div", { className: "dsmkGroup", children: [
						builtinItems.length > 0 || removedBundled.length > 0
							? react_jsx_runtime.jsx(GroupTitle, { title: t("market.group.profile") }) : null,
						normalItems.length === 0
							? react_jsx_runtime.jsx(Notice, { children: t("market.state.emptyInstalled") })
							: react_jsx_runtime.jsx("div", { className: "dsmkGrid", children: normalItems.map((item) => react_jsx_runtime.jsx(InstalledRow, {
								t, item, action, busy, canInstall, removed: removedItems.has(item.name),
								onUninstall: runUninstall, onUpdate: runInstall, onToggle: runToggle,
								expanded: expanded === item.name, onOpenDetail: () => setExpanded(item.name)
							}, item.name)) })
					] })
				] });
			};

			// 详情态：无论当前在哪个 tab，网格都整个换成「返回 + 这一个包的详情」
			// （见 .dsmkDetailView 的注释）。原来只挂在 discoverContent 里，已安装
			// tab 点了「查看详情」没有反应——这里提出来，两个 tab 共用同一份状态
			// （expanded/detail）和同一个渲染，不用维护两套详情页。
			const detailView = () => {
				const activeDetail = detail && detail.name === expanded ? detail : null;
				// 卡片上有的信息（描述、下载量、日期、徽章），详情页也要能看到，
				// 不然点进来会觉得这是另一套完全不搭的内容，而不是同一张卡片的展开。
				// 发现结果里没有就找已安装的——两个 tab 共用同一份详情，数据源不能只认一边。
				const activeItem = results.items.find((i) => i.name === expanded)
					|| installed.items.find((i) => i.name === expanded)
					|| ghostItems.find((i) => i.name === expanded)
					|| null;
				return react_jsx_runtime.jsxs("div", { className: "dsmkDetailView", children: [
					react_jsx_runtime.jsxs("button", { type: "button", className: "dsmkBackBtn", onClick: () => setExpanded(null), children: [
						react_jsx_runtime.jsx(ChevronIcon, { size: 16 }),
						t("market.detail.back")
					] }),
					react_jsx_runtime.jsxs("div", { className: "dsmkDetailCard", children: [
						react_jsx_runtime.jsxs("div", { className: "dsmkDetailHead", children: [
							react_jsx_runtime.jsx("span", { className: "dsmkDetailHeadName", children: expanded }),
							(activeDetail && activeDetail.status === "ready" && activeDetail.data.version) || (activeItem && activeItem.version)
								? react_jsx_runtime.jsx("span", { className: "dsmkCardVersion", children: (activeDetail && activeDetail.status === "ready" && activeDetail.data.version) || activeItem.version })
								: null,
							installedNames.has(expanded) ? react_jsx_runtime.jsx(Badge, { kind: "Ok", children: t("market.badge.installed") }) : null,
							onlyDsh === false && !installedNames.has(expanded) && activeItem && activeItem.tagged ? react_jsx_runtime.jsx(Badge, { kind: "Brand", children: t("market.badge.tagged") }) : null
						] }),
						activeItem && activeItem.description
							? react_jsx_runtime.jsx("div", { className: "dsmkDetailDesc", children: activeItem.description })
							: null,
						activeItem && (activeItem.downloads !== null && activeItem.downloads !== undefined || activeItem.date)
							? react_jsx_runtime.jsxs("div", { className: "dsmkCardMeta", children: [
								activeItem.downloads !== null && activeItem.downloads !== undefined
									? react_jsx_runtime.jsx("span", { className: "dsmkDownloads", children: downloadsLabel(activeItem.downloads) })
									: null,
								// 和卡片上那行用同一句话（见 market.meta.updated 的注释）：
								// 从卡片点进详情，同一个数字不该换一种说法。
								activeItem.date ? react_jsx_runtime.jsx("span", {
									children: fmt(t("market.meta.updated"), { d: shortDate(activeItem.date) })
								}) : null
							] })
							: null,
						react_jsx_runtime.jsx(DiscoverDetail, {
							t, state: activeDetail, profileName: installed.profileName, canInstall,
							installed: installedNames.has(expanded),
							// action 是全局的（一次只跑一个 pnpm），但按名字对不上就该当没有 ——
							// 不然上一次在别的包上失败的结果会原样出现在这张刚打开、还没点过
							// 任何按钮的详情页上，看起来像是「一进来就报错」。
							action: action && action.name === expanded ? action : null,
							busy, onInstall: runInstall,
							mirror, onEnableMirror, mirrorBusy
						})
					] })
				] });
			};

			return react_jsx_runtime.jsxs("div", { className: "dsmkPanel" + (open ? " dsmkOpen" : ""), children: [
				react_jsx_runtime.jsxs("div", { className: "dsmkHeader", children: [
					react_jsx_runtime.jsx("span", { className: "dsmkHeaderTitle", children: t("market.panel.label") }),
					react_jsx_runtime.jsx("button", {
						type: "button", className: "dsmkIconBtn",
						"aria-label": t("market.panel.refresh"), title: t("market.panel.refresh"),
						// 顶部这个刷新按钮是用户明确要求「全部重来一遍」：两个信号都发，
						// 并且让服务端把缓存了 6 小时的全量索引也重抓一次。
						onClick: () => {
							forceIndexRefreshRef.current = true;
							setRescan((n) => n + 1);
							setResearch((n) => n + 1);
						},
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
							// 幽灵卡片也算进去：它们还在列表里显示着，这次运行里插件也确实
							// 还加载着——数字跟眼睛看到的卡片数对得上，比「更严格地正确」要紧。
							installedTabCount > 0
								? react_jsx_runtime.jsx("span", { className: "dsmkTabCount", children: installedTabCount })
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

				// 停用/启用要改 patch 文件、安装/卸载/更新要跑 pnpm，全都得下次内核启动
				// 才生效——光说「重启后生效」等于把活儿丢回给用户，重启入口就在手边
				// （外壳的 preload 桥）。这一条是**唯一**的重启入口：以前装/卸/更新
				// 各自的结果条里还各画一个「重启应用」按钮，同一个面板里同时开着好几个
				// 重启按钮，用户会疑惑「点哪个」——现在不管哪种改动，最终都汇到这一条。
				//
				// 挂在 Tabs 下面、Body 上面，而不是塞进「已安装」那一侧的内容里：装/卸插件是在「发现」
				// tab 里点的，这条提示必须跨 tab 都看得见——之前它卷在「已安装」 tab 自己的内容里，
				// 用户从「发现」装完插件不切到「已安装」就永远看不到重启提示（真实故障）。
				//
				// 这一行**一直渲染**，没有改动时只是 visibility:hidden——之前是有改动才
				// 出现，点一下开关这行突然冒出来，会把下面内容一起往下挤一截，手感就是「点完
				// 按钮，位置变了」。占位不占交互：隐藏时按钮本身也不可 tab/点，不会被当成
				// 一个「什么都不做」的按钮。
				//
				// 网页版（浏览器里直连 dsh，没有桌面外壳注入的 preload 桥）根本没有按钮
				// 可点，所以连文案一起换掉——不然这行只剩一句「重启后生效」，用户看不到
				// 按钮只会以为是按钮没画出来（真实反馈：WSL 下用浏览器跑 dsh 的用户报
				// 「装完卸完，重启按钮没出来」）。改成明说「重启 dsh 进程」，那是他在
				// 终端里自己能做的事。
				//
				// 为什么不干脆也给网页版画个按钮：能做的只有让内核自己退出，而它就是正在
				// 给这个页面供数据的那个进程——点完页面就死了，还得回终端重新起。那不是
				// 「重启」，是「关掉」，比没有按钮更坏。
				react_jsx_runtime.jsxs("div", { className: "dsmkPending" + (restartPending ? "" : " dsmkPendingHidden"), children: [
					react_jsx_runtime.jsx("span", { children: pendingCount > 0
						? fmt(t(canRestart ? "market.pending.restart" : "market.pending.restartWeb"), { n: pendingCount })
						: " " }),
					canRestart
						? react_jsx_runtime.jsx("button", {
							type: "button", className: "dsmkGhostBtn", tabIndex: restartPending ? 0 : -1,
							// 重启前把那条字条擦掉。sessionStorage 本来就活不过一次
							// app.relaunch（新的渲染进程 = 新的 session），但网页版走
							// 的是同一个页面重连，擦一下才保险——重启之后那些改动已经
							// 生效了，横幅不该还挂着。
							onClick: () => { clearSelfUpdate(); window.desktop.restartApp(); },
							children: t("market.detail.restart")
						})
						: null
				] }),
				toggleError ? react_jsx_runtime.jsx("div", { className: "dsmkPending dsmkResultErr", children: toggleError }) : null,

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
						}),
						// 有内容才出现，不占位不占交互——没打字的时候这里不该有个空按钮。
						query.length > 0 ? react_jsx_runtime.jsx("button", {
							type: "button",
							className: "dsmkSearchClearBtn",
							"aria-label": t("market.search.clear"),
							title: t("market.search.clear"),
							onClick: () => setQuery(""),
							children: react_jsx_runtime.jsx(CloseIcon, { size: 12 })
						}) : null
					] }),
					react_jsx_runtime.jsxs("div", { className: "dsmkSearchMeta", children: [
						react_jsx_runtime.jsx("span", { className: "dsmkResultCount", children:
							results.status === "ready" ? fmt(t("market.result.count"), { n: results.total }) : ""
						}),
						// 排序和「只搜 dsh-plugin」整体挪到右侧，和左边的结果计数分开——
						// 之前排序下拉挤在计数文字的同一个 <span> 里，样式上像是盖住了
						// 那行字，语义上也看不出「这是个排序控件」。
						react_jsx_runtime.jsxs("div", { className: "dsmkSearchControls", children: [
							react_jsx_runtime.jsx(SortMenu, {
								t, value: sort, values: SORT_VALUES,
								onChange: (v) => { setSort(v); storeSort(v); }
							}),
							react_jsx_runtime.jsxs("label", { className: "dsmkToggle", title: t("market.search.onlyDshHint"), children: [
								react_jsx_runtime.jsx("input", { type: "checkbox", checked: onlyDsh, onChange: (e) => setOnlyDsh(e.target.checked) }),
								react_jsx_runtime.jsx("span", { children: t("market.search.onlyDsh") })
							] }),
							react_jsx_runtime.jsxs("label", { className: "dsmkToggle", title: t("market.search.cnMirrorHint"), children: [
								react_jsx_runtime.jsx("input", {
									type: "checkbox", checked: registryMirror, disabled: registryMirrorBusy,
									onChange: (e) => onToggleRegistryMirror(e.target.checked)
								}),
								react_jsx_runtime.jsx("span", { children: t("market.search.cnMirror") })
							] })
						] })
					] })
				] }) : null,

				// 「一键更新」那一条。位置刻意和发现 tab 的搜索栏（.dsmkSearch）对齐：同一个
				// 槽位，两个 tab 各放各的工具条，切 tab 时按钮不会跳；而且它在滚动区
				// **外面**，列表滚到哪儿这个按钮都还在——插件多起来之后，一个跟着列表滚
				// 上去的批量操作入口等于没有。
				//
				// **一个都不能升的时候也照样画**，按钮变成禁用的「已全部更新」，而不是
				// 整条消失。第一版是「有更新才出现」，实测下来那是个坏设计：本机插件恰好
				// 全是最新版，用户打开面板什么都没看到，无从判断是「没有更新」还是「这
				// 功能根本没生效」——一个说明不了自己为什么不在的控件，等于把排查成本
				// 丢给了用户。常驻还顺带免掉一次布局位移（有更新时才冒出来会把列表往下挤）。
				//
				// 也因此这一条不需要再判 batch：上一批的结果（更新了几个 / 哪几个失败）
				// 有地方一直待着，不会随按钮一起消失。每张卡片上的结果条是全局单例，
				// 只会留下最后那一个包的，说不了「三个里有一个失败了」这件事。
				tab === "installed"
					? react_jsx_runtime.jsxs("div", { className: "dsmkUpdateAllBar", children: [
						react_jsx_runtime.jsx("span", {
							className: "dsmkUpdateAllNote" + (batch && !batch.running && batch.failed.length > 0 ? " dsmkResultErr" : ""),
							children: batch && !batch.running
								? (batch.failed.length > 0
									? fmt(t("market.updateAll.failed"), { n: batch.failed.length, names: batch.failed.join("、") })
									: fmt(t("market.updateAll.done"), { n: batch.done.length }))
								: (updatableItems.length > 0 ? fmt(t("market.updates.hint"), { n: updatableItems.length }) : "")
						}),
						react_jsx_runtime.jsx("button", {
							type: "button",
							className: "dsmkOkBtn",
							// 三种禁用理由：正在跑（服务端一次只允许一个 pnpm）、canInstall
							// 为 false（定位不到 dsh 的入口，跟单个更新按钮同一个判据）、
							// 以及没有任何可升的包——最后这种不是「暂时不能点」，是「点了
							// 也没事可做」，所以文案一起换掉，别让人对着一个灰按钮猜。
							disabled: busy || !canInstall || updatableItems.length === 0,
							title: t("market.updateAll.hint"),
							onClick: () => runUpdateAll(updatableItems),
							// 整批还在跑时显示进度：它是这一批唯一的进度显示。判断放在
							// updatableItems 之前——跑到最后一个包时可更新的已经被排空，
							// 先判空的话按钮会在收尾那一瞬间跳成「已全部更新」。
							children: batch && batch.running
								? fmt(t("market.updateAll.running"), { done: batch.done.length + batch.failed.length, total: batch.total })
								: updatableItems.length === 0
									? t("market.updateAll.upToDate")
									: fmt(t("market.updateAll"), { n: updatableItems.length })
						})
					] })
					: null,

				react_jsx_runtime.jsx("div", { className: "dsmkBody", ref: bodyRef, onScroll: onBodyScroll, children:
					expanded !== null ? detailView() : (tab === "discover" ? discoverContent() : installedContent())
				}),

				react_jsx_runtime.jsx("div", { className: "dsmkFooter", title: installed.profileDir || undefined, children:
					installed.profileName ? fmt(t("market.footer.profile"), { name: installed.profileName }) : ""
				})
			] });
		}

		/**
		 * 设置弹窗顶部工具栏（`settings.action` 槽，见 dsh-client-ui-settings-general
		 * 的 SettingsDocumentAction）里的角标：外壳自身有新版本时出现，点了直接打开
		 * 下载页——跟托盘菜单「有新版本 vX，点击查看」是同一次检查、同一个动作，
		 * 只是换了个入口。查不到 / 没有新版本时整个不渲染，不占位置。
		 */
		function DesktopUpdateAction({ t, store }) {
			const state = react.useSyncExternalStore(store.subscribe, store.getSnapshot);
			react.useEffect(() => { store.refresh(); }, [store]);
			if (state.phase !== "available") return null;
			const hint = fmt(t("market.desktop.header.updateHint"), { v: state.latestVersion || "" });
			return react_jsx_runtime.jsxs("button", {
				type: "button",
				className: "dsmkHeaderUpdateBtn",
				title: hint,
				"aria-label": hint,
				onClick: () => window.desktop.openAppUpdate(),
				children: [
					react_jsx_runtime.jsx(UpdateBangIcon, { size: 12 }),
					t("market.desktop.header.update")
				]
			});
		}

		/**
		 * 挂载时用给定的查询函数真查一次（不是读缓存），返回 `{state, checking}`。
		 * 外壳更新（`window.desktop.checkAppUpdate`）和内核更新
		 * （`window.desktop.checkKernelUpdate`）返回的都是 `{phase, ...}` 这个形状
		 * （`phase === "available"` 即有更新），只是数据源不同——抽出来避免两份
		 * 几乎一样的 useState+useEffect。
		 *
		 * 挂载即查、不读缓存：跟 openUpdater() 每次打开更新中心都 check() 一遍是
		 * 同一个道理——用户点进这个分区就是想知道「现在到底有没有新版」，后台的
		 * 24h 节流只管自动检查，不该拦用户主动看一眼。
		 */
		function useUpdateCheck(check) {
			const [state, setState] = react.useState(null);
			const [checking, setChecking] = react.useState(true);
			react.useEffect(() => {
				let alive = true;
				setChecking(true);
				(async () => {
					try {
						const next = await check();
						if (alive) setState(next);
					} finally {
						if (alive) setChecking(false);
					}
				})();
				return () => { alive = false; };
			}, [check]);
			return { state, checking };
		}

		/**
		 * 设置弹窗左侧导航新增的「更新」分区（`settings.section` 槽，安全的官方
		 * 列表插槽——不像 `settings.trigger` 那样是单例，注册了不会顶掉原生齿轮图标）。
		 * 两个按钮都是「查一下、按结果换文案」：有更新才可点、没有就换成禁用的
		 * 「已是最新」，跟顶部角标是同一套判断，只是外壳与内核各查各的。
		 *
		 * 外壳自己点了直接跳浏览器下载页（不自动装，见 app-updater.js 顶部注释）；
		 * 内核点了打开的是跟托盘菜单「检查内核更新」完全相同的更新中心窗口——
		 * 下载/安装/重启这些有进度、会失败的步骤，交给那个窗口已有的 UI 走，
		 * 这个分区只负责「告诉你有没有」。
		 */
		function DesktopSection({ t }) {
			const app = useUpdateCheck(window.desktop.checkAppUpdate);
			const kernel = useUpdateCheck(window.desktop.checkKernelUpdate);
			const appAvailable = !app.checking && app.state && app.state.phase === "available";
			const kernelAvailable = !kernel.checking && kernel.state && kernel.state.phase === "available";
			return react_jsx_runtime.jsx("div", { className: "dsmkDesktopSection", children:
				react_jsx_runtime.jsxs("div", { className: "dsmkDesktopRow", children: [
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dsmkDesktopBtn" + (appAvailable ? " dsmkDesktopBtnPrimary" : ""),
						disabled: !appAvailable,
						onClick: () => window.desktop.openAppUpdate(),
						children: app.checking
							? t("market.desktop.checking")
							: appAvailable
								? t("market.desktop.appUpdate.available")
								: t("market.desktop.appUpdate.upToDate")
					}),
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dsmkDesktopBtn" + (kernelAvailable ? " dsmkDesktopBtnPrimary" : ""),
						disabled: !kernelAvailable,
						onClick: () => window.desktop.openKernelUpdater(),
						children: kernel.checking
							? t("market.desktop.checking")
							: kernelAvailable
								? t("market.desktop.kernelUpdate.available")
								: t("market.desktop.kernelUpdate.upToDate")
					})
				] })
			});
		}

		function MarketFooterAction({ wide, t, store, updates }) {
			const open = react.useSyncExternalStore(store.subscribe, store.getSnapshot);
			const updateCount = react.useSyncExternalStore(updates.subscribe, updates.getSnapshot);
			// 叹号本身 aria-hidden：一个「!」读出来没有信息量，真正的说明放在按钮的
			// aria-label / title 里（「插件市场 · 3 个插件有新版本」），鼠标和读屏拿到的
			// 是同一句话。
			const dot = updateCount > 0
				? react_jsx_runtime.jsx("span", { className: "dsmkUpdDot", "aria-hidden": "true",
					children: react_jsx_runtime.jsx(UpdateBangIcon, { size: 12 }) })
				: null;
			const label = t("market.panel.label");
			const hint = updateCount > 0 ? label + " · " + fmt(t("market.updates.hint"), { n: updateCount }) : label;
			return react_jsx_runtime.jsxs("button", {
				type: "button",
				className: "dsmkFooterBtn" + (open ? " dsmkFooterBtnActive" : ""),
				"aria-label": hint,
				"aria-pressed": open,
				title: hint,
				onClick: () => store.toggle(),
				children: [
					react_jsx_runtime.jsxs("span", { className: "dsmkFooterBtnIconWrap", children: [
						react_jsx_runtime.jsx(MarketIcon, { size: 16 }),
						// 展开态角标贴的是文字的右上角；折叠态没有文字可贴，才退到图标上。
						wide ? null : dot
					] }),
					wide ? react_jsx_runtime.jsxs("span", { className: "dsmkFooterBtnLabelWrap", children: [
						react_jsx_runtime.jsx("span", { className: "dsmkFooterBtnLabel", children: label }),
						dot
					] }) : null
				]
			});
		}

		function MarketPanel({ t, store, updates }) {
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
					react_jsx_runtime.jsx(MarketPanelBody, { t, open, updates, onClose: () => store.close() })
				]
			}), document.body);
		}

		const inject = ["slots", "locale"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "market: dictionaries");
			// 面板默认是关着的，只有一种情况例外：上一条命是被「市场更新了自己」触发的
			// 热重载换掉的，那次更新的结果还没来得及给用户看（见 SELF_UPDATE_KEY）。
			// 这时候直接把面板开回来，用户看到的是「闪了一下，回来了，上面写着更新成功、
			// 重启后生效」，而不是「面板没了」。
			const t = ctx.locale.bind(NS);
			const store = createOpenStore(readSelfUpdate() !== null);
			const updates = createUpdatesStore();
			const appUpdate = createAppUpdateStore();

			// 轮询挂在 apply 上、不在组件里：角标要在**面板一次都没打开过**的时候就准，
			// 而组件会跟着侧边栏折叠、槽位重挂而反复卸载重建——定时器放进去就会跟着
			// 一起被拆掉重建，节奏完全不受控。
			ctx.effect(() => {
				updates.refresh();
				appUpdate.refresh();
				const timer = setInterval(() => {
					updates.refresh();
					appUpdate.refresh();
				}, UPDATES_POLL_MS);
				return () => clearInterval(timer);
			}, "market: 更新角标轮询");

			ctx.slots.inject("sidebar.footer.action", () => {
				const dispose = ctx.slots.register({
					name: "sidebar.footer.action",
					id: "market",
					// order: 110 —— 排序升序，数字小的在上面。终端面板是 90、Git 是 100，
					// 所以 110 让市场排在 Git **下面**（footer 最末）。市场是低频入口，
					// 放在天天用的终端和 Git 之下更合理。
					order: 110,
					locale: NS,
					inject: () => ({ store, updates })
				}, MarketFooterAction);
				return () => dispose();
			});

			ctx.slots.inject("shell.overlay", () => {
				const dispose = ctx.slots.register({
					name: "shell.overlay",
					id: "market-panel",
					locale: NS,
					inject: () => ({ store, updates })
				}, MarketPanel);
				return () => dispose();
			});

			// 外壳自身的更新入口只在桌面端注册：网页版没有 preload 桥，`settings.trigger`
			// 是原生单例槽（占了就会顶掉系统齿轮图标，见 upstream-and-layers.md「已知
			// 偏离」），所以走两个安全的列表插槽——顶部工具栏角标 + 左侧新分区——而不是
			// 碰那个单例。
			if (isDesktopShell()) {
				ctx.slots.inject("settings.action", () => {
					const dispose = ctx.slots.register({
						name: "settings.action",
						id: "market-desktop-update",
						order: 20,
						locale: NS,
						inject: () => ({ store: appUpdate })
					}, DesktopUpdateAction);
					return () => dispose();
				});

				ctx.slots.inject("settings.section", () => {
					const dispose = ctx.slots.register({
						name: "settings.section",
						id: "market-desktop",
						order: 80,
						label: () => t("market.desktop.nav"),
						locale: NS,
						inject: () => ({})
					}, DesktopSection);
					return () => dispose();
				});
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		// 只给单测用。
		exports.__test__ = { fmt, shortDate, CommandBox, DiscoverRow, InstalledRow, ActionResult, fetchPreviewSrc, loadPreview, previewCache };
		return module.exports;
	}
});
