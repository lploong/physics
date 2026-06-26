# Physics Visualizer · 物理可视化

> 一个面向高中物理的交互式 2D 物理模拟与可视化工具。

## 功能

- **12 种物理场景**：斜面、抛体、圆周运动、连接体、板块模型、传送带、弹簧振子、滑轮、电场、磁场……
- **实时模拟**：RK4 数值积分器，支持 0.5x / 1x / 2x 速度切换
- **力分析图**：交互式 SVG 渲染，支持弹簧线圈、滑轮、斜面等抽象画法
- **运动轨迹与图表**：Canvas 渲染轨迹线 + x-t / v-t / a-t 曲线
- **A/B 对比模式**：并排比较两组参数下的模拟结果
- **AI 解析**：通过 DeepSeek API 将自然语言题目自动转为场景配置
- **导出**：CSV 数据 / PNG 截图 / TXT 实验报告
- **分享与保存**：URL 编码分享场景，后端数据库保存历史记录

## 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 后端（可选，用于保存/加载历史与 AI 解析）

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 部署

推送到 `main` 分支会自动触发 GitHub Actions 构建并部署到 GitHub Pages。

## 键盘快捷键

| 快捷键 | 作用 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `←` `→` | 步进 |
| `R` | 重置 |
| `F` | 全屏 |

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **状态管理**：Zustand
- **后端**：FastAPI + SQLAlchemy + SQLite
- **物理引擎**：纯客户端 RK4 积分器
- **AI**：DeepSeek API
