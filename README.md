# 佛教音乐小程序 MVP

## 项目简介

这是一个面向佛教音乐、梵呗、赞偈、诵经及佛教器乐内容的音乐平台 MVP。当前已具备 PostgreSQL/Prisma 数据层、公共曲库查询 API、React 管理后台、微信小程序，以及开发中的 Mobile H5。

## 技术栈

- 微信原生小程序、TypeScript、WXML、WXSS
- NestJS 11、TypeScript
- React 19、Vite、Ant Design
- React 19、Vite（Mobile H5）
- PostgreSQL 18、Docker Compose
- pnpm workspace

## 项目结构

```text
music/
├── server/       # NestJS REST API
├── admin/        # React + Vite 管理后台
├── miniprogram/  # 微信原生 TypeScript 小程序
├── mobile/       # 手机浏览器访问的 React H5
├── docs/         # 项目文档
└── docker-compose.yml
```

## 环境要求

- Node.js 24 LTS
- pnpm 11 或更高版本
- Docker Desktop 与 Docker Compose
- 微信开发者工具稳定版

项目通过 `.nvmrc` 固定 Node.js `24.20.0`。如果已安装 nvm，可执行：

```bash
nvm install
nvm use
```

如果未安装 nvm，也可以使用 fnm 或 Volta 安装 Node.js 24。请勿在 Node.js 26 下生成正式锁定的生产部署环境。

## 安装依赖

在项目根目录运行：

```bash
pnpm install
```

## 启动 PostgreSQL

首次启动前复制开发环境变量并修改示例密码：

```bash
cp .env.example .env
docker compose up -d
```

查看数据库状态：

```bash
docker compose ps
```

停止数据库：

```bash
docker compose down
```

## 启动 NestJS

```bash
cp server/.env.example server/.env
pnpm dev:server
```

默认地址：

- API 根路径：`http://localhost:3000/api`
- 健康检查：`http://localhost:3000/api/health`
- Swagger：`http://localhost:3000/api/docs`

## API 目录

公共 API 只提供可公开浏览的数据：

- `GET /api/tracks`、`GET /api/tracks/:id`
- `GET /api/albums`、`GET /api/albums/:id`
- `GET /api/artists`、`GET /api/artists/:id`
- `GET /api/categories`、`GET /api/categories/:id/tracks`

管理 API 位于 `/api/admin`，为 Artist、Album、Category、Track 提供列表、详情、创建、更新和删除接口。

除 `POST /api/admin/auth/login` 外，所有 `/api/admin/*` 接口均要求 JWT Bearer Token。公共曲库 API 保持匿名可访问。Swagger 的 `Authorize` 按钮可填写登录接口返回的 access token。

除分类公共列表外，列表接口支持 `page` 和 `pageSize`；默认值为 `1` 和 `20`，`pageSize` 最大为 `100`。成功响应统一使用 `{ "success": true, "data": ... }`，分页响应还包含 `meta`；错误响应统一包含 `error.code`、`error.message`、`timestamp` 和 `path`。

常用请求：

```bash
curl 'http://localhost:3000/api/tracks?page=1&pageSize=20'
curl http://localhost:3000/api/albums
curl http://localhost:3000/api/artists
curl http://localhost:3000/api/categories
```

## 初始化数据库结构和测试数据

PostgreSQL 启动并配置 `server/.env` 后运行：

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:verify
```

数据库 migration 完成后，在 `server/.env` 中配置首个管理员（密码至少 12 位）：

```env
ADMIN_INITIAL_USERNAME=admin
ADMIN_INITIAL_PASSWORD=replace_with_a_strong_password
```

然后运行：

```bash
pnpm admin:create
```

脚本只创建新管理员，用户名已存在时会退出且不会覆盖密码。创建完成后建议从 `server/.env` 删除 `ADMIN_INITIAL_PASSWORD`，后续登录密码不会保存在浏览器代码或数据库明文字段中。

详细说明见 `docs/development.md`。Seed 中的音频和封面 URL 只是占位地址，不能实际播放。

## 启动管理后台

首次启动前可复制前端环境变量：

```bash
cp admin/.env.example admin/.env.local
pnpm dev:admin
```

默认地址：`http://localhost:5173`

`VITE_API_BASE_URL` 用于配置管理后台访问的 API 根地址，默认开发值为 `http://localhost:3000/api`。Server 通过 `ADMIN_ORIGIN` 控制允许访问 Admin API 的前端来源，默认值为 `http://localhost:5173`。修改 Vite 端口或部署地址时，需要同步调整这两个变量并重新启动对应服务。

生产部署将 Admin 静态文件放在 `/admin/`，NestJS API 仍位于 `/api/`。构建时使用：

```bash
pnpm --filter admin build
```

Admin 的 build 脚本默认设置 `VITE_API_BASE_URL=/api`，会覆盖开发机器上可能存在的 `admin/.env`，避免把本地 API 地址编进生产包；需要特殊构建地址时可在命令前显式设置该环境变量。构建产物在 `admin/dist/`，静态资源路径以 `/admin/assets/` 开头；Nginx 需对 `/admin/*` 提供 SPA fallback 到 `/admin/index.html`，并把 `/api/*` 转发给 NestJS。开发模式仍以 `pnpm dev:admin` 在 `http://localhost:5173/` 启动，开发 API 地址可通过 `admin/.env.example` 所示的 `VITE_API_BASE_URL` 配置。

管理后台当前包含：首页数据概览、曲目管理、专辑管理、艺术家管理和分类管理。各资源支持分页列表、新增、编辑和删除。曲目表单既可手动填写媒体 URL，也可经 NestJS 上传音频、封面和 LRC 文件到腾讯云 COS；上传与保存曲目是两个独立操作。选择音频文件时，浏览器会尝试从本地文件读取时长并在上传成功后填入整数秒，管理员仍可手动修改；读取失败不影响上传。

曲目管理中的“批量导入”支持单批选择或拖拽最多 50 个 MP3 文件。浏览器会尝试读取时长及 ID3 曲名、艺术家、专辑，并允许逐行修改或批量设置关联数据和发布状态。开始导入后最多同时处理 3 首，每首依次复用现有媒体上传接口和 Track 创建接口；单首失败不会中断其他项目，并可仅重试失败项。批量导入不会绕过服务端的 JWT、MP3 文件头、MIME、大小限制或 COS 随机 Key 校验。

访问管理页面会先跳转 `/login`。登录成功后 access token 保存在浏览器 `localStorage` 的 `fanyinji_admin_token` 中；请求层只对 `/admin/*` 请求统一附加 Bearer Token。Token 无效或过期时会自动清理并返回登录页。

## 腾讯云 COS 媒体上传

在 `server/.env` 中配置以下变量，不要把真实密钥提交到 Git：

```env
TENCENT_COS_SECRET_ID=
TENCENT_COS_SECRET_KEY=
TENCENT_COS_BUCKET=
TENCENT_COS_REGION=ap-beijing
TENCENT_COS_PUBLIC_BASE_URL=
```

`TENCENT_COS_BUCKET` 使用包含 APPID 后缀的完整 Bucket 名，例如 `bucket-name-1250000000`。`TENCENT_COS_PUBLIC_BASE_URL` 可填写已配置 HTTPS 的 CDN 或自定义域名；留空时服务端按 Bucket 和 Region 生成 COS 官方 HTTPS 地址。用于服务端的腾讯云子账号应只授予目标 Bucket 所需的对象上传权限，不应使用账号根密钥。

上传接口为 `POST /api/admin/uploads`，使用 `multipart/form-data` 的 `file` 和 `type` 字段，`type` 为 `audio`、`cover` 或 `lyrics`。接口要求有效 Admin Bearer Token。可以在管理后台“新增曲目”或“编辑曲目”中直接测试：上传完成后音频/封面 URL 会自动写入表单，LRC 的 UTF-8 文本会写入现有 `lyricsLrc` 字段；只有再次点击“保存”才会创建或更新曲目。

本方案由浏览器把文件传给 NestJS，再由 NestJS 服务端上传 COS，因此 Admin 浏览器不直接访问 COS 上传 API，也不持有 SecretId/SecretKey；仅为此上传链路无需配置 Bucket CORS。如果以后让 Web 页面直接读取 COS 媒体或改为浏览器直传，应按实际 Admin 域名最小化配置允许的 Origin、Method 和 Header。微信小程序播放媒体仍需按微信平台要求配置合法 HTTPS 域名。

## 启动 Mobile H5

Mobile H5 使用现有 Public API；开发时由 Vite 将同源 `/api` 代理到 NestJS，不依赖跨域设置。先启动数据库和 Server，然后在根目录执行：

```bash
cp mobile/.env.example mobile/.env.local
pnpm install
pnpm dev:mobile
```

浏览器打开 `http://localhost:5174/`。`mobile/.env.local` 中默认 `VITE_API_BASE_URL=/api`、`DEV_API_TARGET=http://localhost:3000`；如果 Server 端口不同，仅修改后者。生产构建默认同源 `/api`，运行 `pnpm --filter mobile build`，产物位于 `mobile/dist/`，部署到网站根路径 `/`，并将 `/api/*` 反向代理到 Server。生产环境需为 H5 路由配置 SPA fallback。

Mobile H5 提供首页、曲库、分类与分类曲目、专辑与专辑详情、全局 Mini Player、播放页及同步 LRC 歌词。点击曲目会以当前列表建立播放队列；切换页面不会重建音频。搜索仅筛选当前已加载曲目，并非全库搜索。浏览器首次播放须由用户点击触发。

已收录的测试数据中部分 `example.com` 音频/图片 URL 是不可用占位地址；H5 会显示封面 fallback 或播放错误，但要验证这些曲目，仍需由管理员替换成有权限使用的真实 HTTPS 媒体资源。Mobile 单元测试可运行 `pnpm --filter mobile test`。

## 打开微信小程序

1. 确保 PostgreSQL 与 NestJS 已启动。
2. 安装并打开微信开发者工具，选择“导入项目”。
3. 导入目录：`/Users/yangzedong/Desktop/coding/music/miniprogram`。
4. 使用自己有权限的 AppID；仓库不提供或伪造 AppID。
5. 小程序开发 API 统一配置在 `miniprogram/config/env.ts`，当前为 `http://localhost:3000/api`。

开发者工具模拟器访问本机 HTTP API 时，可在仅本地调试的项目设置中关闭“校验合法域名、web-view 域名、TLS 版本以及 HTTPS 证书”。这不是生产方案：预览、真机和发布环境必须使用 HTTPS，并在微信公众平台配置合法的 `request` 域名。

手机上的 `localhost` 指向手机本身，不能访问 Mac 上的 NestJS。真机联调需要把 API 地址改为同一局域网内 Mac 的 IP，或使用已配置合法域名的 HTTPS 测试环境。

页面包括首页、全部曲目、曲目详情、分类及分类曲目、专辑及专辑详情、艺术家及艺术家详情，以及独立播放页。Seed 中的 `example.com` 音频 URL 是不可播放占位地址；必须替换为自有授权或明确可用的音频 URL 才能验证播放。

## 播放架构

```text
wx.getBackgroundAudioManager()
              ↑
        PlayerManager 单例
              ↑
Track Item / Track Detail / Mini Player / Player Page
```

`miniprogram/player/player-manager.ts` 是唯一音频核心。它在 App 启动时注册一次 BackgroundAudioManager 事件，并维护当前曲目、当前已加载队列、队列索引、播放状态、时间、进度与播放模式。页面和组件通过轻量 `subscribe`/取消订阅同步 UI，不创建自己的音频实例，也不会在页面返回或 App 进入后台时停止播放。

队列来源于用户发起播放时所在页面当前已加载的曲目：首页最新收录、全部曲目当前分页累计结果、分类当前分页累计结果或专辑曲目。阶段 6 不会为了补齐队列自动抓取尚未加载的分页。顺序播放在最后一首自然结束后停止；单曲循环只影响自然结束，手动下一首仍切歌；随机播放在队列多于一首时避免立即重复当前曲目。播放模式会保存在微信本地存储中。

`pages/player/index` 在列表曲目缺少歌词字段时按需请求一次曲目详情，并只合并当前曲目元数据，不重新设置 `src`，因此不会打断播放。LRC 支持 `mm:ss`、`mm:ss.xx` 和 `mm:ss.xxx`，播放页根据时间高亮并通过 `scroll-into-view` 跟随当前唱词。

后台音频声明位于 `miniprogram/app.json`：

```json
"requiredBackgroundModes": ["audio"]
```

开发者工具可在仅本地调试时关闭合法域名校验，并使用 `localhost` HTTP 音频。真机不能用 `localhost`，正式联调必须使用真实 AppID、合法授权资源、可公网访问的 HTTPS 音频 URL，并在微信公众平台配置对应合法域名。音频源最好正确支持 HTTP Range，以保证拖动和长音频播放稳定；后台播放、锁屏媒体控件的暂停/继续/上一首/下一首必须再做真机验收。

## 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
pnpm format:check
```

小程序的 TypeScript 类型检查由命令行执行，WXML/WXSS 编译与运行结果需在微信开发者工具中验证。
