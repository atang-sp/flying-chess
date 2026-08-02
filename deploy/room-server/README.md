# 联机升温局房间服务部署

生产拓扑：GitHub Pages 前端连接 `wss://rooms.atang-sp.run.place`；Discourse 容器内的 Nginx 终止 TLS，并反代到 Docker 网桥 `172.17.0.1:8787`。房间容器使用 host 网络并只监听该网桥地址，避免 Docker 发布端口在同机容器间被防火墙阻断，也不会把 `8787` 暴露到公网。房间服务不写磁盘，容器被限制为 128 MiB 内存、1 CPU、只读根文件系统。

## 构建与安装

在已检出不可变 `v1.12.1` 标签的仓库根目录执行：

```bash
docker build -f apps/room-server/Dockerfile -t flying-chess-room:1.12.1 .
install -m 0644 deploy/room-server/flying-chess-room.service /etc/systemd/system/
install -m 0644 deploy/room-server/flying-chess-room-health.service /etc/systemd/system/
install -m 0644 deploy/room-server/flying-chess-room-health.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now flying-chess-room.service flying-chess-room-health.timer
```

`/etc/flying-chess-room.env` 可覆盖 `ROOM_IMAGE`，不得放置房间码、昵称、玩法设置或消息内容。服务只输出启动状态；Nginx 对该子域关闭 access log。

## Discourse 反代与证书

先备份 `/var/discourse/containers/app.yml`，再把 `rooms.atang-sp.run.place` 加到 `DISCOURSE_HOSTNAME_ALIASES`，并在 `run:` 中将 `deploy/room-server/rooms.nginx.conf` 的内容写到 `/etc/nginx/conf.d/rooms.conf`。执行 `/var/discourse/launcher rebuild app` 后，Let's Encrypt 会签发包含主域与房间子域的同一证书。

重建前必须创建 Discourse 数据备份及 SHA-256 校验，并记录原容器、配置和插件版本。重建后验证：

```bash
curl --fail https://atang-sp.run.place/srv/status
curl --fail https://rooms.atang-sp.run.place/health
systemctl is-active flying-chess-room.service
systemctl is-active flying-chess-room-health.timer
docker inspect --format '{{.State.Health.Status}} {{.HostConfig.Memory}}' flying-chess-room
```

健康响应只有聚合的房间数、连接数、运行时长与 RSS，不包含房间码、昵称、玩法设置或消息正文。

## 回滚

先恢复时间戳备份的 `app.yml` 并重建 Discourse，使主域证书和 Nginx 恢复；随后执行：

```bash
systemctl disable --now flying-chess-room-health.timer flying-chess-room.service
```

停止服务会结束全部内存房间，这是协议的既定行为。不要尝试从磁盘恢复房间。
