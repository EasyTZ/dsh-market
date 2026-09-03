# dsh-market

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（下称 dsh）的第三方插件：**插件市场**。在侧边栏提供一个面板，浏览与搜索 npm 上的 dsh 插件、看详情、装进当前 profile、管理已安装的插件。

> 目录里出现或显示为可安装，不代表经过安全审核或推荐。插件装上之后是以你的用户权限运行的本地代码。
## 安装

一条命令安装：

```sh
dsh plugin --profile <name> add @easytz/dsh-market@1.1.0
```

`<name>` 是**必填**的 dsh profile 名，必须替换成你实际使用的 profile，不能省略：

- dsh 桌面版 / web 界面通常叫 `web`
- TUI 界面通常叫 `tui`
- 不确定时看 `$DSH_HOME/profiles/` 下的目录名，或运行 `dsh --profile <name> --help` 确认

省略 `--profile <name>` 会直接报错：`error: --profile <name> is required`，所以**不加名字不会安装成功**。

安装后重启 dsh，侧边栏底部会出现「插件市场」按钮。

## 卸载

一条命令卸载：

```sh
dsh plugin --profile <name> remove @easytz/dsh-market
```

`<name>` 与安装时一致。重启 dsh 后插件市场按钮消失。

> 如果你之前按旧版文档手动往 `$DSH_HOME/profiles/<name>/cordis.patch.yml` 或 `$DSH_HOME/cordis.patch.yml` 里加过 `- insert:` 条目，卸载时把那段 YAML 一起删掉。


## 功能

侧边栏底部一个按钮（`order: 110`，排在终端与 Git 之下），点开是个面板，两个页签。

已安装的插件里只要有一个能升级，按钮上「插件市场」四个字的右上角就会挂一个**蓝色小叹号**（侧边栏折叠时挂在图标上）。这个数每 30 分钟轮询一次 `GET /updates`，服务端那边再缓存 10 分钟；面板每次打开都会顺手把它对齐，所以点完「更新到 x.y.z」叹号立刻就没了，不用等下一轮。查不到（离线、定位不到 profile）时保持上一次的数字，不会清零——清零等于谎报「没有更新」。

- **已安装**：按「用户能拿它怎么办」分三组 —— **桌面自带**（宿主内置、卸不掉的产品包，比如 `@deepseek-ai/dsh`；本插件自己不在这一组，见下面「保护名单」）、**随应用分发但当前没装**（给「装回来」入口，用宿主随包带的副本，离线可用）、**其余全部**（可停用、可卸载，本插件自己也在这一组，只是没有停用开关）。停用与装卸都要重启内核后生效，面板里会提示。有新版本的会给一个「有更新」徽章和一键更新按钮（保护名单里的包不检查——它们本来就不能经这个市场升级）。
- **发现**：搜 npm，方块卡片一行三个展示，可按周下载量 / 月下载量 / 最近更新排序（不管哪种排序都会显示下载量），滚到底自动加载下一页。卡片上直接有「详情」「安装」两个按钮——点卡片本身或「详情」都进详情态（截图、关键词、协议、依赖数、仓库），「安装」不用先展开就能直接装；卡片本身也带几个去重过的关键词标签，底部一行并排显示周下载量与「更新于 …」（该包最后一次发版的日期）。README 里有截图的包，卡片上会带一张缩略图（滚进视野才去取，见 `GET /preview`）；没有图的把那块高度还给简介，多显示几行。

| 路由 | 作用 |
|---|---|
| `GET /search` | 搜 npm（默认限定 `keywords:dsh-plugin`，`all=1` 搜全站），带周下载量与排序 |
| `GET /detail` | 取 `latest` manifest，判断能不能装，附预览图清单 |
| `GET /preview` | 发现页卡片的缩略图（只回第一张，和 `/detail` 共用 README 缓存） |
| `GET /installed` | 读当前 profile 的直接依赖 |
| `GET /updates` | 有几个已装插件能升级（侧边栏角标用；带 10 分钟缓存，`force=1` 跳过） |
| `GET /capabilities` | 这个环境能不能一键安装 |
| `GET /image` | 预览图代理（见下） |
| `GET /settings` · `POST /settings/save` | 读写 `dsh-market.json`（图片镜像、国内 registry 镜像两个开关） |
| `GET /bundled` · `POST /bundled/install` | 宿主随包分发的插件清单 / 用随包副本离线装回来 |
| `POST /profile-plugins/toggle` | 停用 / 启用一个已装插件（写宿主的开关状态文件） |
| `POST /install` | 装一个包到当前 profile |
| `POST /uninstall` | 从当前 profile 卸载一个包 |

**保护名单，卸载和停用是两份不同的名单**：本插件自己**不在**卸载的保护名单里，任何环境下都能被卸载——它通常是宿主 `required: true` 的随包插件，宿主自己的启动对账逻辑会在实际版本跟随包版本对不上时强制装回去（不管是没装过还是被卸载过），卸载它的后果只是「下次重启前自动装回来」，不是「再也装不回来」，这一层没必要挡。但本插件自己**在** `DSH_DESKTOP_PLUGIN_STATE` 有值（即在 dsDesktop 这类宿主里）时的停用保护名单里——停用走的是完全不同的一条路（写 disabled 标记到 overlay patch），跟那套按版本号对账的自愈逻辑毫无关系，市场一旦被停用，下次启动依旧不会加载，没有任何自动恢复机制，只能手动编辑状态文件；在一个主打不碰命令行的图形外壳里这是真死路，所以这条锁必须留着。停用接口本来就整个只在这类宿主里可用。宿主产品包（`@deepseek-ai/dsh` 等）不受这套区分影响，两份名单都始终包含它们、任何环境下都保护。

**宿主集成靠三个环境变量**，都是可选的，缺了对应功能优雅降级（这个插件本身不依赖任何特定宿主）：`DSH_DESKTOP_PLUGIN_STATE`（开关状态文件）、`DSH_DESKTOP_PROFILE_DIST`（随包插件的 tgz 目录）、`DSH_DESKTOP_SAFE_MODE`（安全模式横幅）。

## 配置

| 键 | 默认 | 说明 |
|---|---|---|
| `imageMirror` | `""`（关） | GitHub 镜像前缀，用于取预览图。见下面「预览图」一节。 |
| `registryMirror` | `false`（关） | 开了之后搜索 / 详情 / 安装全部改走 `registry.npmmirror.com`（阿里云维护，1:1 镜像官方 registry，含 tarball）。见下面「国内镜像」一节。 |

设置存在 profile 目录下的 `dsh-market.json`，**面板里直接改、立刻生效、不用重启**。cordis 的 `Config` 仍然保留作为默认值（声明式部署可以在 patch 里钉死它），但**不要指望设置页会为它生成表单** —— dsh 的插件列表 tab 里那个 "Configuration" 只是个状态文字，不是输入框（查证过）。这就是为什么设置要落在自己的文件里而不是只放 Config。

两个开关**各自独立存取，写入是合并不是整份覆盖**——只改 `imageMirror` 不会碰掉已经保存的 `registryMirror`，反过来也一样（`POST /settings/save` 只处理请求体里真的带了的字段）。

## 预览图

图片链接从 npm packument 里的 README 抽出来（markdown 与内嵌 HTML 两种写法都认），过滤掉 shields.io 那类徽章，相对路径按仓库还原。

**图片一律经本插件代理，浏览器不直连任何第三方主机。** README 是插件作者可控的内容，直连意味着他能指挥用户的机器去访问任意地址，并借此知道「谁、什么时候、在看哪个插件」。代理这一跳把出网限制在内核进程里，主机受白名单约束、体积受上限约束，并且只放行 `content-type: image/*` 的响应。

取图按候选顺序尝试：

1. `cdn.jsdelivr.net/npm/<pkg>@<ver>/<path>` —— 只有截图真的打进了 npm 包（在 `files` 里）才有。实测多数插件把截图放在 `docs/`，而 `docs/` 通常不发布，所以这条经常 404。
2. `raw.githubusercontent.com/<owner>/<repo>/HEAD/<path>` —— 权威来源，但**在国内与不少企业网络下直接超时**。
3. 配了 `imageMirror` 时，再试一次镜像（`<mirror>/<原始地址>`）。

所以：**网络不受限时开箱就有图**。受限网络下（国内、企业网）一张都取不到时，详情里会就地出现一句「预览图加载不出来 —— 你的网络可能访问不了 GitHub」加一个「启用镜像重试」按钮，点一下就写好设置并重新加载。默认不开，因为镜像是我们不控制的第三方服务，会知道你在看哪些插件的截图 —— 这个取舍该由用户在需要时自己做，而不是我们默认替他决定。

一键启用用的默认镜像是 `https://gh-proxy.com/`（实测可用）。想换别的，改 profile 里的 `dsh-market.json`。

## 国内镜像

**默认关，需要用户在「发现」tab 里手动打开「国内镜像」这个开关。** 开了之后：

- 搜索、详情、预览图 README 抓取，全部改走 `https://registry.npmmirror.com` 而不是 `registry.npmjs.org`。
- 真正执行安装的那次 `pnpm add` 也会带上这个源（通过 `npm_config_registry` 环境变量，只在这一次子进程调用里生效，不碰用户系统全局的 `.npmrc`）——不然只有搜索看到的元数据走了镜像，真正下载 tarball 那一步还是连官方 registry，镜像等于白开。
- 下载量数字也会跟着走镜像：npmmirror.com 没有镜像 `/-/downloads/point/...` 这条批量接口，但单包接口 `registry.npmmirror.com/downloads/point/<period>/<package>` 可用，所以开了镜像后下载量改走镜像单查；下载量有 TTL 缓存，抓不到时优雅降级。

**这仍然是换信任根，只是这次决定权交还给用户自己。** 镜像方理论上能在元数据上撒谎（比如藏掉一个 `deprecated` 标记、伪造一段 README），但装到本机的代码不会变——tarball 就算走镜像下载，装的也是发布者在真正 npm 上传的那份内容（npmmirror 是同步镜像，不是另起炉灶发布）。只做这一个镜像可选、不开放成任意 URL：不然用户面对的就不是「装的包和 npm 上一样、只是换了条网络路径」，而是「信不信这个陌生地址说的话」，两者风险不是一个量级。

## 设计要点

**为什么用 npm 而不是 GitHub 做检索主干。** npm 的搜索结果一次就带齐了列表要用的字段（描述、关键词、仓库链接、发布者、协议、时间），而且**给出的就是可安装的身份**——包名加版本，装的时候直接用。GitHub 检索给不出可安装身份，未认证限流还只有 60 次/小时（搜索 10 次/分钟、按 IP 共享）。GitHub 只在详情里做补充展示。

**「能装」的唯一硬条件是 manifest 里声明了 `dsh.bundle.patch`。** 没有它，`dsh plugin add` 会把包装进 dependencies、打一句 warning、然后永远不激活——用户点了「安装」却什么都没发生，这是最糟的一种「成功」。来源方声明的版本、验证徽章、仓库是否一致这些都不作为资格条件：可伪造，或者会误杀合法插件。

**版本必须钉死。** 安装时用详情里拿到的精确版本号，不写 `^x.y.z` 范围。范围意味着期望状态不确定，pnpm 某次 install 就可能悄悄漂到新版本。

**这个插件自己就是它所推荐的那条安装路径的第一个住户**：装进 `$DSH_HOME/profiles/<name>/`，由 `dsh.bundle.patch` 激活，不随内核热更新与应用升级消失。profile 目录靠 `ctx.baseUrl` 定位（dsh 把 loader 的 include root 锚在 profile 目录上），所以不依赖任何宿主注入的环境变量，装在任何 dsh 里都能用。

**entry id 是 `dsdesktop-market` 而不是 `dsh-market`。** npm 上已有的 `dshmarket` 插件占用了后者，`- insert:` 不去重，两个都装上就是 `duplicate loader entry id`，内核直接退出。

## 安全边界

- 只出网到 `registry.npmjs.org`、`api.npmjs.org`、`api.github.com`，开了国内镜像开关时再加一个固定地址 `registry.npmmirror.com`（不是任意用户输入的主机——只有这一个可选源，见「国内镜像」一节），只允许 https，不带任何凭据。
- 所有路由过统一的 Origin + Content-Type 检查（本服务从不发 CORS 头，但那只挡读取、不挡发送）。
- 包名在进入任何 URL 或命令行之前先过 `isValidPackageName`：小写、可带一层 scope、不以 `.` `_` `-` 开头。**禁掉 `-` 开头**是我们额外加的一条——`-g`、`--force` 整串都由合法包名字符组成，能通过 npm 自己的校验，然后被 pnpm 当作参数而不是包名吃掉。

## 许可证

[MIT](LICENSE)
