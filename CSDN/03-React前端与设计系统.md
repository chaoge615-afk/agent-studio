## 系列文章目录

- [01 — 从零搭建 AI Agent 开发平台：架构设计与技术选型](./01-架构设计与技术选型.md)
- [02 — FastAPI 后端：LangGraph + MCP 服务层实战](./02-FastAPI后端与LangGraph.md)
- 03 — React 前端：零组件库打造设计系统（本文）

### 文章目录

+ 一、为什么不引入组件库
+ 二、用 @apply 构建 CSS 设计系统
+ 三、色彩体系与 Tailwind 扩展配置
+ 四、Layout 布局：侧边栏 + 内容区
+ 五、Sidebar 深色侧栏与滑入动画
+ 六、StatCard：6 种颜色变体
+ 七、CustomNode：8 种工作流节点
+ 八、入场动画与交互微动效
+ 九、中文优先的字体策略
+ 十、Vite 代理与 API 客户端
+ 十一、为什么不用全局状态管理
+ 总结

## 前言

做后台管理系统，很多团队第一反应是装一套 Ant Design 或者 Arco Design。组件库确实省事，但也带来了额外负担：主题覆盖要跟框架的 token 体系搏斗，打包体积动辄 200KB+，而且一旦设计风格跟组件库默认长相差距较大，魔改成本反而比手写更高。

Agent Studio 是一个面向 AI Agent 开发者的管理平台，页面数量不多（仪表盘、Agent 市场、工作流编辑器、工具管理、记忆系统、审计日志、安全治理），但视觉要求比较独特——工作流编辑器需要暗色节点、卡片要有微妙渐变、侧栏要做深色主题。经过评估，我决定**不引入任何 UI 组件库**，完全用 Tailwind CSS 的 `@apply` 指令搭建自己的设计系统。

这篇文章会完整拆解这套零依赖设计系统的每一个层次：从 CSS 变量、色彩体系，到布局组件、业务组件，再到动画、字体、API 层。每个组件都贴出真实源码，拿走就能用。

## 一、为什么不引入组件库

先列一张对比表，说清楚取舍：

```
┌─────────────────┬──────────────────────┬──────────────────────┐
│     维度        │   组件库 (Antd 等)   │  Tailwind @apply     │
├─────────────────┼──────────────────────┼──────────────────────┤
│  打包体积       │  150~400 KB          │  ~15 KB (purged)     │
│  主题定制       │  需学习 token 体系    │  直接改 CSS 变量      │
│  设计风格       │  容易撞脸            │  完全自主             │
│  组件丰富度     │  表格/表单/弹窗齐全   │  需要手写复合组件     │
│  适合场景       │  中大型后台、快速交付  │  页面少、视觉定制高   │
└─────────────────┴──────────────────────┴──────────────────────┘
```

Agent Studio 前端只有 7 个页面，不需要复杂的 Table / Form / Modal，反而是工作流画布的自定义节点、仪表盘卡片这些业务组件占了大头。核心思路用一句话概括：**把重复出现的样式模式提取为 CSS class，像组件库一样使用，但不依赖任何第三方**。

## 二、用 @apply 构建 CSS 设计系统

`index.css` 是整个设计系统的唯一入口，所有可复用样式都定义在 `@layer components` 里：

```
┌─ @layer base ────────── body 全局样式
├─ @layer components ──── .card / .card-hover
│                        .btn-primary / secondary / ghost / danger
│                        .input / .badge-* / .status-*
│                        .stat-card / .list-item / .empty-state
│                        .spinner / .page-enter / .stagger-*
│                        .react-flow__node-*  / .timeline-item
└─ @layer utilities ───── (Tailwind 原生工具类)
```

### 2.1 卡片系统

```css
@layer components {
  .card {
    @apply bg-white rounded-xl border border-gray-200/60 p-6 transition-all duration-200;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  }
  .card-hover {
    @apply card cursor-pointer;
  }
  .card-hover:hover {
    @apply -translate-y-0.5;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -5px rgba(0,0,0,0.04);
  }
}
```

几个细节：`border-gray-200/60` 边框带 60% 透明度，比实色更透气；`box-shadow` 手写两层阴影——大范围低透明度模拟环境光，小范围稍高透明度增加立体感；hover 时 `translateY(-2px)` 配合更大阴影产生"浮起来"的视觉反馈。

### 2.2 按钮系统

```css
.btn-primary {
  @apply bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2
         rounded-lg font-medium transition-all duration-200 active:scale-[0.98]
         disabled:opacity-50 disabled:cursor-not-allowed;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
}
.btn-primary:hover:not(:disabled) {
  @apply from-indigo-500 to-purple-500;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-secondary {
  @apply bg-white text-gray-700 px-4 py-2 rounded-lg font-medium
         border border-gray-200/60 hover:bg-gray-50 transition-all duration-200;
}
.btn-ghost {
  @apply text-gray-500 p-2 rounded-lg hover:bg-gray-100 hover:text-gray-700;
}
.btn-danger {
  @apply bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-500;
}
```

`active:scale-[0.98]` 是微交互的关键——点击瞬间缩小 2%，给用户"按下去了"的触觉反馈。主按钮的阴影用了 indigo 色调（`rgba(99, 102, 241, 0.3)`），让阴影和按钮色彩协调。

### 2.3 Badge 与状态标签

Badge 分两类：纯色标签和带脉冲动画的状态标签。

```css
.badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
.badge-blue   { @apply bg-indigo-50 text-indigo-700 border border-indigo-200/50; }
.badge-green  { @apply bg-emerald-50 text-emerald-700 border border-emerald-200/50; }
.badge-yellow { @apply bg-amber-50 text-amber-700 border border-amber-200/50; }
.badge-red    { @apply bg-red-50 text-red-700 border border-red-200/50; }
.badge-purple { @apply bg-purple-50 text-purple-700 border border-purple-200/50; }

.status-active {
  @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
         bg-emerald-50 text-emerald-700 border border-emerald-200/50;
}
.status-active::before {
  @apply w-1.5 h-1.5 rounded-full bg-emerald-500;
  content: '';
  animation: pulse-dot 2s ease-in-out infinite;
}
```

`pulse-dot` 让圆点在 opacity 1 和 0.4 之间循环，暗示"运行中"。Stopped 和 Error 状态是静态圆点——只有 active 才需要吸引注意力。

### 2.4 输入框、列表项、空状态

```css
.input {
  @apply w-full px-3 py-2 border border-gray-200/60 rounded-lg text-sm bg-white
         focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400;
}
.list-item {
  @apply p-3 bg-gray-50/50 rounded-lg border border-gray-100 hover:bg-gray-50;
}
.list-item-active {
  @apply p-3 bg-indigo-50/50 rounded-lg border border-indigo-200/50;
}
.empty-state {
  @apply flex flex-col items-center justify-center py-16 text-center;
}
.empty-state-icon {
  @apply w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-400;
}
```

这些 class 在 JSX 里直接用 `<input className="input" />` 就行，跟用组件库一样简洁，但完全不存在黑盒。

## 三、色彩体系与 Tailwind 扩展配置

`tailwind.config.js` 里扩展了两组语义化颜色：

```js
colors: {
  primary: {
    50: '#eef2ff',  100: '#e0e7ff',  200: '#c7d2fe',
    300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1',  // ← 主色
    600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
  },
  sidebar: {
    DEFAULT: '#0f1117',  // 侧栏背景（接近纯黑）
    hover:   '#1a1d2e',  // hover 状态
    active:  '#232740',  // 选中状态
    border:  '#1e2235',  // 分割线
    text:    '#94a3b8',  // 次要文字
  },
},
```

色彩设计思路：

```
主色渐变带：Indigo 500 → Purple 600
  ├── 按钮渐变：from-indigo-600 to-purple-600
  ├── 输入框焦点：ring-indigo-500/30
  ├── 活跃列表项：bg-indigo-50/50
  └── 节点选中态：ring-indigo-500/50

侧栏深色带：#0f1117 → #1a1d2e → #232740
  ├── 背景：bg-sidebar        ├── 分割线：via-sidebar-border
  └── 次要文字：text-sidebar-text
```

主色选 Indigo 而不是 Blue，因为 Indigo 在深色侧栏旁边不刺眼，搭配 Purple 渐变更有科技感。侧栏背景 `#0f1117` 接近纯黑但带蓝调，比纯 `#000` 更有质感。此外还定义了三组阴影语义：

```js
boxShadow: {
  'card':       '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  'card-hover': '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -5px rgba(0,0,0,0.04)',
  'elevated':   '0 20px 40px -12px rgba(0,0,0,0.12)',
},
```

## 四、Layout 布局：侧边栏 + 内容区

整个 App 的骨架只有 17 行：

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 relative">
        <div className="absolute top-0 left-0 w-[600px] h-[600px]
          bg-gradient-to-br from-indigo-100/30 via-purple-50/20 to-transparent
          rounded-full blur-3xl pointer-events-none -translate-x-1/3 -translate-y-1/3" />
        <div className="relative z-10 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

布局结构：`Sidebar (w-64)` | `main (flex-1)` 内含渐变光晕层 + `<Outlet />` (z-10, p-6)。

亮点在左上角的 600×600 渐变光晕：`from-indigo-100/30 via-purple-50/20 to-transparent` 加 `blur-3xl` 产生一团淡紫色雾气。`pointer-events-none` 确保不拦截鼠标事件，`-translate-x-1/3 -translate-y-1/3` 让光晕中心偏移到屏幕外，只露出边缘的柔和渐变。路由渲染通过 `<Outlet />` 完成。

## 五、Sidebar 深色侧栏与滑入动画

Sidebar 是视觉上最有辨识度的组件。导航数据配置 7 个菜单项（仪表盘、Agent 市场、工作流编辑器、工具管理、记忆系统、审计日志、安全治理），每个用 lucide-react 图标。核心渲染逻辑：

```tsx
navItems.map((item, index) => (
  <NavLink key={item.path} to={item.path}
    style={{ animationDelay: `${index * 40}ms` }}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
       transition-all duration-200 animate-slide-in-left opacity-0 ${
        isActive ? 'bg-white/12 text-white'
                 : 'text-sidebar-text hover:bg-white/8 hover:text-white'
      }`
    }
  >
    {({ isActive }) => (<>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2
                        w-[3px] h-5 bg-indigo-400 rounded-r-full" />
      )}
      <item.icon className={`w-[18px] h-[18px] ${
        isActive ? 'text-indigo-400' : 'group-hover:text-indigo-300'
      } transition-colors`} />
      {item.label}
    </>)}
  </NavLink>
))
```

### 关键设计点

**选中态指示条**：左侧 3px indigo 竖条（绝对定位 + `rounded-r-full`），比整行高亮更克制。选中行 `bg-white/12` 半透明白底，图标 `text-indigo-400`。

**交错入场**：`animationDelay: index * 40ms` + `animate-slide-in-left` + 初始 `opacity-0`，7 个菜单项从左向右依次滑入。

**渐变分割线**：`from-transparent via-sidebar-border to-transparent` 让分割线两端淡出。**底栏状态灯**：绿色圆点 + `animate-pulse-dot` 脉冲动画，暗示后端在线。

## 六、StatCard：6 种颜色变体

仪表盘的统计卡片是复用频率最高的组件：

```tsx
export default function StatCard({ icon, label, value, change, color = 'blue' }: StatCardProps) {
  const gradientClasses: Record<string, string> = {
    blue: 'from-indigo-500/10 to-blue-500/10 text-indigo-600',
    green: 'from-emerald-500/10 to-teal-500/10 text-emerald-600',
    purple: 'from-purple-500/10 to-violet-500/10 text-purple-600',
    yellow: 'from-amber-500/10 to-orange-500/10 text-amber-600',
    red: 'from-red-500/10 to-rose-500/10 text-red-600',
    cyan: 'from-cyan-500/10 to-sky-500/10 text-cyan-600',
  };
  return (
    <div className="stat-card card-hover">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientClasses[color]}`}>{icon}</div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1 text-sm text-emerald-600 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {change}
        </div>
      )}
    </div>
  );
}
```

6 种变体的配色逻辑一致：图标区域用 10% 透明度的双色渐变做底，图标用对应纯色。外层 `.stat-card` 继承 `.card`，`.card-hover` 提供 hover 浮起效果。仪表盘一行 4 张卡片，颜色各异但视觉权重相同。

## 七、CustomNode：8 种工作流节点

工作流编辑器基于 React Flow，节点样式通过配置驱动——8 种类型各有独立的 emoji 图标、边框色和渐变背景：

```tsx
const nodeStyles = {
  classify:   { icon: '🧭', borderColor: 'border-purple-300',   bgGradient: 'from-purple-50 to-violet-50' },
  route:      { icon: '🔀', borderColor: 'border-violet-300',   bgGradient: 'from-violet-50 to-fuchsia-50' },
  query_sql:  { icon: '🗃️', borderColor: 'border-indigo-300',   bgGradient: 'from-indigo-50 to-blue-50' },
  query_rag:  { icon: '🔍', borderColor: 'border-cyan-300',     bgGradient: 'from-cyan-50 to-sky-50' },
  query_both: { icon: '⚡', borderColor: 'border-blue-300',     bgGradient: 'from-blue-50 to-indigo-50' },
  merge:      { icon: '🔗', borderColor: 'border-emerald-300',  bgGradient: 'from-emerald-50 to-teal-50' },
  reflect:    { icon: '💭', borderColor: 'border-amber-300',    bgGradient: 'from-amber-50 to-orange-50' },
  custom:     { icon: '⚙️', borderColor: 'border-gray-300',     bgGradient: 'from-gray-50 to-slate-50' },
};

function CustomNode({ data, selected }: NodeProps) {
  const style = nodeStyles[data.nodeType as string] || nodeStyles.custom;
  return (
    <div className={`px-4 py-3 rounded-xl border-2 ${style.borderColor}
      bg-gradient-to-br ${style.bgGradient} ${selected ? 'ring-2 ring-indigo-500/50 shadow-lg' : 'shadow-md'}
      min-w-[150px] transition-all duration-200`}>
      <Handle type="target" position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{style.icon}</span>
        <div>
          <div className="font-semibold text-sm text-gray-900">{data.label}</div>
          {data.description && <div className="text-xs text-gray-500 mt-0.5">{String(data.description)}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />
    </div>
  );
}
export default memo(CustomNode);
```

用 `memo()` 包裹是因为画布可能有几十个节点，避免父组件 re-render 导致全部重绘。Handle 用 `!important` 覆盖 React Flow 默认灰色圆点，统一为 indigo 色。同时 CSS 里也对 `.react-flow__node.selected` 注入 indigo 边框和紫色投影。

## 八、入场动画与交互微动效

设计系统的动画分三层：

```
┌─ 页面级 ─── page-enter (fade-in-up) + stagger 交错延迟
├─ 组件级 ─── sidebar slide-in-left (40ms 递增)
│             card-hover translateY(-2px) / btn active:scale-[0.98]
└─ 装饰级 ─── pulse-dot 脉冲 / spinner 旋转 / shimmer 骨架屏
```

`tailwind.config.js` 定义了 4 组关键帧：

```js
keyframes: {
  'fade-in-up':    { '0%': { opacity: '0', transform: 'translateY(12px)' },
                     '100%': { opacity: '1', transform: 'translateY(0)' } },
  'slide-in-left': { '0%': { opacity: '0', transform: 'translateX(-12px)' },
                     '100%': { opacity: '1', transform: 'translateX(0)' } },
  'pulse-dot':     { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
  'shimmer':       { '0%': { backgroundPosition: '-200% 0' },
                     '100%': { backgroundPosition: '200% 0' } },
},
```

页面入场通过 `.page-enter` + `.stagger-*` 组合：

```css
.page-enter { animation: fade-in-up 0.4s ease-out forwards; }
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.2s; }
```

```tsx
<div className="page-enter stagger-1"><StatCard ... /></div>
<div className="page-enter stagger-2"><StatCard ... /></div>
<div className="page-enter stagger-3"><StatCard ... /></div>
<div className="page-enter stagger-4"><StatCard ... /></div>
```

4 张卡片依次从下方浮入，间隔 50ms，整体约 0.6s。这种微妙交错让页面加载不再是突兀的瞬间切换，而是有节奏感的渐进呈现。

## 九、中文优先的字体策略

```js
fontFamily: {
  sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
         'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
},
```

没有引入 Google Fonts 的 Inter 或 Roboto，原因很现实：

1. **中国大陆访问 Google Fonts 不稳定**，即使镜像也有额外延迟
2. **中文内容占大头**，系统自带的 PingFang SC（macOS）和 Microsoft YaHei（Windows）已经足够好
3. **减少一个外部依赖** = 减少一个故障点

字体栈按优先级：macOS 用 `-apple-system` + `PingFang SC`，Windows 用 `Segoe UI` + `Microsoft YaHei`，最终 fallback `sans-serif`。body 上全局开启 `antialiased`，确保低 DPI 屏幕也有清晰渲染。

## 十、Vite 代理与 API 客户端

### 10.1 开发环境代理

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8002', changeOrigin: true },
    },
  },
});
```

前端 `localhost:5173`，后端 `localhost:8002`，Vite proxy 把 `/api/*` 转发到后端，解决跨域。部署时 Nginx 做同样的反向代理，前端代码一行不用改。

```
浏览器              Vite Dev Server            FastAPI
  │                     │                        │
  │ GET /api/agents ──► │                        │
  │                     │ proxy /api → :8002 ──► │
  │                     │◄── 200 JSON ────────── │
  │◄── 200 JSON ───────│                        │
```

### 10.2 API 客户端

```ts
const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) =>
            request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) =>
            request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

用原生 `fetch` 而不是 axios——项目不需要拦截器、自动重试这些高级功能。27 行代码覆盖四种 HTTP 方法，泛型支持返回类型推断。在页面里用起来非常简洁：

```tsx
const agents = await api.get<Agent[]>('/agents');
await api.post('/agents', { name: 'My Agent', model: 'gpt-4' });
await api.delete(`/agents/${id}`);
```

## 十一、为什么不用全局状态管理

Agent Studio 没有引入 Redux、Zustand 或任何全局状态管理库：

```
┌─ 页面间共享状态 ─── 几乎没有，每个页面独立请求数据
├─ 页面内状态 ─────── useState + useEffect 就够了
└─ 跨组件传递 ─────── Props drilling 在 2~3 层内完全可以接受
```

页面少、数据流简单时，引入全局状态管理反而是过度设计。React 的 `useState` + `useEffect` + Context 已经覆盖所有场景。如果未来需要 WebSocket 推送或跨页面共享编辑状态，再加 Zustand 也不迟——API 足够轻量，迁移成本很低。

## 总结

这篇文章完整拆解了 Agent Studio 的前端设计系统，核心思路是**不依赖组件库，用 Tailwind `@apply` 建立语义化 CSS class 体系**：

- **index.css** 是设计系统唯一入口，定义卡片、按钮、Badge、输入框等所有可复用样式
- **tailwind.config.js** 扩展了主色、侧栏色、阴影、动画关键帧
- **Layout** 用 flex + 渐变光晕构建骨架
- **Sidebar** 深色主题 + 交错滑入动画 + 选中态指示条
- **StatCard** 6 种颜色变体，10% 透明度渐变图标底
- **CustomNode** 8 种工作流节点，memo 优化渲染性能
- **动画三层**：页面级 fade-in-up、组件级 hover/active、装饰级 pulse/shimmer
- **字体不引 Google Fonts**，中文优先用系统字体栈
- **Vite proxy + 27 行 fetch 客户端**，零依赖完成前后端通信
- **不用全局状态管理**，useState + useEffect 足够

下一篇文章会深入工作流编辑器的实现——如何用 React Flow + LangGraph 构建可视化的 Agent 编排画布，包括节点拖拽、连线校验、实时运行状态回显。敬请期待。
