# 英语单词短语记背网页 - 规格说明书

## 1. 项目概述

**项目名称**: 沪教广州版单词记背助手  
**项目类型**: 单页Web应用 (React + Tailwind CSS)  
**核心功能**: 通过闪卡模式帮助学生记忆英语单词和短语，支持中英文双向切换、错题标记、进度追踪  
**目标用户**: 沪教广州版七八九年级学生

---

## 2. UI/UX 规格

### 2.1 布局结构

```
┌─────────────────────────────────────────────────────┐
│  Header: 标题 + 模式切换按钮                         │
├─────────────────────────────────────────────────────┤
│  Unit Navigation: 水平滚动单元选择器                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │              Flashcard 展示区域               │  │
│  │         (点击翻转，显示背面)                   │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [❌ 认识]  [✓ 认识]  按钮组                        │
│                                                     │
│  Progress: ████████░░ 12/20                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Footer: 统计信息 + 历史记录入口                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 响应式断点

- **Mobile**: < 640px - 单列布局，卡片宽度 90vw
- **Tablet**: 640px - 1024px - 卡片宽度 400px
- **Desktop**: > 1024px - 卡片宽度 480px，最大宽度 600px

### 2.3 视觉设计

#### 配色方案 (深色主题 - 专注学习)

```css
--bg-primary: #0f0f0f;        /* 主背景 - 深黑 */
--bg-card: #1a1a1a;           /* 卡片背景 */
--bg-card-back: #1e1e1e;       /* 卡片背面 */
--text-primary: #f5f5f5;      /* 主文字 */
--text-secondary: #a0a0a0;    /* 次要文字 */
--accent-green: #22c55e;      /* 正确按钮 */
--accent-red: #ef4444;        /* 错误按钮 */
--accent-blue: #3b82f6;       /* 强调色 */
--accent-purple: #8b5cf6;     /* 装饰色 */
--border-subtle: #2a2a2a;     /* 边框 */
```

#### 字体

- **标题**: "Playfair Display", serif (优雅衬线体)
- **正文/单词**: "Source Sans 3", sans-serif (清晰易读)
- **音标**: "Noto Sans Mono", monospace

#### 字号

- 单词: 2.5rem (40px), font-weight: 700
- 音标: 1rem (16px)
- 中文释义: 1.25rem (20px)
- 单元标题: 1.5rem (24px)

#### 间距系统

- 卡片内边距: 3rem (48px)
- 组件间距: 1.5rem (24px)
- 按钮间距: 1rem (16px)

### 2.4 组件规格

#### Header
- 固定顶部，高度 64px
- 左侧：应用标题 "单词记背"
- 右侧：模式切换按钮组 (EN→CN / CN→EN)
- 背景：半透明毛玻璃效果 `backdrop-blur-md`

#### Unit Navigation
- 水平滚动容器，高度 48px
- 每个单元按钮：圆角胶囊形状
- 选中状态：accent-blue 背景
- 包含单元进度指示器 (小圆点)

#### Flashcard
- 3D翻转动画 (perspective: 1000px)
- 正面：英文单词 + 音标 + 词性
- 背面：中文释义 + 短语 (如有)
- 点击区域：整个卡片可点击
- 翻转动画时长：0.6s，ease-out

#### Action Buttons
- 两个按钮并排：红色(不认识) / 绿色(认识)
- 圆角：rounded-xl
- 图标 + 文字
- Hover: 轻微上浮 + 阴影加深

#### Progress Bar
- 高度: 8px
- 圆角: full
- 已掌握: accent-green
- 进度数字显示

#### History Panel (Modal)
- 从右侧滑入
- 显示每个单词的正确/错误次数
- 支持手动修改次数 (输入框)
- 支持重置单条记录

### 2.5 动画效果

- 卡片翻转: `transform: rotateY(180deg)` + `backface-visibility: hidden`
- 按钮 hover: `translateY(-2px)` + `box-shadow` 增强
- 页面切换: 淡入淡出 (opacity 0→1)
- 进度更新: 平滑过渡 (transition: width 0.3s)

---

## 3. 功能规格

### 3.1 核心功能

#### F1: 单元选择
- 默认显示 Unit 1
- 点击单元切换，当前单元高亮
- 显示每个单元的已完成/总数

#### F2: 闪卡模式
- **EN→CN 模式**: 正面显示英文，点击翻转显示中文
- **CN→EN 模式**: 正面显示中文，点击翻转显示英文
- 随机顺序或顺序浏览可选

#### F3: 认识/不认识 标记
- 点击 "认识" (✓): 正确次数 +1，移至下一张
- 点击 "不认识" (✗): 错误次数 +1，移至下一张
- 当前卡片标记后自动切换到下一张

#### F4: 进度追踪
- 当前单元进度: 已完成/总数
- 显示正确率百分比
- 本单元错题优先复习

#### F5: 历史记录 (localStorage)
- 记录每个单词的正确次数和错误次数
- 数据结构:
```json
{
  "unit1": {
    "elderly": { "correct": 3, "incorrect": 1 },
    "offer": { "correct": 0, "incorrect": 2 }
  }
}
```

#### F6: 记录管理
- 点击历史按钮打开记录面板
- 可视化每个单词的掌握程度
- 支持手动输入修改正确/错误次数
- 支持一键重置当前单元/全部记录

### 3.2 增强功能

#### F7: 错题复习模式
- 只显示错误次数 > 0 的单词
- 优先复习未掌握词汇

#### F8: 随机/顺序模式
- 顺序: 按文档顺序
- 随机: 随机打乱

#### F9: 发音按钮 (可选)
- 点击发音图标播放英文发音
- 使用 Web Speech API

### 3.3 数据结构

```typescript
interface Word {
  english: string;
  phonetic: string;
  pos: string;       // 词性
  chinese: string;
  phrases?: string[]; // 短语
}

interface Unit {
  id: string;
  title: string;
  words: Word[];
}

interface StudyRecord {
  [unitId: string: {
    [english: string]: {
      correct: number;
      incorrect: number;
      lastReview: string; // ISO date
    }
  }]
}
```

---

## 4. 验收标准

### 4.1 功能验收

- [ ] 可以选择任意 Unit 进行学习
- [ ] EN→CN 模式下，点击卡片显示中文
- [ ] CN→EN 模式下，点击卡片显示英文
- [ ] 点击"认识"/"不认识"正确更新计数
- [ ] 刷新页面后历史记录保持 (localStorage)
- [ ] 可以手动修改任意单词的计数
- [ ] 可以重置单条或全部记录
- [ ] 进度条正确显示当前进度

### 4.2 视觉验收

- [ ] 深色主题正确应用
- [ ] 卡片翻转动画流畅
- [ ] 按钮 hover 效果正常
- [ ] 响应式布局在移动端正常显示
- [ ] 字体正确加载

### 4.3 交互验收

- [ ] 点击卡片响应时间 < 100ms
- [ ] 模式切换后卡片内容正确更新
- [ ] 单元切换后数据正确重置

---

## 5. 技术栈

- **框架**: React 18 + Vite
- **样式**: Tailwind CSS 3
- **状态管理**: React useState + useEffect
- **存储**: localStorage
- **字体**: Google Fonts (Playfair Display, Source Sans 3)
