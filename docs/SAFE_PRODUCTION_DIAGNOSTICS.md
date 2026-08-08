# 安全生产诊断报告

`scripts/collect-safe-production-diagnostics.mjs` 只把固定、低敏感度的运行状态写入
schema v1 JSON。它用于替代复制 launcher 启动行、完整进程参数、容器配置或原始命令输出的
诊断方式。

## 安全边界

报告只允许以下结构：

- `schemaVersion`、`capturedAt`、固定错误码列表；
- room server 的 service/container 布尔状态、镜像名、内存上限、health/ready HTTP 状态、
  公开版本、协议版本和公开 build SHA；
- Discourse 可达性、HTTP 状态和待执行 migration 数量；
- 可用磁盘字节数和内核累计 OOM 事件数。

采集适配器只有固定命令，没有调用者可传入的命令或 shell 片段。每条命令限时 5 秒：

- `systemctl show` 只读取 room service 的 `ActiveState`；
- Docker 只通过 `inspect --format` 读取 running、health、image 和 memory limit；
- `curl` 只访问固定 health/readiness 地址并提取 HTTP 状态及 health 的公开字段；
- migration 检查只输出非负整数；
- `df` 和 `/proc/vmstat` 检查只输出非负整数。

stderr、完整命令、环境变量、Docker `.Config.Env`/`.Path`/`.Args`、HTTP header 和原始响应
都不会进入报告。命令失败只留下固定错误码。

以下数据永远不在 schema 内：SMTP 配置、密码、API key、Bearer/metrics/achievement token、
Authorization header、room code、昵称、player ID、resume token、成就认领内容、玩法设置、
惩罚或聊天正文、Nginx 完整配置、`app.yml`、日志正文和 launcher 参数。

写入前会同时执行三层检查：固定 schema allowlist、递归 forbidden-key 检查、credential-like
字符串检查。任一检查失败即停止；报告通过同目录临时文件和 atomic rename 写入，最终权限固定为
`0600`，失败路径清理临时文件。工具不会创建不存在的目标目录。

严禁把未经该 allowlist 处理的命令输出复制到聊天、Issue、PR 或工单中。尤其不得读取或粘贴：

- `/var/discourse/containers/app.yml`；
- 完整环境变量、`docker inspect` JSON、进程命令行或 shell history；
- launcher 完整启动参数或 systemd `Environment=` 原始值；
- Mailgun、Discourse、metrics 或 achievement secret。

## 本地 fixture 验证

本仓库的 synthetic fixture 只包含明显虚假的 `FAKE_*_FOR_REDACTION_TEST_ONLY` 文本：

```bash
npm run test:safe-diagnostics
node scripts/collect-safe-production-diagnostics.mjs \
  --fixture scripts/fixtures/safe-production-diagnostics.synthetic.json \
  --output /tmp/flying-chess-safe-diagnostics.json
```

第二条命令要求目标目录已存在。常规本地验证只执行 fixture/dry-run；生产采集必须有明确的发布或核验授权。

未来经授权进行生产核验时才可省略 `--fixture`，并且仍必须指定 `--output`。报告只能用于聚合状态
核验，不能证明真人验收或 SMTP credential 已轮换。

SMTP credential 轮换状态保持 `SMTP_CREDENTIAL_ROTATION_REQUIRED_MANUAL`；本工具不会读取、
打印、修改或保存 SMTP credential。
