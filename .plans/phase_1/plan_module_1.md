# 模块 1: 外观增强设置 - 详细规划文档

## 1. 任务概述

- **复杂度评级**: L2（中等）
- **输入源**: 
  - `src/hooks/useAppSettings.ts` - 已有 `enableAnimations`、`windowOpacity`、`layoutDensity` 字段
  - `src/components/settings/AppearanceSetting.tsx` - 现有外观设置组件
- **输出目标**: 在 AppearanceSetting 中添加动画开关、布局密度选择、窗口透明度滑块

## 2. 可复用资源

### 2.1 已实现的Hook功能

```typescript
// useAppSettings.ts 中已有的功能
const { settings, updateSetting } = useAppSettings();

// 已有的副作用应用函数
- applyAnimations(enabled: boolean) // line 127-139
- applyWindowOpacity(opacity: number) // line 142-152
```

### 2.2 已有的UI组件库

- HeroUI React (`@heroui/react`) 提供：
  - `Switch` - 用于动画开关
  - `Select` / `SelectItem` - 用于布局密度选择
  - `Slider` - 用于透明度调整（需要确认HeroUI是否支持）

### 2.3 已有的样式模式

参考 `AppearanceSetting.tsx` 中的现有模式：
- 使用 `<section>` 分组相关设置
- 每个设置项包含图标、标题、描述、控件
- 使用 `bg-default-100` 作为卡片背景
- 使用 `Divider` 分隔不同区块

## 3. 依赖关系

### 3.1 依赖的模块

- ✅ `useAppSettings` Hook（已实现）
- ✅ HeroUI 组件库（已安装）
- ✅ ThemeProvider（已实现，用于主题切换）

### 3.2 被依赖的模块

- ❌ 无（此模块不依赖其他待实现模块）

## 4. 关键映射

| 原名称 | 新名称/用途 | 类型 |
|-------|-----------|------|
| `settings.enableAnimations` | 动画开关状态 | boolean |
| `settings.windowOpacity` | 窗口透明度值 | number (0.5-1.0) |
| `settings.layoutDensity` | 布局密度选项 | 'compact' \| 'comfortable' |
| `applyAnimations()` | 应用动画设置的函数 | function |
| `applyWindowOpacity()` | 应用透明度设置的函数 | function |

## 5. 实现要点

### 5.1 动画开关（Enable Animations）

**位置**：在 AppearanceSetting.tsx 的语言设置之后添加新区块

**UI结构**：
```tsx
<section className="mb-8">
  <div className="flex items-center gap-2 mb-4">
    <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
      {/* 动画图标 */}
    </div>
    <div>
      <p className="font-semibold text-medium">动画效果</p>
      <p className="text-small text-default-500">控制界面过渡动画</p>
    </div>
  </div>
  <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
    {/* Switch 组件 */}
    <Switch
      aria-label="启用动画"
      size="sm"
      color="primary"
      isSelected={settings.enableAnimations}
      onValueChange={(v) => updateSetting('enableAnimations', v)}
    />
    <div className="flex-1">
      <p className="text-small text-default-600">启用交互动画</p>
      <p className="text-tiny text-default-500 mt-0.5">禁用后可减少运动眩晕</p>
    </div>
  </div>
</section>
```

**核心逻辑**：
- 直接使用 `settings.enableAnimations` 作为 Switch 的状态
- 调用 `updateSetting('enableAnimations', value)` 更新设置
- `useAppSettings` 中的 useEffect 会自动调用 `applyAnimations()`

**边界条件**：
- 无需额外验证，boolean 类型天然安全

### 5.2 布局密度选择（Layout Density）

**位置**：在动画开关之后添加

**UI结构**：
```tsx
<section className="mb-8">
  <div className="flex items-center gap-2 mb-4">
    <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
      {/* 布局图标 */}
    </div>
    <div>
      <p className="font-semibold text-medium">布局密度</p>
      <p className="text-small text-default-500">调整界面元素间距</p>
    </div>
  </div>
  <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
    <Select
      label="选择布局密度"
      selectedKeys={[settings.layoutDensity]}
      onSelectionChange={(keys) => {
        const key = Array.from(keys)[0] as 'compact' | 'comfortable';
        if (key) {
          updateSetting('layoutDensity', key);
        }
      }}
    >
      <SelectItem key="compact">紧凑</SelectItem>
      <SelectItem key="comfortable">宽松</SelectItem>
    </Select>
  </div>
</section>
```

**核心逻辑**：
- 使用 Select 组件让用户选择密度
- 调用 `updateSetting('layoutDensity', value)` 更新设置
- ⚠️ **需要额外工作**：实际应用密度到全局样式

**CSS实现方案**：

方案A：在全局CSS文件中定义密度类
```css
/* src/styles/global.css */
.density-compact {
  --spacing-sm: 0.25rem;
  --spacing-md: 0.5rem;
  --spacing-lg: 0.75rem;
}

.density-comfortable {
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
}
```

方案B：在根元素上动态添加类名
```tsx
// 在 App.tsx 或 ThemeProvider 中
useEffect(() => {
  document.documentElement.classList.remove('density-compact', 'density-comfortable');
  document.documentElement.classList.add(`density-${settings.layoutDensity}`);
}, [settings.layoutDensity]);
```

**建议**：先实现UI，CSS部分作为后续优化（标记为TODO）

### 5.3 窗口透明度滑块（Window Opacity）

**位置**：在布局密度之后添加

**UI结构**：
```tsx
<section>
  <div className="flex items-center gap-2 mb-4">
    <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
      {/* 透明度图标 */}
    </div>
    <div>
      <p className="font-semibold text-medium">窗口透明度</p>
      <p className="text-small text-default-500">调整主窗口不透明度</p>
    </div>
  </div>
  <div className="p-3 rounded-lg bg-default-100">
    <div className="flex items-center gap-3 mb-2">
      <span className="text-tiny text-default-500 w-12">50%</span>
      <Slider
        aria-label="窗口透明度"
        size="sm"
        color="primary"
        minValue={0.5}
        maxValue={1.0}
        step={0.01}
        value={settings.windowOpacity}
        onChange={(value) => {
          if (Array.isArray(value)) {
            updateSetting('windowOpacity', value[0]);
          } else {
            updateSetting('windowOpacity', value);
          }
        }}
        formatOptions={{ style: 'percent' }}
      />
      <span className="text-tiny text-default-500 w-12 text-right">100%</span>
    </div>
    <p className="text-tiny text-default-500 text-center">
      当前: {(settings.windowOpacity * 100).toFixed(0)}%
    </p>
  </div>
</section>
```

**核心逻辑**：
- 使用 Slider 组件，范围 0.5 - 1.0
- 步长 0.01，提供精细控制
- 调用 `updateSetting('windowOpacity', value)` 更新设置
- `useAppSettings` 中的 useEffect 会自动调用 `applyWindowOpacity()`

**性能优化**：
- ⚠️ **重要**：Slider 的 onChange 会频繁触发，需要防抖处理

**防抖实现**：
```tsx
import { useCallback } from 'react';
import { debounce } from '../../utils/debounce'; // 需要创建此工具函数

const debouncedUpdateOpacity = useCallback(
  debounce((value: number) => {
    updateSetting('windowOpacity', value);
  }, 300),
  [updateSetting]
);
```

**边界条件**：
- `applyWindowOpacity` 中已有 clamping 逻辑（line 146），确保值在 0.5-1.0 之间
- Slider 的 `minValue` 和 `maxValue` 也应设置为相同范围

### 5.4 图标选择

建议使用以下图标（从 react-icons 或 HeroUI 图标库）：

1. **动画图标**：`IoPlayCircleOutline` 或 `IoFlashOutline`
2. **布局图标**：`IoGridOutline` 或 `IoReorderThreeOutline`
3. **透明度图标**：`IoEyeOutline` 或 `IoContrastOutline`

### 5.5 代码组织

**修改文件**：`src/components/settings/AppearanceSetting.tsx`

**新增导入**：
```tsx
import { Slider } from '@heroui/react'; // 如果HeroUI支持
import { IoPlayCircleOutline, IoGridOutline, IoEyeOutline } from 'react-icons/io5';
```

**插入位置**：
- 在语言设置 section 之后（line 209 之前）
- 保持相同的代码风格和结构

## 6. 引用约定

### 6.1 user-conventions.md

- **2.1 命名规范**：
  - 变量名使用 camelCase：`windowOpacity`、`layoutDensity` ✅
  - 布尔变量以 `is`、`has`、`can` 开头：`enableAnimations` ✅

- **2.3 React + TypeScript 特定约定**：
  - 组件使用函数式组件 + Hooks ✅
  - 禁止使用 `any` 类型 ✅

- **5. 性能优化约定**：
  - 搜索操作必须实现防抖（debounce）⚠️ 透明度滑块需要防抖

### 6.2 project-conventions.md

- **2.5 TypeScript 类型安全**：
  - 禁止使用 `as any` 类型断言 ✅
  - 应定义明确的接口类型 ✅

## 7. 测试要求

### 7.1 手动测试清单

- [ ] 切换动画开关，观察页面过渡效果是否消失/出现
- [ ] 切换布局密度，观察元素间距是否变化（如果CSS已实现）
- [ ] 拖动透明度滑块，观察窗口透明度是否平滑变化
- [ ] 刷新页面，验证设置是否持久化（从localStorage加载）
- [ ] 检查控制台，确认没有错误日志

### 7.2 边界测试

- [ ] 透明度滑块拖到最小值（50%），确认不会更低
- [ ] 透明度滑块拖到最大值（100%），确认不会更高
- [ ] 快速拖动滑块，确认防抖生效（不会频繁更新）

## 8. 风险提示

### 8.1 技术风险

1. **HeroUI Slider 组件可能不支持**
   - **缓解措施**：如果不支持，使用原生 `<input type="range">` 并自定义样式
   - **备选方案**：使用 HeroUI 的 `Input` 组件，类型为 number

2. **layoutDensity CSS实现复杂度高**
   - **缓解措施**：先实现UI，CSS部分标记为TODO，后续迭代
   - **影响**：用户可以看到选项但看不到效果（体验不佳）

3. **透明度调整可能导致性能问题**
   - **缓解措施**：实现防抖，限制更新频率到每300ms一次
   - **监控**：观察浏览器性能面板的重绘次数

### 8.2 用户体验风险

1. **过多的设置选项可能让用户困惑**
   - **缓解措施**：每个选项都提供清晰的描述文本
   - **设计**：使用折叠面板或高级设置分组

## 9. 下一步

完成此模块后，继续实现 Module 3（通知系统），因为 Module 2（快捷键编辑器）可能需要显示通知反馈。
