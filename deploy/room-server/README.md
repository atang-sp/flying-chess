# 联机升温局房间服务部署

生产拓扑：GitHub Pages 前端连接 `wss://rooms.atang-sp.run.place`；Discourse 容器内的 Nginx 终止 TLS，并反代到 Docker 网桥 `172.17.0.1:8787`。房间容器使用 host 网络并只监听该网桥地址，避免 Docker 发布端口在同机容器间被防火墙阻断，也不会把 `8787` 暴露到公网。房间服务不写磁盘，容器限制为 128 MiB 内存、1 CPU、只读根文件系统。

完整协议、health/readiness、drain blocker、metrics、smoke、发布和回滚合同见
[`docs/ONLINE_OPERABILITY.md`](../../docs/ONLINE_OPERABILITY.md)。本文件只记录生产操作形状；本轮 PR 不执行这些操作。

## 构建与版本注入

在已检出不可变 `v1.15.0` 标签的仓库根目录构建同一 commit。`ROOM_SERVER_BUILD_SHA` 只能是公开 Git commit 标识：

```bash
docker build -f apps/room-server/Dockerfile \
  --build-arg ROOM_SERVER_VERSION=1.15.0 \
  --build-arg ROOM_SERVER_BUILD_SHA=<公开完整 commit SHA> \
  -t flying-chess-room:1.15.0 .
```

不要把 metrics、achievement 或其他 secret 作为 build arg；它们不得进入镜像层。

`/etc/flying-chess-room.env` 是服务启动的必需配置文件，必须为 root 所有且权限为
`0600`。至少写入：

```dotenv
ROOM_SERVER_VERSION=1.15.0
ROOM_SERVER_BUILD_SHA=<公开完整 commit SHA>
ROOM_DRAIN_TIMEOUT_MS=1800000
```

启用内部 metrics 时可增加至少 32 字节的随机 token：

```dotenv
ROOM_METRICS_TOKEN=<root-only internal metrics token>
```

启用论坛成就认领时，还必须同时配置：

```dotenv
ACHIEVEMENT_CLAIM_SECRET=<与 Discourse 插件相同的至少 32 字节随机密钥>
ACHIEVEMENT_CLAIM_URL=https://atang-sp.run.place/where-is-my-friends/flying-chess
```

成就两项缺一时服务拒绝启动；轮换密钥会令尚未认领的旧凭证失效。不得在环境文件中保存房间码、昵称、玩法设置或消息内容。认领凭证只放在 URL fragment 中，不会随论坛页面请求进入 HTTP access log。

安装单元文件：

```bash
ufw allow in on docker0 from 172.17.0.0/16 to 172.17.0.1 port 8787 proto tcp comment "flying chess room from discourse"
install -m 0644 deploy/room-server/flying-chess-room.service /etc/systemd/system/
install -m 0644 deploy/room-server/flying-chess-room-health.service /etc/systemd/system/
install -m 0644 deploy/room-server/flying-chess-room-health.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now flying-chess-room.service flying-chess-room-health.timer
```

30 分钟 drain 要求 Docker stop timeout 和 systemd `TimeoutStopSec` 更长；示例单元分别使用 1860 秒和 1900 秒。不得缩短为十几秒，否则正常滚动停止会被强杀。

## Health、readiness 与 metrics

- Docker HEALTHCHECK 和 systemd timer 调用 `/health`；draining 时仍为 `200`。
- 发布/流量切换单独调用 `/ready`；draining 时为 `503`。
- `/internal/metrics` 无 token 时为 `404`，有 token但认证错误时为 `401`。
- Nginx 公网 virtual host 对 `/internal/metrics` 固定返回 `404`；内部采集器只可直连受控监听地址。

内部抓取必须从 root-only 配置取得 token，并发送 Bearer header；命令、日志和工单不得打印 token。health、ready 和 metrics 都不得包含房间码、昵称、player ID、resume token、玩法设置、惩罚或消息正文。

## Discourse 反代与证书

先备份 `/var/discourse/containers/app.yml`，再把 `rooms.atang-sp.run.place` 加到
`DISCOURSE_HOSTNAME_ALIASES`，并在 `run:` 中将
`deploy/room-server/rooms.nginx.conf` 的内容写到 `/etc/nginx/conf.d/rooms.conf`。该配置明确拒绝公网 metrics。执行 `/var/discourse/launcher rebuild app` 后，Let's Encrypt 会签发包含主域与房间子域的同一证书。

重建前必须创建 Discourse 数据备份及 SHA-256 校验，并记录原容器、配置和插件版本。重建后验证：

```bash
curl --fail https://atang-sp.run.place/srv/status
curl --fail https://rooms.atang-sp.run.place/health
curl --fail https://rooms.atang-sp.run.place/ready
systemctl is-active flying-chess-room.service
systemctl is-active flying-chess-room-health.timer
docker inspect --format '{{.State.Health.Status}} {{.HostConfig.Memory}}' flying-chess-room
docker exec app curl --fail http://172.17.0.1:8787/ready
```

health 中的 `version`、`buildSha` 和 `protocolVersion` 必须与同一发布 commit 一致。

## 发布顺序

1. 从同一 commit 构建前端和 room server；
2. 先部署向后兼容缺字段旧客户端的新 room server；
3. 在内部地址检查 `/ready`，再运行目标版本 shallow smoke；
4. 部署前端；
5. 对公开 health/WSS 再运行 shallow smoke；
6. 人工真机与 4/6/8 人现场验收保持 `PENDING_MANUAL_ACCEPTANCE`，另行执行。

示例 shallow smoke：

```bash
node scripts/room-server-release-smoke.mjs \
  --health-url https://rooms.atang-sp.run.place/health \
  --ws-url wss://rooms.atang-sp.run.place \
  --expected-server-version 1.15.0 \
  --expected-protocol-version 1 \
  --timeout-ms 5000
```

不要对生产地址增加 `--deep`；deep 会创建 synthetic 内存房间，仅用于本地或隔离环境。

## Graceful stop 与回滚

`systemctl stop` 或 `restart` 触发 SIGTERM：readiness 先变为 `503`，停止创建新房间，但已有房间可 join、resume 和继续完成。无 blocker 时立即退出；否则最多等待
`ROOM_DRAIN_TIMEOUT_MS`，随后有界关闭。重复信号不会重复关闭。

回滚时先恢复上一不可变 room server 镜像和 root-only 环境文件，启动后运行上一版本 shallow smoke；若协议需要，再恢复上一静态前端。房间只在内存中，强制关闭会结束剩余房间，不得尝试从磁盘或数据库恢复。

若需要完全移除该服务，先恢复时间戳备份的 `app.yml` 并重建 Discourse，使主域证书和 Nginx 恢复；随后执行：

```bash
systemctl disable --now flying-chess-room-health.timer flying-chess-room.service
ufw delete allow in on docker0 from 172.17.0.0/16 to 172.17.0.1 port 8787 proto tcp
```

发布后的真机与真人现场验收见 [ACCEPTANCE.md](./ACCEPTANCE.md)。缺少其中任一匿名证据时，发布不得判定完成。
