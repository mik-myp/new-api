# New API 发布运行手册

本文档记录本仓库从功能开发、合并、镜像构建、服务器发布、验证到回滚的标准流程。它适用于当前 fork 的生产部署模式：

- GitHub 仓库负责代码管理和触发 Docker 镜像构建。
- Docker Hub 镜像仓库默认使用 `xiaotubao/new-api`；如果 Docker Hub namespace 不同，在 GitHub Actions Repository Variables 中设置 `DOCKERHUB_IMAGE` 覆盖。
- 服务器通过 Docker Compose 运行 `new-api`、`postgres`、`redis`。
- 生产服务器只拉取镜像并重建应用容器，不在服务器上长期保存源码。

## 0. AI 助手强制执行要求

本手册是项目级强制规范，不只是运维参考文档。Codex、Claude 以及其他 AI 编码助手在新的对话、其他开发者发起的开发任务、发布任务或排障任务中，都必须遵守本手册。

AI 助手执行开发和发布相关工作时必须遵守：

- 开发需求完成后，先按改动范围完成本地或 CI 验证，再根据本手册确定发布 tag。tag 使用 `YYYYMMDD-短commit` 格式，例如 `20260528-afe5540c`。
- Docker 镜像通过推送 release Git tag 到 GitHub 自动触发构建；手动触发 GitHub Actions 并填写已存在的 tag 是备用方式。AI 助手只能给出 tag 和操作步骤，不得假设镜像已经构建完成。
- 进入 SSH 服务器部署阶段后，必须一步一步执行：AI 助手每次只给一条命令或一个很小的命令组，等待开发者或维护者返回命令输出，检查输出无异常后，才能给下一步命令。
- 如果 SSH 命令输出中出现错误、异常健康状态、容器反复重启、数据库或 Redis 错误，必须先停止继续发布并分析输出，不得继续给后续部署命令。
- 不得把发布前备份、镜像拉取、容器重建、健康检查、日志检查合并成一整段无人确认的长脚本。
- 不得执行或建议执行 `docker compose down -v`、`docker volume rm ...`、删除 `data`、`logs`、`backups` 等高风险操作，除非维护者明确授权，并且已经确认备份和回滚影响。

## 1. 当前生产部署形态

当前线上服务采用 Docker Compose 部署：

```text
部署目录: /opt/new-api
应用容器: new-api
应用镜像: xiaotubao/new-api:latest
应用端口: 0.0.0.0:3000 -> container 3000
反向代理: 按服务器实际配置，可为 Caddy 或直接开放 3000
数据库: postgres:15 容器
缓存: redis:latest 容器
主要配置: /opt/new-api/docker-compose.yml
覆盖配置: /opt/new-api/docker-compose.override.yml
```

典型访问链路：

```text
公网域名/HTTPS -> Caddy 或安全组端口 -> new-api:3000
```

线上部署目录只应保存运行配置、数据、日志和备份：

```text
/opt/new-api/
  docker-compose.yml
  docker-compose.override.yml
  data/
  logs/
  backups/
```

不要把开发源码、临时构建产物、测试数据库或本地 `.env` 文件长期混放在生产部署目录中。

## 2. 开发前准备

从最新 `main` 创建短生命周期分支：

```powershell
cd D:\code-projects\new-api
git checkout main
git fetch origin
git pull --ff-only origin main
git checkout -b feature/<scope>-<short-desc>
```

分支命名建议：

```text
feature/<scope>-<short-desc>   新功能
fix/<scope>-<short-desc>       缺陷修复
refactor/<scope>-<short-desc>  重构
docs/<scope>-<short-desc>      文档
chore/<scope>-<short-desc>     维护
hotfix/<scope>-<short-desc>    紧急修复
```

开发时遵守项目规范：

- Go 业务代码的 JSON 编解码使用 `common/json.go` 中的包装函数。
- 数据库代码必须同时兼容 SQLite、MySQL、PostgreSQL。
- 前端默认使用 Bun。
- 修改计费表达式系统前先阅读 `pkg/billingexpr/expr.md`。
- 不要修改、删除或替换项目策略保护的名称、品牌、归属和元数据。
- 上游 relay 请求 DTO 中的可选标量字段使用指针类型加 `omitempty`，避免显式 `0`、`false` 被丢弃。

## 3. 本地验证

根据改动范围选择最小但有效的验证。

后端改动：

```powershell
go test ./...
```

或只跑相关包：

```powershell
go test ./controller ./model
```

前端改动：

```powershell
cd web/default
bun run typecheck
bun run build
```

涉及前端展示文案或翻译 key：

```powershell
cd web/default
bun run i18n:sync
```

如果本机缺少 Go、Docker 或 Bun，至少应让 GitHub Actions 完成对应构建验证后再发布。

## 4. 提交和合并

提交前检查工作区：

```powershell
git status --short
git diff
```

提交使用 Conventional Commits：

```powershell
git add <files>
git commit -m "feat: add xxx"
git push -u origin feature/<scope>-<short-desc>
```

推荐通过 Pull Request 合并到 `main`。PR 描述应包含：

- 改了什么。
- 为什么改。
- 如何验证。
- 是否涉及数据库迁移、计费、relay/provider、认证、前端 i18n。
- 是否需要运维发布或配置变更。

合并后确认本地 `main` 与远端一致：

```powershell
git checkout main
git pull --ff-only origin main
git log -1 --oneline
```

记录短提交号，例如：

```text
afe5540c
```

如果本次需求准备发布，合并到 `main` 并确认短提交号后，确定本次发布 tag：

```text
YYYYMMDD-短commit
```

示例：

```text
20260528-afe5540c
```

AI 助手在需求完成后应明确给出建议发布 tag，并提醒开发者或维护者创建并推送该 Git tag。tag 推送到 GitHub 后会自动触发 Docker 镜像构建；如果自动触发失败，可用同一个已存在 tag 手动运行 GitHub Actions。

## 5. 构建 Docker 镜像

生产镜像通过 GitHub Actions 构建并推送到 Docker Hub。默认路径是创建并推送 release Git tag；手动运行 workflow 只作为备用方式。AI 助手负责提供准确的 tag 和核对步骤。

自动构建路径：

```powershell
git checkout main
git pull --ff-only origin main
git tag YYYYMMDD-短commit
git push origin YYYYMMDD-短commit
```

示例：

```powershell
git tag 20260528-afe5540c
git push origin 20260528-afe5540c
```

GitHub 收到 tag push 后会自动运行：

```text
Actions
-> Publish Docker image (Multi-arch)
```

备用手动路径：

```text
Actions
-> Publish Docker image (Multi-arch)
-> Run workflow
```

参数填写：

```text
Branch: main
tag: YYYYMMDD-短commit
```

示例：

```text
tag: 20260528-afe5540c
```

手动触发时填写的 tag 必须已经存在于 GitHub 仓库中；workflow 会检出该 tag 对应的提交进行构建。

Actions 默认会构建并推送：

```text
xiaotubao/new-api:YYYYMMDD-短commit
xiaotubao/new-api:latest
```

同时还会生成架构标签：

```text
xiaotubao/new-api:YYYYMMDD-短commit-amd64
xiaotubao/new-api:YYYYMMDD-短commit-arm64
xiaotubao/new-api:latest-amd64
xiaotubao/new-api:latest-arm64
```

如果 GitHub Actions Repository Variable `DOCKERHUB_IMAGE` 已设置，则以上镜像名前缀以该变量为准。

### Docker Hub 凭据

GitHub Actions 依赖以下仓库 secrets：

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

可选配置以下仓库变量：

```text
DOCKERHUB_IMAGE
```

`DOCKERHUB_USERNAME` 是 Docker Hub 登录账号，当前使用 `xiaotubao`。

`DOCKERHUB_TOKEN` 是 Docker Hub Personal Access Token，应具备推送目标镜像仓库的权限。不要使用个人密码。

`DOCKERHUB_IMAGE` 是完整 Docker Hub 镜像仓库名，例如 `xiaotubao/new-api`。未设置时，workflow 默认使用 `xiaotubao/new-api`。

### 常见构建失败

`Username and password required`：

```text
GitHub Actions 缺少 DOCKERHUB_USERNAME 或 DOCKERHUB_TOKEN，或 token 无 push 权限。
```

`go build ... exit code: 1`：

```text
后端编译失败，查看 build record 或 Actions 日志中的 Go 编译错误。
```

`bun run build` 失败：

```text
前端构建失败，优先本地进入 web/default 复现。
```

镜像推送失败：

```text
确认 Docker Hub 仓库存在，且 token 对该仓库有 Read & Write 权限。
```

开始服务器发布前，必须确认 GitHub Actions 已成功完成，并确认 Docker Hub 上存在本次明确版本 tag。未确认镜像构建成功时，不得进入 SSH 服务器部署步骤。

## 6. 发布前备份

发布服务器前必须先备份。备份目录统一放在：

```text
/opt/new-api/backups/release-YYYYMMDDHHMMSS/
```

SSH 到服务器后执行：

```bash
cd /opt/new-api
IMAGE_NAME="xiaotubao/new-api"
TS=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="backups/release-$TS"
mkdir -p "$BACKUP_DIR"
echo "BACKUP_DIR=$BACKUP_DIR"

cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml"
[ -f docker-compose.override.yml ] && cp docker-compose.override.yml "$BACKUP_DIR/docker-compose.override.yml" || true

docker image tag "${IMAGE_NAME}:latest" "${IMAGE_NAME}:rollback-$TS"

docker compose exec -T postgres pg_dump -U root -d new-api > "$BACKUP_DIR/new-api-db.sql"

docker image inspect "${IMAGE_NAME}:rollback-$TS" \
  --format '{{.RepoTags}} {{.Id}}' > "$BACKUP_DIR/rollback-image.txt"

ls -lh "$BACKUP_DIR"
docker images "$IMAGE_NAME" \
  --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}' | head -20
```

一份合格的发布前备份至少包含：

```text
docker-compose.yml
docker-compose.override.yml
new-api-db.sql
rollback-image.txt
```

还应能看到旧镜像标签：

```text
xiaotubao/new-api:rollback-YYYYMMDDHHMMSS
```

## 7. 服务器发布

确认 GitHub Actions 成功后，在服务器拉取新镜像并重建应用容器。

通过 SSH 服务器执行发布时，必须按交互式步骤进行：AI 助手先给下一条命令或一个小命令组，开发者或维护者执行后返回完整输出，AI 助手检查输出后再给下一步。不要一次性给出完整发布脚本让服务器无人确认地连续执行。

将 `<tag>` 替换为本次发布 tag，例如 `20260528-afe5540c`：

```bash
cd /opt/new-api
IMAGE_NAME="xiaotubao/new-api"

docker pull "${IMAGE_NAME}:<tag>"
docker pull "${IMAGE_NAME}:latest"

docker images "$IMAGE_NAME" \
  --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}' | head -20

docker compose up -d new-api
docker compose ps
```

首次切换到 GitHub Actions 构建镜像前，必须确认 `/opt/new-api/docker-compose.yml` 中 `new-api` 服务的 `image:` 与 `IMAGE_NAME:latest` 一致。不要继续使用无 Docker Hub namespace 的本地镜像名，例如 `mik-myp-new-api:latest`，否则服务器不会使用 GitHub Actions 推送到 Docker Hub 的镜像。

`docker compose up -d new-api` 可能会显示 postgres、redis 处于 Started 状态，这是 Compose 处理依赖服务时的正常输出。重点确认没有删除 volume、没有重建数据库数据目录。

不要执行以下高风险操作，除非非常明确知道后果：

```bash
docker compose down -v
docker volume rm ...
rm -rf data logs backups
```

## 8. 发布后验证

发布后必须验证健康状态、接口和日志。

```bash
cd /opt/new-api

for i in $(seq 1 20); do
  docker compose ps
  status=$(docker inspect new-api --format '{{.State.Health.Status}}' 2>/dev/null || echo unknown)
  echo "new-api health=$status"
  [ "$status" = "healthy" ] && break
  sleep 3
done

curl -fsS http://127.0.0.1:3000/api/status | head -c 500
echo

docker logs --tail=120 new-api
```

发布成功的最低确认标准：

```text
new-api health=healthy
postgres healthy
redis healthy
/api/status 返回 200
日志中出现 New API <tag> started
没有持续 panic、migration error、database error、redis error
实际 relay 请求正常返回 200
```

如果站点有公网域名，还应从外部确认：

```bash
curl -I https://<domain>
```

## 9. 镜像回滚

如果新版本异常，优先回滚应用镜像。镜像回滚不会恢复数据库，只会把应用容器切回旧版本。

先查看可用回滚镜像：

```bash
IMAGE_NAME="xiaotubao/new-api"
docker images "$IMAGE_NAME" \
  --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}' | grep -E 'rollback|TAG|latest'
```

执行回滚：

```bash
cd /opt/new-api
IMAGE_NAME="xiaotubao/new-api"

docker tag "${IMAGE_NAME}:rollback-<backup-ts>" "${IMAGE_NAME}:latest"
docker compose up -d new-api

docker compose ps
curl -fsS http://127.0.0.1:3000/api/status | head -c 500
echo
docker logs --tail=120 new-api
```

示例：

```bash
IMAGE_NAME="xiaotubao/new-api"
docker tag "${IMAGE_NAME}:rollback-20260528032953" "${IMAGE_NAME}:latest"
docker compose up -d new-api
```

回滚后也要按发布后验证流程确认健康状态。

## 10. 数据库恢复

数据库恢复是高风险操作。只有在确认数据库被破坏、迁移造成不可接受的数据问题，且应用镜像回滚无法解决时才考虑恢复数据库。

恢复前必须先再次备份当前数据库：

```bash
cd /opt/new-api
TS=$(date +%Y%m%d%H%M%S)
docker compose exec -T postgres pg_dump -U root -d new-api > "backups/pre-db-restore-$TS.sql"
```

停止应用容器，避免恢复时继续写入：

```bash
docker compose stop new-api
```

恢复 PostgreSQL dump 的具体命令应根据 dump 格式、数据库大小和当前连接情况确认后执行。不要在未确认影响范围时直接覆盖生产数据库。

恢复完成后启动应用并验证：

```bash
docker compose up -d new-api
docker compose ps
curl -fsS http://127.0.0.1:3000/api/status | head -c 500
docker logs --tail=120 new-api
```

一般发布失败只需要回滚镜像，不需要恢复数据库。

## 11. 备份和旧镜像清理

新版本稳定运行 7 到 14 天后，可以清理旧备份和旧镜像。

查看备份：

```bash
cd /opt/new-api
find backups -maxdepth 2 -type f -printf '%TY-%Tm-%Td %TH:%TM %10s %p\n' | sort
```

查看镜像：

```bash
IMAGE_NAME="xiaotubao/new-api"
docker images "$IMAGE_NAME"
```

建议至少保留：

```text
最近一次发布前备份
最近一个 rollback 镜像
最近一个明确版本 tag
```

清理旧 SQL 备份前，确认新版本已经稳定，且不再需要恢复到对应时间点。

## 12. 紧急排查命令

查看容器：

```bash
cd /opt/new-api
docker compose ps
docker inspect new-api --format '{{.State.Health.Status}}'
```

查看应用日志：

```bash
docker logs --tail=200 new-api
docker logs -f new-api
```

查看本机接口：

```bash
curl -fsS http://127.0.0.1:3000/api/status | head -c 1000
```

查看 Caddy：

```bash
systemctl status caddy --no-pager
journalctl -u caddy -n 100 --no-pager
```

查看数据库和 Redis：

```bash
docker compose logs --tail=100 postgres
docker compose logs --tail=100 redis
docker compose exec -T postgres pg_isready -U root -d new-api
docker compose exec -T redis redis-cli -a '<redis-password>' ping
```

查看磁盘和内存：

```bash
free -h
df -h / /home /var/lib/docker 2>/dev/null || true
docker system df
```

## 13. 发布检查清单

发布前：

- `main` 已包含本次发布代码。
- GitHub Actions `Publish Docker image (Multi-arch)` 构建成功。
- 已记录本次发布 tag，例如 `20260528-afe5540c`。
- 已创建 `backups/release-<ts>/`。
- 已备份 compose 文件。
- 已导出 PostgreSQL 数据库。
- 已创建 rollback 镜像 tag。

发布中：

- 已拉取 `xiaotubao/new-api:<tag>`。
- 已拉取 `xiaotubao/new-api:latest`。
- `latest` 指向本次新镜像。
- 已执行 `docker compose up -d new-api`。

发布后：

- `new-api` 为 `healthy`。
- `postgres` 为 `healthy`。
- `redis` 为 `healthy`。
- `/api/status` 返回 200。
- 日志显示 `New API <tag> started`。
- 没有持续错误日志。
- 至少一次真实业务请求或管理页面访问正常。

回滚准备：

- 知道本次备份目录。
- 知道 rollback 镜像 tag。
- 知道如何恢复旧镜像。
- 数据库备份保留且未删除。

## 14. 本次发布记录示例

一次完整发布记录可以写成：

```text
发布时间: 2026-05-28
发布 tag: 20260528-afe5540c
镜像: xiaotubao/new-api:20260528-afe5540c
latest image id: a5d47d58f902
备份目录: /opt/new-api/backups/release-20260528032953/
rollback tag: xiaotubao/new-api:rollback-20260528032953
验证:
  new-api healthy
  postgres healthy
  redis healthy
  /api/status 200
  New API 20260528-afe5540c started
```
