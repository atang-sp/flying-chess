# 联机升温局发布验收

这份流程是 v1.12 联机升温局的发布终点，不是自动化演示。自动浏览器、WebSocket 脚本、模拟客户端或代理人不能替代真实 iOS、Android 与 4/6/8 名真人参加者。任一门槛缺证据时，校验器必须失败，发布状态保持未完成。

## 前置条件

开始现场验收前必须同时满足：

- `rooms.atang-sp.run.place` 的权威 DNS 已生效；
- 公网证书 SAN 同时包含主域和房间子域；
- 公网 `https://rooms.atang-sp.run.place/health` 与真实 `wss://rooms.atang-sp.run.place` 建房、加入、断线重连冒烟通过；
- Discourse 主站健康，部署期间内核 OOM 为 0；
- 20 房间、160 连接压测测量全部房间客户端收到状态的延迟，P95 小于 500ms，房间服务 RSS 小于 128MiB；
- 日志与验收材料均不包含房间码、昵称、玩法设置、消息正文或惩罚内容。

## 匿名证据目录

证据不得提交到仓库。先复制模板到已被 `.gitignore` 排除的目录：

```bash
mkdir -p .acceptance-evidence/v1.14.2/{evidence,artifacts}
cp deploy/room-server/acceptance-evidence.template.json \
  .acceptance-evidence/v1.14.2/evidence.json
```

每个 `evidenceRefs` 都必须指向结构化 JSON 证明，可从 `acceptance-proof.template.json` 复制。证明必须包含同一个发布标签、UTC 时间、证明类别、与主清单完全一致的 `claims`，以及至少一个原始材料文件和它的 SHA-256。校验器会读取原始文件并重新计算摘要；空文件、目录、错误摘要、错误版本、错误类别、声明不一致或私人字段都会失败。

九份证明使用下列六种 `kind`；各自的 `claims` 必填字段如下：

| `kind`                   | `claims` 字段                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `public_gateway`         | `dnsResolved`、`certificateSans`、`httpsHealth`、`wssCreateJoinReconnect`                                |
| `load_test`              | `rooms`、`connections`、`measurementScope`、`p95Ms`、`rssMiB`                                            |
| `privacy_audit`          | `passed`                                                                                                 |
| `production_observation` | `discourseHealthy`、`kernelOomEvents`、`swapSamplesMiB`                                                  |
| `physical_device`        | `platform`、`realDevice`、`createRoom`、`reconnect`、`fullGameCompleted`                                 |
| `field_session`          | `playerCount`、`realParticipants`、`unattended`、`completed`、`joinConfirmSeconds`、`staffInterventions` |

`public_gateway`、`load_test`、`privacy_audit`、`production_observation` 各一份，`physical_device` 两份，`field_session` 三份。`claims` 中的值必须与 `evidence.json` 对应项一致。

原始材料只记录：发布标签、UTC 时间范围、设备/浏览器类别、参加人数、是否完成、重连结果、加入确认耗时和人工介入次数。不要记录参与者身份、昵称、房间码、SP 设置、聊天/消息正文或惩罚内容。截图和录像必须先裁剪或遮盖这些信息；证明 JSON 及原始材料均不得提交仓库。

计算摘要示例：

```bash
sha256sum .acceptance-evidence/v1.14.2/artifacts/<已脱敏材料>
```

生产资源证据至少在现场验收前、中、后各采样一次。`swapSamplesMiB` 至少填 3 个数；校验器将峰峰值不超过 128MiB 作为“无 swap 振荡”的保守可重复判据。

## 真机门槛

分别在真实 iPhone/iPad Safari 与真实 Android Chrome 上执行：

1. 从公开 Pages 入口显式选择联机升温局并建房；
2. 参加一局直到胜负结算；
3. 对局中关闭页面或断网，再在 90 秒内恢复；
4. 确认恢复到本人私有视图，且未看到其他玩家的私有选择；
5. 将对应设备项的四个布尔值置为 `true`，附上匿名证据引用。

两种平台都完成前不得复用桌面浏览器或设备模拟器代替。

## 4/6/8 人现场门槛

分别组织 4、6、8 名真人完成三场独立对局。每场必须满足：

- 所有人从公开入口加入并在 60 秒内完成加入确认；
- 主持人或运维人员不触碰任何参与者设备，不手工修复状态；
- 房主离开/超时、私密选择、投票/猜拳/小游戏、惩罚延后与胜负结算按实际触发情况由服务端继续推进；
- 全局计时器与断线重连不要求工作人员干预；
- 对局正常结算，`staffInterventions` 为 `0`。

只有真实参加者完成的场次才可设置 `realParticipants`、`unattended` 和 `completed` 为 `true`。脚本并发、机器人或自动浏览器记录只能作为补充材料。

## 校验与结论

填写 JSON 并创建全部引用文件后运行：

```bash
npm run verify:online-acceptance -- \
  .acceptance-evidence/v1.14.2/evidence.json
```

退出码 `0` 且输出 `PASS` 才表示证据合同满足；退出码 `1` 表示一个或多个硬门槛失败，退出码 `2` 表示文件/JSON 用法错误。该命令只校验证据完整性，不会替代人工核对材料真实性。
