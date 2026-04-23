# HeroUI 重构总结

## 已完成的重构

### 1. SearchBar 组件 ✅
- **使用的 HeroUI 组件**: `Input`
- **改进**:
  - 使用 HeroUI Input 替换原生 input
  - 保持原有的搜索图标和设置按钮
  - 使用 `variant="secondary"` 获得更简洁的外观
  - 通过 `classNames` 自定义样式以匹配原有设计

### 2. SearchResultList 组件 ✅
- **使用的 HeroUI 组件**: `ListBox`, `Chip`, `Kbd`
- **改进**:
  - 使用 HeroUI ListBox 替换自定义列表渲染
  - 使用 Chip 组件显示类型标签（插件/应用等）
  - 使用 Kbd 组件显示快捷键提示
  - 移除了 framer-motion 依赖（HeroUI 内置动画）
  - 保持了原有的键盘导航和鼠标悬停功能
  
- **重要修复**:
  - 修复了 "Cannot change the id of an item" 错误
  - 使用 `result.id` 作为 ListBox.Item 的 id，而不是索引
  - 调整 selectedKeys 逻辑以匹配新的 id 策略
  - onSelectionChange 中通过 id 查找索引

### 3. Settings 组件 - 部分完成 ⚠️
- **已重构的部分**:
  - 使用 HeroUI `Card` 替换自定义卡片容器
  - 使用 HeroUI `Button` 替换原生 button（关闭按钮、操作按钮）
  - 使用 HeroUI `Chip` 显示插件版本和固定状态
  - 使用 HeroUI `Tooltip` 为按钮添加提示
  
- **待重构的部分**:
  - NavItem 组件（侧边导航）- 保留了原有实现
  - Switch 组件（开关控件）- 待更新
  - 其他表单控件 - 待更新

## 技术要点

### HeroUI 组件映射
| 原组件 | HeroUI 组件 | 说明 |
|--------|------------|------|
| `<input>` | `<Input>` | 搜索框 |
| 自定义列表 | `<ListBox>` | 搜索结果列表 |
| `<span>` 标签 | `<Chip>` | 类型标签、版本标签 |
| `<kbd>` | `<Kbd>` | 快捷键显示 |
| `<div>` 卡片 | `<Card>` | 设置卡片容器 |
| `<button>` | `<Button>` | 各种按钮 |
| title 属性 | `<Tooltip>` | 工具提示 |

### API 注意事项
1. **Button 组件**:
   - 使用 `variant` 而非 `color`
   - 可用 variant: `primary`, `secondary`, `tertiary`, `ghost`, `outline`, `danger`
   - 使用 `onPress` 而非 `onClick`

2. **Chip 组件**:
   - color 选项: `default`, `accent`, `success`, `warning`, `danger`
   - variant 选项: `primary`, `secondary`, `tertiary`, `soft`
   - 不支持 `startContent`，直接在 children 中添加图标

3. **Tooltip 组件**:
   - 使用 `<Tooltip.Content>` 子组件而非 `content` 属性
   - 结构: `<Tooltip><Trigger /><Tooltip.Content>内容</Tooltip.Content></Tooltip>`

4. **ListBox 组件**:
   - 不支持 `itemClasses` 属性
   - 使用 `selectedKeys` 控制选中状态
   - 使用 `onSelectionChange` 处理选择变化

## 保留的自定义组件

### NavItem
- 原因: HeroUI Tabs 的垂直导航 API 与当前设计不完全匹配
- 建议: 可以后续考虑使用 HeroUI Tabs 或保持现状

## 下一步建议

1. **完成 Settings 组件重构**:
   - 将 Switch 替换为 HeroUI Switch
   - 将 select 替换为 HeroUI Select
   - 将 range input 替换为 HeroUI Slider

2. **主题适配优化**:
   - 确保所有 HeroUI 组件正确响应深色/浅色主题
   - 测试不同主题下的视觉效果

3. **性能优化**:
   - 验证 HeroUI 组件的性能表现
   - 必要时调整动画效果

4. **测试**:
   - 测试所有重构后的组件功能
   - 确保键盘导航正常工作
   - 验证主题切换正常

## 依赖变化

### 移除的依赖
- `framer-motion` (可选，如果其他地方不使用)

### 新增的依赖
- `@heroui/react` (已安装)

## 代码质量改进

1. **一致性**: 使用统一的 UI 组件库
2. **可维护性**: 减少自定义样式代码
3. **可访问性**: HeroUI 内置更好的 ARIA 支持
4. **主题支持**: 更好的深色/浅色主题适配
