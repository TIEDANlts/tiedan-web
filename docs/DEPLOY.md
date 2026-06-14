# 部署手册（Stage 6A）

当前阶段只完成本地生产化准备：生产镜像、Compose、Caddy、手动部署门、备份脚本和 e2e 冒烟测试。真实云服务器、域名 HTTPS、对象存储、Healthchecks 和自动上线验收在最终上线阶段执行。

## 1. 备案与域名

如果最终部署到中国内地云服务器，ICP备案需要提前办理，通常需要 1-4 周日历时间。备案通过前，不要把正式域名长期解析到国内服务器。

公开页页脚读取：

- `ICP_BEIAN_NO`
- `GONGAN_BEIAN_NO`

本地或未备案时留空即可，页面不会显示空备案信息。

## 2. 服务器准备（最终上线时）

推荐配置：

- Ubuntu LTS
- Docker Engine 与 Docker Compose 插件
- 至少 2GB 内存
- 一块可扩容数据盘挂载到 `/data`

安全组和系统防火墙只开放：

- `80/tcp`
- `443/tcp`
- `22/tcp`，并限制来源 IP

PostgreSQL 不映射公网端口，只允许 Docker 内网访问。

以 Ubuntu LTS 为例，先完成系统更新、部署目录与防火墙设置：

```bash
sudo apt update
sudo apt upgrade -y
docker version
docker compose version
sudo usermod -aG docker "$USER"
sudo mkdir -p /data/tiedan-web
sudo chown -R "$USER":"$USER" /data/tiedan-web
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

执行 `usermod` 后重新登录 SSH，再确认当前用户可直接运行 `docker ps`。云厂商安全组与系统防火墙都必须放通 `80/tcp`、`443/tcp`；SSH 端口应先放通并限制来源 IP，避免启用防火墙后失联。

## 3. 生产环境文件

在服务器部署目录放置：

```text
docker-compose.prod.yml
Caddyfile
.env.production
scripts/backup.sh
```

首次可直接拉取仓库中的部署资产：

```bash
git clone https://github.com/TIEDANlts/tiedan-web.git /data/tiedan-web
cd /data/tiedan-web
cp .env.production.example .env.production
chmod 600 .env.production
```

编辑 `.env.production`，至少修改：

```env
APP_IMAGE=registry.cn-hangzhou.aliyuncs.com/namespace/tiedan-web:latest
SITE_DOMAIN=example.com
SITE_URL=https://example.com
POSTGRES_PASSWORD=replace-with-long-random-password
DATABASE_URL=postgresql://personal_site:replace-with-long-random-password@postgres:5432/personal_site
AUTH_SECRET=replace-with-openssl-rand-base64-32
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-long-random-password
BACKUP_REMOTE=backup-crypt:tiedan-web
```

生成 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

`POSTGRES_PASSWORD` 和 `DATABASE_URL` 中的密码必须保持一致。

`.env.production`、SSH 私钥、rclone 配置和对象存储密钥不得提交到 Git。

## 4. 本地生产化验证

本机 Docker 在 WSL 的 `Ubuntu-24.04` 里，PowerShell 通过 WSL 调用：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && APP_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml config"
```

本地构建生产镜像：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose --env-file .env.production -f docker-compose.prod.yml build app"
```

启动生产栈：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose --env-file .env.production -f docker-compose.prod.yml up -d"
```

入口日志中应先出现 Prisma migration 结果，再出现 Next.js 启动日志。也可手动检查迁移状态：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose --env-file .env.production -f docker-compose.prod.yml exec app ./node_modules/.bin/prisma migrate status"
```

查看日志：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app"
```

验证 sharp 在容器内可用：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && APP_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml run --rm --no-deps app node -e 'const s=require(String.fromCharCode(115,104,97,114,112));s({create:{width:2,height:2,channels:3,background:{r:255,g:255,b:255}}}).webp().toBuffer().then(function(b){console.log(b.length)})'"
```

也可以登录后台上传一张图片，确认返回的原图 URL 和 `-thumb` 缩略图都可访问。

## 5. Caddy 与公开上传文件

`Caddyfile` 使用 `{$SITE_DOMAIN}`。最终上线时，`SITE_DOMAIN` 必须是已备案并正确解析到服务器的域名。

在 DNS 服务商处添加：

- `A` 记录：主机记录按需要填写 `@` 或子域名，值为服务器公网 IPv4。
- 只有服务器已正确配置公网 IPv6 时才添加 `AAAA` 记录。

等待解析生效后验证：

```bash
dig +short example.com
curl -I http://example.com
curl -I https://example.com
```

Caddy 会在 80/443 可从公网访问且 DNS 已指向本机后自动申请 HTTPS 证书。

`/uploads/*` 由 Caddy 直接读取 `/data/uploads/public`：

```caddy
handle_path /uploads/* {
  root * /data/uploads/public
  header Cache-Control "public, max-age=31536000, immutable"
  file_server
}
```

私密文件不在此路径下暴露。Stage 14 才实现 private 区专门鉴权下载路由。

## 6. 首次部署（最终上线时）

使用国内容器镜像仓库时，先登录 registry：

```bash
docker login registry.cn-hangzhou.aliyuncs.com
cd /data/tiedan-web
docker compose --env-file .env.production -f docker-compose.prod.yml config
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 app
```

确认 `app`、`postgres`、`caddy` 均运行后，访问：

```bash
curl -fsS https://example.com/api/health
```

预期返回 `{"ok":true}`。

## 7. GitHub Actions

工作流位置：`.github/workflows/deploy.yml`。

自动执行：

- push / PR：只跑 `quality`，包含 `npm ci` 和 `npm run check`

手动执行：

- `workflow_dispatch`：通过后才构建镜像、推送 registry、SSH 部署

需要配置的 GitHub Secrets：

```text
REGISTRY_HOST
REGISTRY_USERNAME
REGISTRY_PASSWORD
REGISTRY_IMAGE
SSH_KEY
SERVER_HOST
SERVER_USER
SERVER_DEPLOY_PATH
```

当前 Stage 6A 不配置这些 secrets 也不会影响本地开发，因为部署 job 只有手动触发才运行。

如果暂时不用国内容器镜像仓库，可在服务器部署目录执行本地构建：

```bash
git pull --rebase origin main
docker compose --env-file .env.production -f docker-compose.prod.yml build app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

这个方式速度较慢，可回滚性也弱于 registry 镜像。

## 8. Healthchecks（最终上线时）

在 Healthchecks 服务中分别创建“每日备份”和“Steam 同步”两个 check：

1. “每日备份”的周期设为每天一次，宽限时间建议 1 小时。
2. 把其 ping URL 写入 `.env.production` 的 `HEALTHCHECKS_BACKUP_URL`。
3. 把“Steam 同步”的 ping URL 写入 `HEALTHCHECKS_STEAM_URL`；Stage 8 本地未配置时可跳过。
4. 配置邮件或其他通知渠道。

先验证成功与失败通知：

```bash
curl -fsS "$HEALTHCHECKS_BACKUP_URL"
curl -fsS "${HEALTHCHECKS_BACKUP_URL%/}/fail"
```

收到失败告警后再 ping 一次成功 URL，使 check 恢复正常。

Steam 同步宿主机 crontab 示例（每天 05:00 调用应用内 cron 接口）：

```cron
0 5 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" "https://example.com/api/cron/steam-sync" >> /var/log/tiedan-steam-sync.log 2>&1
```

如果服务器没有把 `.env.production` 自动加载到 crontab 环境，可在命令里改用真实 token，或先在 crontab 顶部声明 `CRON_SECRET=...`。安装后检查：

```bash
crontab -l
tail -n 100 /var/log/tiedan-steam-sync.log
```

## 9. rclone crypt 备份

对象存储中只能保存加密后的备份。以下是 rclone 配置示例，实际 key 与 endpoint 只放服务器本机：

```ini
[oss-raw]
type = s3
provider = Alibaba
access_key_id = REPLACE_ME
secret_access_key = REPLACE_ME
endpoint = oss-cn-hangzhou.aliyuncs.com
acl = private

[backup-crypt]
type = crypt
remote = oss-raw:your-bucket/tiedan-web
password = REPLACE_WITH_RCLONE_OBSCURED_PASSWORD
password2 = REPLACE_WITH_RCLONE_OBSCURED_SALT
filename_encryption = standard
directory_name_encryption = true
```

把配置保存到服务器当前部署用户的 `~/.config/rclone/rclone.conf`，并限制权限：

```bash
mkdir -p ~/.config/rclone
chmod 700 ~/.config/rclone
chmod 600 ~/.config/rclone/rclone.conf
```

生成 crypt 密码：

```bash
rclone obscure 'your-long-password'
```

确认脚本使用的是 `crypt` 远端，并做一次加密写入测试：

```bash
rclone config show backup-crypt
printf 'backup test\n' | rclone rcat backup-crypt:tiedan-web/connection-test.txt
rclone lsf backup-crypt:tiedan-web
```

备份脚本：

```bash
sh scripts/backup.sh
```

脚本会：

- 对 `postgres` 服务执行 `pg_dump | gzip`
- 打包 `tiedan_web_uploads_data` Docker volume
- 上传到 `BACKUP_REMOTE`
- 删除远端 30 天前的备份文件
- 成功 ping `HEALTHCHECKS_BACKUP_URL`
- 失败 ping `HEALTHCHECKS_BACKUP_URL/fail`

宿主机 crontab（每天 04:00）：

```cron
0 4 * * * cd /data/tiedan-web && /bin/sh scripts/backup.sh >> /var/log/tiedan-backup.log 2>&1
```

安装 crontab 后检查：

```bash
crontab -l
tail -n 100 /var/log/tiedan-backup.log
```

## 10. 恢复演练（最终上线时）

先列出并下载一份加密备份到临时目录：

```bash
rclone lsf backup-crypt:tiedan-web
rclone copy backup-crypt:tiedan-web/20260614-040000 ./restore-test
```

推荐先恢复到独立临时数据库，避免覆盖生产数据：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  createdb -U personal_site tiedan_restore
gunzip -c restore-test/postgres-20260614-040000.sql.gz | \
  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  psql -U personal_site tiedan_restore
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  psql -U personal_site -d tiedan_restore -c '\dt'
```

解压 uploads：

```bash
mkdir -p ./restore-uploads
tar -xzf restore-test/uploads-20260614-040000.tar.gz -C ./restore-uploads
```

确认 JSON/数据库、图片文件都能正常读取后，才算备份链路可用。

演练结束后删除临时数据库：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  dropdb -U personal_site tiedan_restore
```

## 11. e2e 冒烟测试

先启动本地服务，然后运行：

```powershell
$env:BASE_URL="http://localhost:3000"
$env:ADMIN_USERNAME="你的管理员用户名"
$env:ADMIN_PASSWORD="你的管理员密码"
npm.cmd run e2e
```

测试覆盖：

- `/api/health` 返回 `{ ok: true }`
- 匿名访问 `/blog` 返回 200 且不跳 `/login`
- 登录后可访问 `/todos`

上线后把 `BASE_URL` 改为正式域名再跑一次。

## 12. 日志与回滚

常用排查命令：

```bash
cd /data/tiedan-web
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=200 app
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=200 caddy
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=200 postgres
```

如果使用 registry 镜像，服务器上的 `.env.production` 可以临时把 `APP_IMAGE` 改回上一版 tag：

```env
APP_IMAGE=registry.cn-hangzhou.aliyuncs.com/namespace/tiedan-web:previous-sha
```

然后执行：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

如果数据库迁移已经执行，回滚前必须先确认该迁移是否兼容旧代码；不确定时不要回滚应用，先从备份恢复到临时库验证。
