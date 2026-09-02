# 联机协议与可运维合同

目标版本：`1.17.0`

工程状态：自动化门槛由 CI 验证；真机与 4/6/8 人现场门槛保持
`PENDING_MANUAL_ACCEPTANCE`。

本文描述浏览器客户端与 room server 的版本、存活、就绪、排空、指标、冒烟、发布和回滚合同。房间仍为单实例内存状态；本文不引入持久化、多实例迁移或生产部署自动化。

## 应用版本与协议版本

- `appVersion` 是前端发布版本，用于展示和诊断，由 Vite 构建注入。
- `serverVersion` 是 room server 发布版本，由 `ROOM_SERVER_VERSION` 或镜像构建参数注入。
- `serverBuildSha`/`buildSha` 是可选的公开 Git commit 标识，由
  `ROOM_SERVER_BUILD_SHA` 注入；不得使用 secret 或环境变量全集代替。
- `protocolVersion` 只判断 WebSocket 消息兼容性，不从任何 package semver 推断。

唯一协议版本定义位于
`packages/game-core/src/onlineProtocolVersion.ts`：当前版本为 `1`，最低支持版本也为 `1`。
新客户端的 `create_room`、`join_room` 和 `resume_room` 都必须发送整数
`protocolVersion`；成功的私有 `session` 返回 `protocolVersion`、`serverVersion` 和
`serverBuildSha`。

首次引入协议版本时保留一条临时迁移路径：缺少字段按 v1 处理。显式字符串、小数、负数、不安全整数、低于最低版本或高于当前版本的值全部以
`INCOMPATIBLE_PROTOCOL` fail closed。客户端收到该错误后停止重连，保留已有 session
凭证，并提示刷新或关闭后重新打开，因此不会误删另一个仍有效的席位。

未来移除 legacy compatibility 时，应按顺序：先确认旧静态页面缓存窗口结束；删除
`resolveOnlineProtocolVersion()` 中仅处理 `undefined` 的迁移分支；增加缺字段拒绝测试；如需提高最低版本，先部署支持新旧版本的服务端，再部署新前端，最后提高
`MIN_SUPPORTED_ONLINE_PROTOCOL_VERSION`。不得用应用 semver 替代这一步。

## `/health` 与 `/ready`

| 端点 | 含义 | 正常 | draining |
| --- | --- | --- | --- |
| `/health` | 进程能否处理 HTTP，供 Docker/systemd liveness 使用 | `200` | `200` |
| `/ready` | 是否接受新房间工作负载，供发布和流量切换使用 | `200` | `503` |

`/health` 只有固定的聚合 allowlist：`status`、`version`、`buildSha`、
`protocolVersion`、`uptimeSeconds`、`rssBytes`、`rooms`、`activeGames`、
`connections`、`drainBlockingRooms`。`/ready` 明确返回 `acceptingNewRooms` 和
`draining`。单个房间已满不会被当作进程不健康。

Docker `HEALTHCHECK`、systemd 定时健康检查均使用 `/health`，以免正常 drain 被容器编排误判为故障并强杀。发布工具在切换流量前单独检查 `/ready`。

## Graceful drain

`SIGTERM` 和 `SIGINT` 进入同一个幂等关闭 Promise：

1. 立即把 readiness 切为 `503`；
2. 新的 `create_room` 返回 `SERVER_DRAINING`；
3. 已有房间仍可 join、resume 和执行全部既有游戏动作；
4. 等待 drain blocker 自然消失；
5. 到达 `ROOM_DRAIN_TIMEOUT_MS` 后有界关闭 WebSocket、HTTP 和全部 interval；
6. 进程以正常状态退出。

默认 timeout 为 `1800000` 毫秒（30 分钟），有效范围为 1 毫秒至 24 小时且必须是十进制整数。生产 systemd/Docker stop timeout 必须长于该值；当前示例分别使用 1900 秒与 1860 秒。重复信号不会开启第二次关闭或绕过等待。

Drain blocker 定义如下：

| 房间状态 | 是否阻塞 |
| --- | --- |
| 有连接玩家的 lobby | 是 |
| 正在进行的游戏，即使所有玩家暂时断线 | 是 |
| 已结束但仍有连接玩家读取结算 | 是 |
| 所有玩家均断开的 lobby | 否 |
| 所有玩家均断开的 finished 房间 | 否 |
| 已过期房间 | 已从 Map 删除，不进入快照 |

`rooms.size` 因而不是 drain 条件。房间、resume token 和游戏规则不会因开始 drain
而改变；只有最终关闭进程时内存房间才结束。

## 私有聚合指标

`/internal/metrics` 默认关闭，未配置 token 时返回 `404`。启用时设置
`ROOM_METRICS_TOKEN`：必须为 32–512 字节、不得含空白；请求使用
`Authorization: Bearer <token>`。服务端比较固定长度 SHA-256 摘要并调用恒定时间比较，错误或缺失 token 返回 `401`。token 不写入镜像层、日志、health、测试快照或 PR。

响应 schema version 为 `2`，只有三个顶层字段：`schemaVersion`、`counters`、`gauges`。
计数器 allowlist 为：

- `connectionsOpenedTotal`、`connectionsClosedTotal`
- `roomsCreatedTotal`、`roomJoinsTotal`、`roomResumesTotal`
- `gamesStartedTotal`、`gamesFinishedTotal`、`hostTransfersTotal`、`roomsExpiredTotal`
- `protocolRejectedTotal`、`rateLimitedMessagesTotal`
- `legacyProtocolAcceptedTotal`、`explicitProtocolAcceptedTotal`
- `roomResumeAttemptsTotal`、`roomResumeSucceededTotal`、`roomResumeRejectedTotal`

仪表 allowlist 为 `rooms`、`activeGames`、`connections`、`drainBlockingRooms`、
`draining`、`rssBytes`、`uptimeSeconds`。没有动态 label；未知错误不生成字段。响应不得包含昵称、房间码、player ID、resume/achievement token、request ID、设置、惩罚、消息正文或 URL fragment。

公开 Nginx 配置对 `/internal/metrics` 固定返回 `404`，即使应用层启用了 token 也不得转发。内部采集器只能从受控主机直连监听地址，并从 root-only 配置读取 Bearer token。

协议迁移与恢复计数的语义固定如下：

- `legacyProtocolAcceptedTotal`：create/join/resume 缺少 `protocolVersion`，且经临时兼容分支按
  v1 解析成功；同一连接上的同一初始 `requestId` 最多计一次。
- `explicitProtocolAcceptedTotal`：create/join/resume 显式携带受支持的整数协议版本并通过版本
  校验；业务层随后拒绝（例如房间不存在）仍代表一次已识别协议使用，但重复 `requestId` 不重计。
- `roomResumeAttemptsTotal`：协议解析成功、去重后进入 resume 业务分支时增加；协议不兼容请求
  不计入。
- `roomResumeSucceededTotal`：服务端成功轮换恢复凭证并向该席位返回新的私有 `session` 后增加。
- `roomResumeRejectedTotal`：进入 resume 业务分支后因房间/玩家不存在、凭证错误、连接已占用或
  其他固定业务拒绝而增加。

这些 counter 没有 label，拒绝原因不会动态进入字段名。暂时不能删除缺字段 compatibility：只有
内部指标在连续观察窗口内确认 `legacyProtocolAcceptedTotal` 不再增长，并且旧 PWA/静态页面缓存
窗口已经结束，后续版本才可移除。schema v2 只提供观测能力，本 PR 不移除兼容分支。

## Release smoke 与 CI

Shallow smoke 只读 health/readiness 并完成一次 WebSocket 连接，不创建房间：

```bash
node scripts/room-server-release-smoke.mjs \
  --health-url https://rooms.example/health \
  --ws-url wss://rooms.example \
  --expected-server-version 1.17.0 \
  --expected-protocol-version 1 \
  --origin https://atang-sp.github.io \
  --timeout-ms 5000
```

`--origin` 为配置了浏览器 Origin allowlist 的服务显式提供握手 Origin；参数只接受无凭据、路径、查询或 fragment 的 HTTP(S) origin。`--deep` 额外执行 synthetic create、join、断线、resume、私有投影检查和不兼容协议拒绝。它会改变目标服务的内存状态，因此只能显式用于本地或隔离环境，不能默认指向生产。脚本日志只输出阶段和固定错误码，不输出房间码、token 或消息 payload。

`npm run test:room-server-smoke` 会构建并启动临时 room server，运行 deep smoke，发送
SIGTERM，确认进程正常退出且端口关闭。CI 的独立 `Room Server Operability` job 运行 room server build、targeted tests、release smoke、完整 20 房间/160 连接压测和
`git diff --exit-code`。该压测在本轮基线约 0.7 秒，因此保留在 PR required 路径，不降级到较小样本。

CI 另有独立 `Mobile WebKit Smoke` job，使用 Playwright 内置 `iPhone 13` 配置和真实 WebKit
engine 验证首页/version、联机建房加入、开局、断线恢复、私有 session 投影、联机页刷新及不兼容
协议停止重连。现有 Chrome Browser E2E job 保持不变，WebKit failure trace 保留 7 天，测试只访问
本地 Vite 与临时 room server。

Automated WebKit coverage does not replace real iOS Safari acceptance.

## 发布顺序

版本发布必须按以下顺序执行，并分别保留 room server 与 Pages 的核验结论：

1. 从同一个 commit 构建前端与 room server，并注入 release version 与公开 build SHA；
2. 先部署仍兼容缺字段旧页面的新 room server；
3. 在流量切换前检查 `/ready`，部署后运行目标版本的 shallow smoke；
4. 再部署前端；
5. 对公开地址再运行 shallow smoke；
6. 真实 iOS Safari、Android Chrome 与 4/6/8 人现场验收另行执行；
7. 只有匿名人工证据合同通过后，才可把完整发布状态标为完成。

## 回滚顺序

1. 停止把新房间流量送入待回滚服务并确认 `/ready` 语义；
2. 对当前 room server 发出 SIGTERM，等待有界 drain；必要时只在 timeout 后强关；
3. 恢复上一不可变 room server 镜像及其配置；
4. 运行上一版本对应的 shallow smoke；
5. 如前端协议不再兼容，再恢复上一静态前端；
6. 不恢复数据库或磁盘房间，因为 room server 从未持久化房间。

回滚和发布均不得公开 metrics 端点、打印 token 或把 Pages 成功误报为 room server 已部署。

## 人工门槛

真实 iPhone/iPad Safari、Android Chrome、4/6/8 人真人现场对局、截图/录像人工核对和真实 Discourse 成就认领均未由本工程 PR 执行。其状态必须保持
`PENDING_MANUAL_ACCEPTANCE`，流程见 `deploy/room-server/ACCEPTANCE.md`。
