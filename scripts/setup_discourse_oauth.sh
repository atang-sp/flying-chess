#!/usr/bin/env bash
# ============================================================
# 飞行棋 × Discourse OAuth2 配置脚本
# 在论坛服务器上执行：bash /tmp/setup_oauth.sh
# ============================================================
# 需要在 Discourse 容器内通过 Rails 控制台完成配置
# ============================================================

set -euo pipefail

DISCOURSE_APP="app"

echo "==> 等待 Discourse 容器就绪..."
until docker inspect --format='{{.State.Running}}' $DISCOURSE_APP 2>/dev/null | grep -q true; do
  sleep 5
  echo "... 等待中"
done
echo "==> 容器已就绪"

echo ""
echo "==> 在 Discourse 容器内启用 OAuth2 Basic 插件并创建 Application..."

docker exec $DISCOURSE_APP rails runner "
# 启用 OAuth2 Basic 插件功能
SiteSetting.oauth2_enabled = true

# 创建 OAuth Application（如果尚未创建）
existing = OauthApplication.find_by(name: 'flying-chess-supabase')
if existing
  puts 'OAuth Application 已存在，跳过创建。'
  puts \"Client ID: #{existing.uid}\"
  puts \"Client Secret: #{existing.secret}\"
else
  # IMPORTANT: 将下面的 redirect_uri 替换为您的 Supabase 回调地址
  app = OauthApplication.create!(
    name:         'flying-chess-supabase',
    redirect_uri: 'https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback',
    scopes:       'read',
    trusted:      true,
    skip_authorization: true
  )
  puts '==> OAuth Application 创建成功！'
  puts \"Client ID:     #{app.uid}\"
  puts \"Client Secret: #{app.secret}\"
  puts ''
  puts '==> 将以上信息填入 Supabase Dashboard 的 Custom OAuth2 Provider 配置中：'
  puts \"Authorization URL: https://atang-sp.run.place/oauth/authorize\"
  puts \"Token URL:         https://atang-sp.run.place/oauth/token\"
  puts \"User Info URL:     https://atang-sp.run.place/auth/discourse/callback\"
end
"
