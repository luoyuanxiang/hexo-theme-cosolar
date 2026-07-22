# hexo-theme-cosolar

清风徐来，码迹自留 — **Cosolar** Hexo 主题（由 [Halo Cosolar](https://github.com/cosolar/halo-theme-cosolar) 像素级移植）。

- 仓库：[github.com/luoyuanxiang/hexo-theme-cosolar](https://github.com/luoyuanxiang/hexo-theme-cosolar)
- 视觉与交互对齐参考站：[blog.luoyuanxiang.top](https://blog.luoyuanxiang.top/)

## 功能清单

| 页面 / 能力 | 说明 |
|------------|------|
| 首页 | 精选轮播、文章列表、侧栏、**分页** |
| 归档 | Hero + 年/月时间线 |
| 分类 / 标签 | 总览卡片 + 详情专题列表 |
| 友链 | 分组筛选、即时搜索、状态/回链徽章 |
| 关于 | `/about/` 移植纪实（主题内置，可被博客覆盖） |
| 文章详情 | TOC、阅读进度、底栏分享/点赞、图灯箱、上下篇、评论 |
| 全局 | 亮暗色、Canvas/图片背景、玻璃顶栏、本地搜索（Ctrl+K） |

**配置预留、页面未移植**：`feeds`（RSS 资讯页）。相关键仍在 `_config.yml` 中完整保留。

**未实现交互**：首页无限滚动（`featured.home_load_mode: scroll` 配置可写，暂不生效）。

## 安装与升级

主题 npm 包名为 `hexo-theme-cosolar`，站点侧主题名为 `cosolar`。

```bash
# 在 Hexo 博客根目录
npm install hexo-theme-cosolar
# 或从 GitHub 安装
npm install git+https://github.com/luoyuanxiang/hexo-theme-cosolar.git
# 或本地路径
npm install /path/to/hexo-theme-cosolar
```

博客 `_config.yml`：

```yaml
theme: cosolar
```

升级：

```bash
npm update hexo-theme-cosolar
```

> 推荐用站点根目录 `_config.cosolar.yml` 覆盖主题配置，避免直接改 `node_modules`。

### 发布到 npm（维护者）

仓库已配置 GitHub Actions：[`.github/workflows/npm-publish.yml`](.github/workflows/npm-publish.yml)，读取 Secret **`NPM_TOKENS`**。

**npm Token 要求**（否则会 `403`：Two-factor authentication…）：

1. 打开 [npmjs.com → Access Tokens](https://www.npmjs.com/settings/~/tokens)
2. 新建 **Automation** 令牌（推荐；可绕过 2FA，专供 CI），或 **Granular Access Token** 并勾选 publish + bypass 2FA
3. 写入仓库 Secret（名称必须是 `NPM_TOKENS`）：

```bash
# 交互写入（粘贴 token）
gh secret set NPM_TOKENS

# 或从环境变量写入
echo %NPM_TOKEN_VALUE% | gh secret set NPM_TOKENS
```

触发发布：

```bash
# 手动触发
gh workflow run "Publish to npm"
gh run watch

# 或打版本标签后推送（自动发布）
git tag v1.0.0
git push origin v1.0.0

# 或创建 GitHub Release 后自动发布
gh release create v1.0.0 --generate-notes
```

## 依赖插件

```bash
npm install hexo-generator-search --save
```

博客 `_config.yml` 示例：

```yaml
search:
  path: search.json
  field: post
  content: true
  format: json
```

主题 `search.path` 须与上述 `path` 一致（默认 `search.json`）。

## 配置入口

| 文件 | 作用 |
|------|------|
| 主题包 [`_config.yml`](_config.yml) | 全量默认值 + **逐项中文注释**（对照 Halo `settings.yaml`） |
| 博客 `_config.cosolar.yml` | **推荐修改处**，覆盖主题默认 |
| [`examples/_config.cosolar.yml`](examples/_config.cosolar.yml) | 常用项示例，可复制到博客根目录 |

### Halo → Hexo 配置对照

主题按 Halo 分组原样落地，键名一致：

- `basic` / `footer` / `style` / `social` / `featured` / `sidebar`
- `category` / `tag` / `archive` / `links` / `feeds`（预留）
- `background_light` / `background_dark`

Hexo 扩展：

- `menu` — 导航（含 icon，支持 `children` 多级菜单）
- `search` — 本地搜索
- `comment` — `twikoo` / `waline` / `none`
- `busuanzi` — 访问量
- `upvote` — `local` / `leancloud`
- `code` — Mac 代码块 / 折叠高度

### 多级菜单示例

在 `_config.cosolar.yml`：

```yaml
menu:
  - name: 首页
    url: /
    icon: icon-shouye
  - name: 分类
    url: /categories/
    icon: icon-fengfuduoyuan
    children:
      - name: Java
        url: /categories/Java/
      - name: 更多
        children:
          - name: 关于
            url: /about/
  - name: 文档
    # 无 url 时仅作分组（移动端点标题展开）
    children:
      - name: Hexo
        url: https://hexo.io
        target: _blank
```

桌面端：悬停下拉，三级及以上向右飞出。移动端：手风琴展开；点箭头可只展开不跳转。

附件类字段在 Halo 为上传组件，Hexo 请填 **图片 URL 字符串**。精选文章 `featured.featured_posts` 填文章 **path / slug / 标题** 列表。

完整注释与默认值见主题 `_config.yml`，请勿漏配字段时以该文件为准。

## 页面启用

### 关于页

主题通过 generator 内置 `/about/`（`pages/about.md` + `layout/about.ejs`），内容为 Halo → Hexo 移植纪实。

- 若博客有 `source/about/`，以**博客侧为准**（可参考 `examples/about.md`）
- 封面/副标题：`_config.cosolar.yml` 的 `about.cover` / `about.subtitle`

### 友链页

1. 新建页面 `source/links/index.md`：

```markdown
---
title: 友情链接
layout: links
---
```

2. 创建 `source/_data/links.yml`（示例见 [`examples/links.yml`](examples/links.yml)）：

```yaml
groups:
  - name: friends
    display_name: 好友
links:
  - name: 示例
    url: https://example.com
    logo: ""
    description: 简介
    group: friends
    status: online   # online | offline | checking
    backlink: true   # true/false 或 FOUND/MISSING
```

### 分类 / 标签总览

主题 generator 自动生成 `/categories/`、`/tags/` 总览页，无需额外 md。

### 归档

Hexo 默认 `/archives/`，使用 `layout/archive.ejs`。

## 评论

在 `_config.cosolar.yml`：

```yaml
comment:
  provider: twikoo   # 或 waline / none
  twikoo:
    envId: "你的环境 ID 或云函数地址"
    region: ""
  waline:
    serverURL: "https://your-waline-server"
```

## 点赞与统计

- `upvote.provider: local`：浏览器 localStorage（默认）
- `upvote.provider: leancloud`：填写 `appId` / `appKey` / `serverURL`
- `busuanzi.enable: true`：页脚站点 PV、文章页阅读数

## 代码高亮（Mac 样式）

主题会把 Hexo 生成的 `figure.highlight` / `pre` 包成 Mac 窗口（三色圆点 + 语言标签 + 复制 + 折叠），并随亮/暗色与 `style.primary_color` 切换配色。

博客 `_config.yml` 请开启内置高亮，例如：

```yaml
highlight:
  enable: true
  line_number: true
  auto_detect: false
  tab_replace: "  "
  wrap: true
  hljs: false
prismjs:
  enable: false
```

主题 `_config.cosolar.yml`：

```yaml
code:
  enable: true
  style: mac
  fold: true
  fold_height: 320   # 像素；0 表示不折叠
  copy: true
```

## 首页「最新 / 最热 / 推荐」

客户端排序已启用：

| Tab | 规则 |
|-----|------|
| 最新 | 按发布时间 |
| 最热 | 优先 `views`/`visit` 字段；没有则按正文长度弱排序，再按时间 |
| 推荐 | 置顶优先，再按 `upvote`/`likes`（及本地点赞），再按时间 |

可在文章 front-matter 写入：

```yaml
views: 128
upvote: 12
sticky: 1
```

## 验收对照清单


对照 [参考站](https://blog.luoyuanxiang.top/) 与 Halo Cosolar：

- [ ] 首页：轮播、卡片、侧栏、分页、亮暗色、背景
- [ ] 归档：hero + 时间线
- [ ] 分类/标签：总览 + 详情
- [ ] 友链：筛选 / 搜索 / 徽章
- [ ] 文章：TOC、进度、底栏、评论、本地搜索（Ctrl+K）
- [ ] 修改 `_config.cosolar.yml` 后 `hexo clean && hexo g` 配置生效

## 目录结构

```text
hexo-theme-cosolar/
├── _config.yml          # 全量配置（中文注释）
├── layout/              # EJS 模板
├── source/css|js|fonts|images
├── scripts/             # helpers + generators
├── languages/zh-CN.yml
├── examples/            # 配置与友链示例
├── LICENSE              # GPL-3.0
└── README.md
```

## 许可证

[GPL-3.0](LICENSE)（与上游 Halo Cosolar 一致）
