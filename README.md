# 铁蛋的个人网站

单用户个人生活管理网站。当前处于 Stage 0：工程地基初始化。

## 本地启动

1. 启动数据库：

```bash
docker compose -f docker-compose.dev.yml up -d
```

如果 Docker 只安装在 WSL 内，请先进入能运行 Docker 的 Ubuntu 发行版，再从本仓库目录执行同一条命令。

2. 执行迁移：

```bash
npx prisma migrate dev
```

3. 启动开发服务器：

```bash
npm run dev
```

## 约定

主题 token 已在 Stage 0 接入，后续组件不得散写 hex；颜色、圆角和模块色应来自 `src/app/globals.css` 与 `src/lib/design.ts`。
