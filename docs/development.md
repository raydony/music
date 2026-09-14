# 开发环境与数据库

## 环境变量

Docker Compose 从根目录 `.env` 读取 PostgreSQL 配置；NestJS 与 Prisma 从 `server/.env` 读取 `DATABASE_URL`。这两个真实环境文件都被 Git 忽略。

首次配置：

```bash
cp .env.example .env
cp server/.env.example server/.env
cp admin/.env.example admin/.env.local
```

请修改示例密码和 `JWT_SECRET`，并确保根目录和 Server 的数据库名称、用户名、密码及端口保持一致。`JWT_SECRET` 必须为至少 32 位的随机值，且不能继续使用示例占位值；`JWT_EXPIRES_IN` 默认是 `12h`。

## 启动 PostgreSQL

```bash
docker compose up -d
docker compose ps
```

项目使用 PostgreSQL 18。官方 18+ 容器的数据卷挂载在 `/var/lib/postgresql`。
本项目默认映射到宿主机 `5433` 端口，避免与常见的本机 PostgreSQL `5432` 端口冲突。

## Prisma 命令

生成 Prisma Client：

```bash
pnpm db:generate
```

开发环境创建或执行 migration：

```bash
pnpm db:migrate
```

执行可重复 seed：

```bash
pnpm db:seed
```

验证数据数量、模型关系和删除策略：

```bash
pnpm db:verify
```

阶段 2 的 seed 音频和封面 URL 均为 `example.com` 占位地址，不能用于实际播放。后续联调时必须替换为获得授权且可通过 HTTPS 访问的媒体 URL。

`Track.duration` 在数据库中使用整数秒。Prisma Schema 当前不能直接声明非负 Check Constraint，因此未手写额外 SQL；Admin DTO 在应用层校验 `duration >= 0`。

## REST API

启动服务：

```bash
pnpm dev:server
```

Swagger 文档位于 `http://localhost:3000/api/docs`。

### Public 与 Admin

Public API 位于 `/api/tracks`、`/api/albums`、`/api/artists` 和 `/api/categories`。曲目相关公共查询始终附加 `isPublished = true` 条件；未发布曲目即使 UUID 正确也返回 404。

Admin API 位于 `/api/admin/*`，可管理 Artist、Album、Category 和 Track。

`POST /api/admin/auth/login` 是唯一匿名 Admin 路由。`GET /api/admin/auth/me` 和 Artist、Album、Category、Track 的全部 Admin CRUD 路由都要求 `Authorization: Bearer <token>`。Public API 不经过 Admin JWT Guard。

### 创建首个管理员

执行 migration 后，在 Git 忽略的 `server/.env` 中临时配置：

```env
ADMIN_INITIAL_USERNAME=admin
ADMIN_INITIAL_PASSWORD=replace_with_a_strong_password
```

密码必须为 12～128 位。运行：

```bash
pnpm admin:create
```

脚本使用 bcrypt cost 12 保存哈希，不输出 `passwordHash`，也不会覆盖同名管理员。创建完成后建议清空或删除 `ADMIN_INITIAL_PASSWORD`。

### 分页与响应

分页列表使用 `page` 和 `pageSize`：页码默认 1，每页默认 20，最大 100。分页由 PostgreSQL 查询的 `skip/take/count` 完成。

普通成功响应：

```json
{
  "success": true,
  "data": {}
}
```

分页成功响应：

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 5, "totalPages": 1 }
}
```

错误响应：

```json
{
  "success": false,
  "error": { "code": "TRACK_NOT_FOUND", "message": "Track not found" },
  "timestamp": "2026-09-09T10:00:00.000Z",
  "path": "/api/tracks/99999999-9999-4999-8999-999999999999"
}
```

### API 速查

```bash
curl 'http://localhost:3000/api/tracks?page=1&pageSize=20'
curl http://localhost:3000/api/albums
curl http://localhost:3000/api/artists
curl http://localhost:3000/api/categories
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'

curl http://localhost:3000/api/admin/tracks \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

Admin 创建、更新、删除示例：

```bash
curl -X POST http://localhost:3000/api/admin/categories \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"name":"本地联调分类"}'

curl -X PATCH http://localhost:3000/api/admin/categories/CATEGORY_UUID \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"description":"本地联调"}'

curl -X DELETE http://localhost:3000/api/admin/categories/CATEGORY_UUID \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

运行数据库 E2E（需要 PostgreSQL 已启动且 seed 已执行）：

```bash
pnpm test:e2e
```

## React 管理后台

确保 PostgreSQL 和 NestJS 已启动后，在项目根目录运行：

```bash
pnpm dev:admin
```

默认访问地址为 `http://localhost:5173`。管理后台路由如下：

- `/`：数据概览与快捷入口
- `/login`：管理员登录
- `/tracks`：曲目管理
- `/albums`：专辑管理
- `/artists`：艺术家管理
- `/categories`：分类管理

管理后台统一通过 `admin/src/api/client.ts` 调用 REST API。浏览器端变量 `VITE_API_BASE_URL` 默认为 `http://localhost:3000/api`；Server 端 `ADMIN_ORIGIN` 默认为 `http://localhost:5173`。如果前后端端口或域名发生变化，需要同步更新 `admin/.env.local` 和 `server/.env`，然后重启开发服务。

登录 token 保存在 `localStorage` 的 `fanyinji_admin_token` 中。请求层对 `/admin/*` 自动添加 Authorization header；收到 401 时清除 token 并跳转 `/login`。刷新页面时通过 `/api/admin/auth/me` 验证 token，退出登录只需清理本地 token，本阶段不维护服务端 blacklist。

表单会显示前端校验和后端业务错误。曲目表单会根据所选艺术家过滤专辑；切换艺术家时，如果当前专辑不再匹配会自动清空。音频和封面仅保存 URL，文件不会经过 NestJS 转发。

## 微信原生小程序

### 导入与启动

1. 启动 PostgreSQL：`docker compose up -d`。
2. 启动 NestJS：`pnpm dev:server`。
3. 在微信开发者工具中导入 `/Users/yangzedong/Desktop/coding/music/miniprogram`。
4. 使用自己有权限的 AppID 打开项目。

小程序 Public API 根地址集中定义在 `miniprogram/config/env.ts`：

```text
http://localhost:3000/api
```

页面不会各自硬编码地址。`services/request.ts` 统一处理查询参数、HTTP 状态、后端响应 envelope、网络错误和面向用户的错误文案。

### 页面路由

- `pages/home/index`：首页入口与最新公开内容
- `pages/tracks/index`：已发布曲目分页列表
- `pages/track-detail/index`：曲目元数据、唱词和全局播放入口
- `pages/player/index`：正式播放页、进度控制、播放模式与同步唱词
- `pages/categories/index`：分类列表
- `pages/category-tracks/index`：分类下已发布曲目
- `pages/albums/index`、`pages/album-detail/index`：专辑列表与详情
- `pages/artists/index`、`pages/artist-detail/index`：艺术家列表与详情

列表页区分 loading、empty、error 和 success 状态；曲目及分类曲目支持下拉刷新和触底分页。Public API 只返回 `isPublished = true` 的曲目，小程序不调用 `/api/admin/*`。

### 本地网络设置

微信开发者工具模拟器通常可访问 Mac 的 `http://localhost:3000`。当前本机开发设置在 Git 忽略的 `project.private.config.json` 中关闭了合法域名、TLS 和 HTTPS 证书校验，仅用于本地联调。若请求失败，依次检查 NestJS 是否运行、API Base URL 是否正确，以及开发者工具的域名校验设置。

生产环境必须使用 HTTPS，并在微信公众平台将 API 主机配置为合法 `request` 域名。不能把关闭域名校验当作预览、真机或发布方案。

真机上的 `localhost` 指向手机自身，不能访问 Mac。真机调试应使用同一局域网内 Mac 的 IP（并确认防火墙和网络可达），或改用 HTTPS 测试环境；修改后需重新编译小程序。

### 播放架构

```text
BackgroundAudioManager
        ↑
PlayerManager（唯一实例与事件注册点）
        ↑
Mini Player / Player Page / Track Detail / Track Item
```

`PlayerManager` 使用 `wx.getBackgroundAudioManager()`，并仅在初始化时注册一次 `onPlay`、`onPause`、`onStop`、`onEnded`、`onTimeUpdate`、`onWaiting`、`onCanplay`、`onError`、`onPrev` 和 `onNext`。页面与组件订阅统一状态，在隐藏或卸载时取消订阅；页面生命周期不会销毁或停止音频。

播放器状态包含 `currentTrack`、`queue`、`currentIndex`、`status`、`currentTime`、`duration`、`progress` 和 `playMode`。队列只使用播放入口当前已经加载的数据，不会自动请求后续分页。列表项可直接播放，点击主体仍进入详情；Mini Player 点击后进入独立播放页。

播放页优先解析 `lyricsLrc` 并同步高亮、滚动；没有 LRC 时回退到普通 `lyrics`。列表返回的数据不含歌词时，播放页按需请求详情并合并元数据，不重设音频地址。

### 图片、音频与后台播放

封面和头像加载失败时由 `media-artwork` 组件切换到 CSS 文本占位，不显示 broken image。正式播放器使用 `BackgroundAudioManager`；`app.json` 已声明 `"requiredBackgroundModes": ["audio"]`。应用进入后台或页面切换时不主动停止音频。

Seed 的 `example.com` 音频和部分图片 URL 只是占位地址。音频实际播放前，必须由内容方提供获得授权、可公开访问且支持 HTTPS 的资源 URL；不要使用来源或版权不明确的商业音频。资源服务器应支持 HTTP Range，以提高 seek 与长音频播放稳定性，NestJS 只返回 URL，不代理音频流。

开发者工具本地验证可暂时关闭合法域名校验，并访问 Mac 上的 `localhost`。真机的 `localhost` 指向手机自身；真机需要真实 AppID、微信后台合法域名、HTTPS 测试环境、真机网络权限及合法音频资源。开发者工具对后台播放和系统媒体控制的模拟并不等同于真机结果，发布前必须在 iOS、Android 真机分别验证。
