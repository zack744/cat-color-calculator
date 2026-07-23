# Cat Color Calculator — 组件拆解文档

> 便于后续改风格 / 改交互时对照。  
> 生成日期：2026-07-23  
> 技术栈：Astro 4 + Tailwind 3（无 React 组件库）

---

## 0. 项目结构总览

```
src/
├── layouts/
│   └── Layout.astro              # 文档壳：html/head/SEO/字体/body 槽
├── components/
│   ├── Header.astro              # 顶栏导航
│   ├── Footer.astro              # 页脚
│   └── CatColorCalculator.astro  # 核心交互（唯一复杂业务组件）
├── scripts/
│   └── genetics.ts               # 遗传计算（纯逻辑，无 UI）
├── styles/
│   └── global.css                # 全局工具类 + Material Icons
└── pages/
    ├── index.astro               # 首页
    ├── maine-coon-color-calculator.astro
    ├── british-shorthair-color-calculator.astro
    ├── persian-cat-color-calculator.astro
    ├── bengal-cat-color-calculator.astro
    ├── cat-color-chart.astro
    ├── how-cat-colors-work.astro
    └── privacy.astro

public/images/cats/               # 猫图资源（按颜色/品种分目录）
tailwind.config.js                # 设计 token（色板、字号、间距、圆角）
```

---

## 1. 全局壳（所有页共用）

### 1.1 `Layout.astro`
| 子块 | 说明 |
|------|------|
| `<head>` meta | title / description / canonical / OG / JSON-LD WebApplication |
| 字体 | Google Fonts：`Inter` + `Material Symbols Outlined` |
| `<body>` | `bg-background text-on-surface`，`<slot />` 放页面内容 |

### 1.2 `Header.astro`
| 原子 | 类名/行为 |
|------|-----------|
| Nav 容器 | sticky top、半透白 + backdrop-blur、底边框 |
| Logo 链接 | Material `pets` 图标 + 站点名，链到 `/` |
| 导航项 ×4 | Calculator / Breeds / Color Chart / Guide |
| Active 态 | primary 色 + 底边 2px 下划线 |

Props：`active?: 'calculator' \| 'breeds' \| 'chart' \| 'guide' \| 'privacy'`

### 1.3 `Footer.astro`
| 列 | 内容 |
|----|------|
| 品牌列 | 站点名 + © 文案 |
| Resources | Privacy / Genetics Guide / Color Chart |
| Support | Contact mailto / Breed Calculators / 邮件图标 |

### 1.4 设计 Token（`tailwind.config.js`）
| 类别 | 当前值（摘要） |
|------|----------------|
| Primary | `#8d4b00` 暖琥珀 |
| Background / Surface | `#fcf9f8` 及多层 surface-container |
| Outline | `#887364` / variant `#dbc2b0` |
| 字体 | 全站 Inter |
| 字号阶 | display-lg 48 / headline-lg 32 / headline-md 24 / body-lg 18 / body-md 16 / label-md 14 / label-sm 12 |
| 间距 | xs4 sm8 md16 lg24 xl40，容器 max 1200 |
| 圆角 | lg 8px / xl 12px / full |

### 1.5 `global.css` 工具类
| 类名 | 用途 |
|------|------|
| `.material-symbols-outlined` | 图标字体 |
| `.card-shadow` / `.card-elevation-1` | 轻卡片阴影 |
| `.interactive-shadow` | hover 加深阴影 |
| `.glass-card` | 半透 + blur |
| `.meter-fill` | 进度条宽度过渡 |
| `.bento-item` | hover 上浮 |
| `.tonal-layer-1` | 白底 + 边框 + 阴影 |
| `.amber-glow` | 琥珀光晕 |
| `.sr-only` | 无障碍隐藏 |

---

## 2. 核心业务组件：`CatColorCalculator.astro`

### 2.1 Props
```ts
variant?: 'home' | 'breed'   // 布局/皮肤
breed?: string               // 用于 form id 区分
defaultResults?: { label, pct }[]
note?: string
```

### 2.2 结构树

```
.calc-root[data-variant][data-breed]
├── 左栏 FormCard
│   └── <form>
│       ├── 双列网格
│       │   ├── SirePanel
│       │   │   ├── SectionTitle（male 图标 + "Sire (Father)"）
│       │   │   ├── Field: Select Primary Base (B)
│       │   │   ├── Field: Select Pattern (A)
│       │   │   ├── Field: ToggleGroup Orange (O)  [Not Orange | Orange]
│       │   │   └── Field: ToggleGroup Dilution (D) [Dense | Dilute]
│       │   └── DamPanel
│       │       ├── SectionTitle（female 图标 + "Dam (Mother)"）
│       │       ├── Select B / Select A
│       │       ├── ToggleGroup O  [Not Orange | Tortoiseshell | Orange]
│       │       └── ToggleGroup D  [Dense | Dilute]
│       └── SubmitButton（home：居中大按钮；breed：全宽）
└── 右栏 ResultCard
    ├── ResultTitle（analytics 图标 + 文案）
    ├── #results 列表（aria-live）
    │   └── ResultRow × N
    │       ├── LabelRow（颜色名 + 百分比）
    │       └── ProgressTrack > .meter-fill bar
    └── Note 脚注
```

### 2.3 内部 UI 原子
| 原子 | 实现 | 状态 |
|------|------|------|
| Select | native `<select>` + Tailwind | focus 琥珀环 |
| ToggleButton | `<button type="button">` + 类切换 | active: primary-fixed 底 |
| HiddenInput | 存 O/D 当前值 | 供 form 读取 |
| PrimaryButton | submit | home / breed 两种尺寸 |
| ProgressBar | 圆角轨道 + primary 填充 | JS 动态 width |

### 2.4 脚本行为
1. 点 Toggle → 更新 hidden input + 样式  
2. form submit / change / toggle click → `calculateKittenColors(sire, dam)`  
3. 重绘结果列表（最多 8 条，按概率）  
4. 支持 `astro:page-load` 重新 boot

逻辑源：`src/scripts/genetics.ts`（4 基因模型：B, A, O, D）

---

## 3. 各页面区块清单

### 3.1 `/` 首页 `index.astro`
| # | 区块 | 子组件/原子 |
|---|------|-------------|
| 1 | Hero | H1 + 副标题 + 描述 |
| 2 | Calculator | `<CatColorCalculator variant="home" />` |
| 3 | Genetics 科普 | 4× GlassCard（B/A/O/D 基因说明） |
| 4 | Case Study 条 | 色块公式：Black × Red = Tortie |
| 5 | SEO 长文 | 2 段 prose |
| 6 | Example Outcomes | 4× ImageCard（图+名+基因型+星标） |
| 7 | Breed 入口 | 4× IconCircleCard + Explore 链 |
| 8 | sr-only SEO | 隐藏关键词段落 |
| - | Header / Footer | 全局 |

### 3.2 Breed 计算器页（4 个，结构相近）

#### 共用骨架
1. Header  
2. H1 + 描述（或 Hero 双栏）  
3. `<CatColorCalculator variant="breed" breed="..." />`  
4. 品种科普区（颜色列表 / 统计 / 图卡）  
5. Example Outcomes 网格  
6. Other Breeds 快捷入口  
7. Footer  

#### 差异
| 页面 | 特殊点 |
|------|--------|
| Maine Coon | 2 列：Common Colors 列表 + Genetics Notes 统计（75+ / 3） |
| British Shorthair | 颜色图卡 + Blue 遗传说明 |
| Persian | 颜色 bg-image 卡 + 长毛相关文案 |
| Bengal | Hero 双栏+面包屑+引擎 badge；Calculator 包在外层白卡里；3 大图 Common Colors |

### 3.3 `/cat-color-chart/` 色卡页
| # | 区块 | 原子 |
|---|------|------|
| 1 | H1 + 描述 | |
| 2 | Filter 条 | 3× Select（Agouti / Base / Dilution）— 目前纯 UI 未接逻辑 |
| 3 | Genetic Tables | DataTable + Tabby 说明 + 4 PatternPill |
| 4 | Tip Aside | sticky 侧栏 + Download 按钮 |
| 5 | All Colors 网格 | ColorSwatchCard（色块/图 + 标签 + 基因型） |

### 3.4 `/how-cat-colors-work/` 指南页
| # | 区块 | 原子 |
|---|------|------|
| 1 | H1 | |
| 2 | Gene 模拟器 | 左 4× GeneToggle 组；右 Preview 图 + Phenotype badge |
| 3 | 四基因长文 | prose + 2× ConceptCard（Epistasis / Polygenes） |
| 4 | Case Studies 侧栏 | 2× 小图文卡 |
| 5 | Preset 入口 | 4× PresetButton 卡 |

> 注意：页面引用 `setGene` / `applyPreset`，若 script 未完整挂载则交互可能半残，改样式时一并检查。

### 3.5 `/privacy/` 隐私页
| # | 区块 |
|---|------|
| 1 | H1 + 生效日 |
| 2 | 内容白卡：欢迎 / 无采集 / Cookie / Contact |
| 3 | 底部氛围图 + 文案 |

---

## 4. UI 原子速查表（全站）

| 原子名 | 出现页 | 视觉关键词 |
|--------|--------|------------|
| NavBar | 全局 | sticky、半透、琥珀 active |
| Logo | Header | pets 图标 + 粗标题 |
| PageTitle (H1) | 每页 | display-lg / Inter bold |
| SectionTitle (H2) | 各 section | headline-lg |
| FormCard | 计算器 | 白/surface、xl 圆角、浅边框 |
| ResultCard | 计算器 | secondary-container 或 surface-high |
| Select | 表单 / Filter | rounded-lg、focus 琥珀环 |
| ToggleButton | O/D 基因 | 选中 primary-fixed |
| PrimaryButton | 提交 / CTA | 琥珀底白字 |
| ProgressBar | 结果行 | 圆角轨道 + primary 填充 |
| GlassCard | 首页科普 | 白 70% + blur |
| ImageCard | Examples | 图上 + 标题/副文 |
| IconCircleCard | Breed 入口 | 圆图标 + 文案 |
| StatPill | Maine notes | 大数字 + 小标签 |
| DataTable | Chart | thead 灰底、行 hover |
| TipAside | Chart | primary-fixed 浅底 sticky |
| ColorSwatchCard | Chart | aspect-square 色块/图 |
| Breadcrumb | Bengal | Home › Breeds › Bengal |
| Badge / Pill | Bengal、Guide | primary-fixed 小圆 |
| GenePill | Guide | active 琥珀 / inactive 浅黄 |
| FooterColumns | 全局 | 3 列链接 |

---

## 5. 图片资源约定

路径约定：`/images/cats/{category}/{n}.jpg`

| 目录 | 语义 |
|------|------|
| `black/` | 纯黑 / 深色 solid |
| `blue/` | 蓝/灰 dilute |
| `blue-cream/` | 蓝奶油（dilute tortie 类） |
| `brown-tabby/` | 棕虎斑 |
| `cream/` | 奶油色 |
| `red-tabby/` | 红虎斑 / ginger |
| `tortoiseshell/` | 三花/玳瑁 |
| `maine-coon/` | 缅因库恩品种代表 |
| `persian/` | 波斯品种代表 |
| `bengal/` | 孟加拉品种代表（可多张） |

原则：
1. **标签文案 ↔ 图片语义一致**（不能用红虎斑图配 Lilac 文案）  
2. **同页尽量不重复同一文件**  
3. 资源不足时：用色块/渐变占位，或合并卡片，而不是硬复用错图  

---

## 6. 页面 ↔ 组件依赖矩阵

| 页面 | Layout | Header | Footer | CatColorCalculator | 页面内联区块 |
|------|:------:|:------:|:------:|:------------------:|--------------|
| index | ✓ | ✓ | ✓ | home | Hero, GlassCards, CaseStudy, Examples, Breeds |
| maine-coon | ✓ | ✓ | ✓ | breed | Colors, Notes, Examples, OtherBreeds |
| british-shorthair | ✓ | ✓ | ✓ | breed | Colors, Genetics, Examples, OtherBreeds |
| persian | ✓ | ✓ | ✓ | breed | Colors, Genetics, Examples, OtherBreeds |
| bengal | ✓ | ✓ | ✓ | breed | Hero, Colors, Markers, Examples, OtherBreeds |
| cat-color-chart | ✓ | ✓ | ✓ | — | Filters, Table, Tip, Swatches |
| how-cat-colors-work | ✓ | ✓ | ✓ | — | GeneSim, Prose, CaseStudies, Presets |
| privacy | ✓ | ✓ | ✓ | — | PolicyCard, AtmosphereImage |

---

## 7. 改风格时的推荐切入点

1. **Token 层**：`tailwind.config.js` 色板 + 字体  
2. **全局工具类**：`global.css` 阴影/卡片  
3. **交互原子**：`CatColorCalculator` 内 Select / Toggle / Button / ProgressBar  
4. **页面卡片语言**：各页 ImageCard / GlassCard 统一  
5. **装饰**：Footer、Divider、标题缎带等（可选）

---

## 8. 图片资源现状（2026-07-23 已校正）

### 已核实实图语义
| 路径 | 实际内容 |
|------|----------|
| `black/0` | 纯黑猫 |
| `blue/0` `blue/1` `blue/2` | 蓝灰 solid（BSH 型） |
| `brown-tabby/0` `1` | 棕虎斑 |
| `red-tabby/0` | 红虎斑幼猫 |
| `red-tabby/1` | 橙白双色 |
| `tortoiseshell/0` | 玳瑁/三花 |
| `cream/0` | 奶油色点（point） |
| `cream/1` | 浅银奶油 BSH 型 |
| `blue-cream/0` | 蓝奶油 dilute tortie tabby |
| `maine-coon/0` | 奶油长毛缅因型 |
| `persian/0` | 白波斯 |
| `persian/1` | 银阴影波斯幼猫 |
| `bengal/0` | 棕虎斑孟加拉型（有白胸） |
| `bengal/1` | 棕孟加拉（沙发） |
| `bengal/2` | 棕斑孟加拉（标准姿势） |
| `lilac/0` `silver/0` | 蓝灰 BSH（与 blue 同系，可作备用） |

### 已修复问题
- 文案/alt 与实图错配（Lilac 用红虎斑、Calico 用黑猫、Snow 用棕孟加拉等）  
- 同页大量重复同一文件（Maine Coon 8 卡多图重复）  
- Chart 假色块 → 改为真实照片网格  
- 删掉错误下载（狗图、鞋图等）  

### 仍注意
- 资源仍有限，跨页可合理复用**语义正确**的图  
- 没有真正的 pure white / lilac solid 专用高质图时，用相近色系并改文案，勿硬标错色  
- Unsplash License：可商用，建议站点某处保留来源说明（可选）
