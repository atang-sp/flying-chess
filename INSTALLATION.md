# 🚀 飞行棋游戏安装指南

## 问题解决

如果你在安装或运行项目时遇到了错误，请按照以下步骤解决：

### 1. 环境检查

确保你的环境满足以下要求：

- **Node.js**: 16.0.0 或更高版本
- **npm**: 7.0.0 或更高版本

检查版本：

```bash
node --version
npm --version
```

### 2. 完整安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/atang-sp/flying-chess.git
cd flying-chess

# 2. 清理可能的缓存
rm -rf node_modules
rm -f package-lock.json

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev
```

### 3. 常见错误及解决方案

#### 错误：`Failed to resolve import "primevue/config"`

**原因**：缺少 PrimeVue 相关依赖或版本不匹配

**解决方案**：

```bash
# 安装必需的 PrimeVue 依赖
npm install primevue@^4.3.6
npm install @primevue/themes@^4.3.6
npm install primeicons@^7.0.0
```

#### 错误：`HTTP ERROR 404` 访问 localhost

**原因**：访问路径不正确或缺少 index.html

**解决方案**：

1. 确保访问完整路径：`http://localhost:5173/flying-chess/`
2. 检查项目根目录是否有 `index.html` 文件
3. 如果缺少，项目会自动创建

#### 错误：端口被占用

**解决方案**：

```bash
# 查看端口占用
lsof -i :5173

# 杀死占用进程
kill -9 <PID>

# 或者使用不同端口
npm run dev -- --port 3000
```

### 4. 验证安装

安装成功后，你应该能够：

1. **启动开发服务器**：

   ```bash
   npm run dev
   ```

2. **看到类似输出**：

   ```
   VITE v6.x.x ready in xxx ms
   ➜ Local:   http://localhost:5173/flying-chess/
   ➜ Network: http://192.168.x.x:5173/flying-chess/
   ```

3. **访问游戏**：
   打开浏览器访问 `http://localhost:5173/flying-chess/`

4. **成功构建**：
   ```bash
   npm run build
   ```

### 5. 项目结构检查

确保你的项目包含以下关键文件：

```
flying-chess/
├── index.html          # 入口 HTML 文件
├── package.json        # 依赖配置
├── vite.config.ts      # Vite 配置
├── src/
│   ├── main.ts         # 应用入口
│   ├── App.vue         # 主组件
│   └── ...
└── node_modules/       # 依赖包
```

### 6. 依赖版本确认

检查 `package.json` 中的关键依赖：

```json
{
  "dependencies": {
    "@primevue/themes": "^4.3.6",
    "primevue": "^4.3.6",
    "primeicons": "^7.0.0",
    "vue": "^3.5.13",
    "driver.js": "^1.3.6",
    "three": "^0.178.0"
  }
}
```

### 7. 获取帮助

如果以上步骤都无法解决问题：

1. **检查控制台错误**：打开浏览器开发者工具查看具体错误信息
2. **查看终端输出**：注意 npm 安装和启动时的错误信息
3. **提交 Issue**：在 GitHub 仓库提交详细的错误报告

### 8. 开发环境推荐

- **编辑器**：VS Code
- **插件**：
  - Vue Language Features (Volar)
  - TypeScript Vue Plugin (Volar)
  - Prettier
  - ESLint

---

## 快速开始

如果你是第一次运行项目：

```bash
git clone https://github.com/atang-sp/flying-chess.git
cd flying-chess
npm install
npm run dev
```

然后访问：`http://localhost:5173/flying-chess/`

享受游戏！🎲✨
