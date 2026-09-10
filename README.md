# 佛教音乐小程序 MVP

## 项目简介

这是一个面向佛教音乐、梵呗、赞偈、诵经及佛教器乐内容的微信小程序 MVP。当前已具备 PostgreSQL/Prisma 数据层、公共曲库查询 API、React 管理后台，以及调用真实 Public API 的微信小程序曲库浏览、全局播放队列、后台音频、Mini Player 和同步唱词链路。

## 技术栈

- 微信原生小程序、TypeScript、WXML、WXSS
- NestJS 11、TypeScript
- React 19、Vite、Ant Design
- PostgreSQL 18、Docker Compose
- pnpm workspace

## 项目结构

```text
music/
├── server/       # NestJS REST API
├── admin/        # React + Vite 管理后台
├── miniprogram/  # 微信原生 TypeScript 小程序
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

> 安全警告：Admin API 当前没有登录和身份认证，只能用于本地开发，禁止直接暴露到公网生产环境。

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

详细说明见 `docs/development.md`。Seed 中的音频和封面 URL 只是占位地址，不能实际播放。

## 启动管理后台

首次启动前可复制前端环境变量：

```bash
cp admin/.env.example admin/.env.local
pnpm dev:admin
```

默认地址：`http://localhost:5173`

`VITE_API_BASE_URL` 用于配置管理后台访问的 API 根地址，默认开发值为 `http://localhost:3000/api`。Server 通过 `ADMIN_ORIGIN` 控制允许访问 Admin API 的前端来源，默认值为 `http://localhost:5173`。修改 Vite 端口或部署地址时，需要同步调整这两个变量并重新启动对应服务。

管理后台当前包含：首页数据概览、曲目管理、专辑管理、艺术家管理和分类管理。各资源支持分页列表、新增、编辑和删除；媒体字段当前只填写 URL，不上传或转发文件。

> 安全警告：管理后台及 Admin API 尚未接入登录和权限控制，只能在本地开发或受控网络中使用。

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
