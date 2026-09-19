---
title: 重构网站复盘
date: 2026-09-19
desc: 对于网站重构的一次复盘
---

这次重构是一次彻底重写，不是改改样式

比如 `caca41e` refactor: rebuild site as WinUI-styled Vue3 app

163 个文件一次性换血。老站纯手写 HTML/CSS/JS，新站换成了工程化的 Vue 技术栈，基于 `winui in web` 构建
。新站的依赖也极其克制，package.json 里运行时依赖只有 3 个（vue / vue-router / marked），其余全是构建期工具。

### 技术栈全景


| 层 | 选型 | Version | Why |
|---|---|---|---|
| 框架 | Vue 3 | 3.5.32 | 组件化 |
| 构建 | Vite | 8.0.8 | Fast |
| 路由 | vue-router | 4.6.4 | Hash 模式 |
| 语言 | TS | ~6.0.0 | 配vue-tsc |
| MD | marked | 12.0.2 | 渲染文章 |
| UI | WinUI on Web | 1 | 提供 WinUI 组件 |

### 复盘

想加载 Markdown 文件，最直觉的写法是 import.meta.glob('./*.md', { as: 'raw' })，但 Vite 8（rolldown 内核）直接报错，把 .md 作为 JS 解析，标题里的中文全成了语法错误

所以 `post/index.ts:11` 更换了api
`const modules = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true })`

`query: '?raw' ` 告诉构建器按原始文本处理，`eager: true` 表示同步内联——因为文章要在首次渲染就拿到列表，不能异步

我的文章顶部是 --- 包裹的元数据（title/date/desc），写了正则去解析。结果标题死活显示成文件名，查半天发现——那个文件开头多了一个空行，正则 ^--- 匹配不上，导致整块元数据被当正文吞了

`const cleaned = raw.replace(/^\r?\n+/, '');`

解法就一行，直接清洗首部空行即可，这个坑最阴险的地方是不报错，解析失败也照常返回，只是字段全空

WinUIonWeb 有 TitleBar（标题栏）和 NavigationView（导航视图）两个组件，我一开始两个都用，结果就是两个顶栏叠在一起，视觉糊成一团，更致命的是 `.win-titlebar-min-drag-region` 这层透明拖拽区盖住了下面的按钮，鼠标点上去全被它吃掉，导航按钮完全点不动

所以我把两个组件全砍了，在 `App.vue` 里自绘一个顶栏——名字靠左、导航绝对定位居中（`left:50% + translateX(-50%)`）、语言按钮靠右。副作用是包体积从 248KB 直接掉到 120KB，白赚一堆

代码推上去，GitHub Pages 打开一片白。发现是老仓库的 Pages 配置还在部署源码目录，而新站是构建产物，源码里根本没有可运行的 `index.html`

所以必须新建 `deploy.yml`，走标准 Github Actions 流程：`npm ci` → `npm run build` → `上传 dist` → `deploy-pages@v4`。并且必须去仓库设置里把 Pages Source 改成 "GitHub Actions"，否则工作流白跑

而且新站没用 `vue-i18n`，而是在 `components/i18n/index.ts` 手写了一套：用 `Symbol.for()` 做注入 key、`provide/inject` 传递、`{name}` 占位符做变量替换

好处：零依赖，且支持双语兜底——查不到中文 key 会自动回落到英文，不会显示裸 key

这里有个双轨设计要理解：组件库自带一套文案`（components/Strings/）`，站点自己的文案在 `src/i18n/`，`createI18n` 时后者覆盖前者

### 体验

浏览体验永远是第一位的。一个好的网站应当有统一的主题、良好的交互和极高的性能。这就是我选择 Vue 3 和 WinUI on web的原因：快速，统一，简洁

他不只是一个重构，而是一场体验，视觉的换新升级。

**鸣谢:**

- ThinkReally114 ： `https://github.com/ThinkReally114`
- ERX399 : `https://blog.520pro.top`
- PVPUtils GitHub：`https://github.com/bakabaicai/PVPUtils`
- Hangou : `https://blog.hangou.top`
- HAGo Server : `https://hago520.top`