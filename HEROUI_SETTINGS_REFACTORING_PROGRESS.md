# HeroUI 组件重构 Settings 页面 - 进度报告

## 🎯 目标

参考 [HeroUI v3 官方文档](https://heroui.com/docs/react/components)，使用 HeroUI 组件重构 Settings 页面，提升代码质量和一致性。

---

## ✅ 已完成的重构

### 1. 导入 HeroUI 组件

**文件**: `src/components/Settings.tsx`

```tsx
import { 
  Card, 
  Button, 
  Chip, 
  Tooltip,
  Switch,        // ✅ 新增
  Separator,     // ✅ 新增
  Select,        // ✅ 新增
  ListBox        // ✅ 新增
} from '@heroui/react';
```

### 2. 替换原生 Switch 为 HeroUI Switch（3个）

#### 位置 1: 开机自启
#### 位置 2: 显示托盘图标  
#### 位置 3: 启用动画

### 3. 替换 hr 为 HeroUI Separator（1个）

### 4. 替换原生 select 为 HeroUI Select（2个）✅ 新完成

#### 位置 1: 语言选择
```tsx
// ❌ 之前：原生 select
<select value={language} onChange={...}>
  <option value="zh-CN">简体中文</option>
  <option value="en-US">English</option>
</select>

// ✅ 现在：HeroUI Select
<Select 
  selectedKey={language}
  onSelectionChange={(key) => {
    if (key) {
      onLanguageChange(String(key));
    }
  }}
  placeholder="选择语言"
  className="max-w-xs"
  variant="secondary"
>
  <ListBox>
    <ListBox.Item id="zh-CN" textValue="简体中文">简体中文</ListBox.Item>
    <ListBox.Item id="en-US" textValue="English">English</ListBox.Item>
  </ListBox>
</Select>
```

#### 位置 2: 快捷键选择
```tsx
// ❌ 之前：原生 select
<select value={globalShortcut} onChange={...} disabled={checkingShortcut}>
  <option value="Ctrl+Space">Ctrl + Space</option>
  ...
</select>

// ✅ 现在：HeroUI Select
<Select 
  selectedKey={globalShortcut}
  onSelectionChange={(key) => {
    if (key) {
      onGlobalShortcutChange(String(key));
    }
  }}
  isDisabled={checkingShortcut}
  placeholder="选择快捷键"
  className={`max-w-xs ${
    shortcutAvailable === false ? 'border-yellow-400' : ''
  }`}
  variant="secondary"
>
  <ListBox>
    <ListBox.Item id="Ctrl+Space" textValue="Ctrl + Space">Ctrl + Space</ListBox.Item>
    <ListBox.Item id="Alt+Space" textValue="Alt + Space">Alt + Space</ListBox.Item>
    ...
  </ListBox>
</Select>
```

---

## ⏳ 待完成的重构（可选优化）

### 1. 使用 HeroUI Tabs 替代自定义导航

当前使用的是自定义的 NavItem 组件，可以考虑使用 HeroUI 的 Tabs：

```tsx
// ❌ 当前：自定义导航
<nav className="flex-1 py-2 px-2 space-y-0.5">
  <NavItem active={activeTab === 'plugins'} onClick={...} ... />
  <NavItem active={activeTab === 'appearance'} onClick={...} ... />
  ...
</nav>

// ✅ 计划：HeroUI Tabs（可能需要调整布局）
<Tabs 
  selectedKey={activeTab}
  onSelectionChange={(key) => setActiveTab(key as string)}
  variant="underlined"
  className="flex-col"
>
  <Tab key="plugins" title="插件管理" />
  <Tab key="appearance" title="外观" />
  ...
</Tabs>
```

**注意**: 由于 Settings 页面是全屏布局，侧边导航可能不适合使用 Tabs，需要评估是否值得改动。

### 2. 使用 HeroUI ScrollShadow

为侧边导航和内容区域添加滚动阴影效果：

```tsx
// ✅ 计划：添加滚动阴影
<ScrollShadow className="flex-1 py-2 px-2">
  <NavItem ... />
  <NavItem ... />
</ScrollShadow>
```

---

## 📊 重构统计

| 组件类型 | 已重构 | 待重构 | 总计 |
|---------|--------|--------|------|
| Switch | 3 ✅ | 0 | 3 |
| Select | 2 ✅ | 0 | 2 |
| Separator | 1 ✅ | 0 | 1 |
| Tabs | 0 | 1 (可选) | 1 |
| ScrollShadow | 0 | 1 (可选) | 1 |
| **总计** | **6** | **2** | **8** |

**完成度**: 75% (核心组件已全部完成)

---

## 🎨 优势对比

### HeroUI Switch vs 原生 Checkbox

| 特性 | 原生 Checkbox | HeroUI Switch |
|------|--------------|---------------|
| 代码量 | ~10 行 CSS | 3 行 props |
| 主题支持 | 手动实现 | ✅ 自动适配 |
| 无障碍 | 需手动添加 | ✅ 内置支持 |
| 动画效果 | 需自定义 | ✅ 流畅过渡 |
| 一致性 | 依赖实现 | ✅ 统一风格 |

### HeroUI Select vs 原生 Select

| 特性 | 原生 Select | HeroUI Select |
|------|------------|---------------|
| 样式定制 | 困难 | ✅ 简单 |
| 主题支持 | 无 | ✅ 自动适配 |
| 搜索功能 | 无 | ✅ 内置支持 |
| 多选支持 | 复杂 | ✅ 简单配置 |
| 可访问性 | 一般 | ✅ 优秀 |

---

## 🔧 技术要点

### HeroUI Switch API

```tsx
<Switch
  isSelected={boolean}      // 选中状态
  onChange={function}       // 变化回调（注意：不是 onValueChange）
  size="sm" | "md" | "lg"  // 尺寸
  isDisabled={boolean}      // 禁用状态
  color="primary" | ...     // ❌ v3 不支持此属性
/>
```

**注意事项**:
- ✅ 使用 `onChange` 而非 `onValueChange`
- ✅ 需要手动取反：`onChange={() => setValue(!value)}`
- ❌ v3 不支持 `color` 属性（由主题自动控制）

### HeroUI Select API

```tsx
<Select
  selectedKeys={Iterable<Key>}  // 选中的键（数组或 Set）
  onSelectionChange={function}  // 选择变化回调
  placeholder={string}          // 占位文本
  isDisabled={boolean}          // 禁用状态
  variant="primary" | "secondary" // 变体
>
  <ListBox>
    <ListBox.Item id={Key} textValue={string}>
      {children}
    </ListBox.Item>
  </ListBox>
</Select>
```

**注意事项**:
- ✅ `selectedKeys` 必须是 Iterable（数组或 Set）
- ✅ `onSelectionChange` 接收 `Set<Key>` 参数
- ✅ 需要使用 `ListBox` 和 `ListBox.Item` 作为子元素
- ✅ `id` 必须是唯一的 Key 类型

### HeroUI Separator API

```tsx
<Separator
  orientation="horizontal" | "vertical"  // 方向
  className={string}                      // 自定义样式
/>
```

---

## 📝 下一步计划

### ✅ 核心组件重构已完成！

所有主要的表单控件都已经使用 HeroUI 组件：
- ✅ Switch (3个)
- ✅ Select (2个)
- ✅ Separator (1个)

### 可选优化（低优先级）

1. **评估 Tabs 导航**
   - 考虑是否用 Tabs 替代自定义导航
   - 需要调整布局结构
   - 可能不适合当前全屏设计

2. **添加 ScrollShadow**
   - 为侧边导航添加滚动阴影
   - 提升视觉体验
   - 简单易实现

3. **其他细节优化**
   - 检查所有 Card 的使用
   - 统一 Button 的 variant
   - 优化 Tooltip 的使用

---

## 🧪 测试清单

- [x] Switch 组件点击正常
- [x] Switch 状态正确同步到设置
- [x] 深色/浅色主题下 Switch 显示正常
- [x] Select 组件打开/关闭正常
- [x] Select 选项选择正常
- [x] Select 值正确同步到设置
- [x] Separator 在两种主题下可见
- [ ] 所有交互有适当的视觉反馈
- [ ] 键盘导航正常工作
- [ ] 屏幕阅读器支持良好

---

## 📚 参考资料

- [HeroUI Switch](https://heroui.com/docs/components/switch)
- [HeroUI Select](https://heroui.com/docs/components/select)
- [HeroUI Tabs](https://heroui.com/docs/components/tabs)
- [HeroUI Separator](https://heroui.com/docs/components/separator)
- [HeroUI ScrollShadow](https://heroui.com/docs/components/scroll-shadow)
- [HeroUI Card](https://heroui.com/docs/components/card)
- [HeroUI Button](https://heroui.com/docs/components/button)

---

**更新时间**: 2026-04-23  
**状态**: ✅ 核心组件重构完成  
**完成度**: 75% (所有主要表单控件已完成)
