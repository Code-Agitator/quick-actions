# Spotlight 风格动画与快捷交互优化

## 1. 核心动画重构 (Core Animation Refactoring)
**目标**: 实现极速、流畅的窗口尺寸变化和内容显现效果。

*   **技术选型**: 使用 `framer-motion` 替代当前的 Tailwind `transition-all`。
*   **修改文件**: `src/App.tsx`, `src/components/SearchBar.tsx`
*   **实施细节**:
    *   将主容器的展开/收缩逻辑封装进 `motion.div`。
    *   设置 `layout` 属性以实现平滑的尺寸自适应。
    *   调整 `transition` 参数：`duration: 0.2s`, `ease: [0.22, 1, 0.36, 1]` (类似 iOS 的贝塞尔曲线)。
    *   为搜索结果列表添加 `AnimatePresence`，实现结果出现时的轻微上浮淡入效果 (`y: 10 -> 0`, `opacity: 0 -> 1`)。

## 2. “快捷模式”交互设计 (Quick Mode Interaction)
**目标**: 通过组合键触发特殊布局，提供类似 Spotlight 的快捷操作体验。

*   **触发逻辑**: 监听 `keydown` 事件，当检测到 `Ctrl + Shift` (或用户自定义的组合键) 且处于焦点状态时进入“快捷模式”。
*   **视觉表现**:
    *   **搜索框缩短**: 宽度从 `780px` 缩减至 `400px`。
    *   **圆形快捷按钮**: 在搜索框右侧以扇形或直线排列出现 3-5 个圆形按钮。
    *   **立体感设计**: 使用 CSS `box-shadow` 和 `gradient` 模拟 macOS Big Sur 风格的立体图标质感。
*   **功能内容**: 默认展示“历史记录”（最近打开的 App 或文件）。

## 3. 组件层级优化 (Component Optimization)
*   **SearchBar 增强**: 
    *   在 `SearchBar.tsx` 中增加 `isQuickMode` 属性。
    *   根据模式动态调整 `Input` 的宽度和 `endContent` 的内容。
*   **QuickButtons 组件**: 
    *   新建 `src/components/QuickButtons.tsx`。
    *   利用 `useAppSettings` 获取历史行为数据。
    *   实现点击后直接执行对应插件或应用，并自动退出快捷模式。

## 4. 性能与细节打磨 (Performance & Polish)
*   **GPU 加速**: 确保所有动画属性均使用 `transform` 和 `opacity`，避免触发布局重排 (Reflow)。
*   **防抖处理**: 对快捷键触发增加简单的防抖，防止误触导致界面闪烁。

## 5. 动效参数参考
*   **展开/收缩**: `transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}`
*   **结果项浮现**: `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}`
*   **按钮弹出**: `scale: 0 -> 1` with spring physics.
