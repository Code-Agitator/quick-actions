# 模块 3: 通知系统 - 验收标准

## 功能完整性

- [ ] **Toast显示**：调用 `showSuccess()` 显示绿色成功通知
- [ ] **Toast显示**：调用 `showError()` 显示红色错误通知
- [ ] **Toast显示**：调用 `showWarning()` 显示黄色警告通知
- [ ] **Toast显示**：调用 `showInfo()` 显示蓝色信息通知
- [ ] **自动消失**：Toast 在 5 秒后自动消失
- [ ] **手动关闭**：点击关闭按钮立即移除 Toast
- [ ] **数量限制**：同时最多显示 3 个 Toast，超出的被移除
- [ ] **确认对话框**：调用 `confirmAction()` 显示模态对话框
- [ ] **确认对话框**：点击"确定"返回 true
- [ ] **确认对话框**：点击"取消"或背景返回 false
- [ ] **事件监听**：正确监听 `show-notification` 和 `show-confirmation` 事件
- [ ] **事件清理**：组件卸载时正确移除事件监听器

## 命名一致性

- [ ] 所有变量名符合 camelCase 规范（如 `toastId`、`isConfirmationOpen`）
- [ ] 组件名符合 PascalCase 规范（如 `NotificationProvider`、`Toast`）
- [ ] 接口名符合 PascalCase 规范并以 Props/State 结尾（如 `ToastProps`）
- [ ] 函数名清晰表达意图（如 `removeToast`、`handleConfirm`）

## 规范遵循

- [ ] 代码风格符合 project-conventions.md
- [ ] TypeScript 类型安全，无 `any` 类型使用
- [ ] 所有导出的函数有 JSDoc 注释
- [ ] 组件有清晰的 Props 接口定义
- [ ] 无空的 catch 块

## 编译/运行检查

- [ ] TypeScript 编译无错误
- [ ] ESLint 检查无警告
- [ ] 应用成功启动无崩溃
- [ ] NotificationProvider 正常包裹 App 组件

## UI/UX 验证

### Toast 样式
- [ ] Toast 卡片有圆角和阴影
- [ ] 不同类型有不同颜色边框和背景
- [ ] 图标与消息文本对齐良好
- [ ] 关闭按钮在右上角且易于点击
- [ ] Toast 位置固定在右上角（top-4 right-4）
- [ ] 多个 Toast 垂直排列，间距合理

### 动画效果
- [ ] Toast 进入时有从右侧滑入的动画
- [ ] Toast 退出时有向右侧滑出的动画
- [ ] 动画流畅，持续时间约 300ms
- [ ] 确认对话框有淡入淡出动画
- [ ] 背景遮罩有模糊效果（backdrop-blur）

### 暗色主题适配
- [ ] Toast 在暗色主题下背景色适配
- [ ] 文字颜色在暗色主题下可读
- [ ] 边框颜色在暗色主题下可见
- [ ] 图标颜色在暗色主题下清晰

## 功能测试

### Toast 测试
- [ ] 调用 `showSuccess('测试成功')`，绿色 Toast 显示
- [ ] 调用 `showError('测试错误')`，红色 Toast 显示
- [ ] 调用 `showWarning('测试警告')`，黄色 Toast 显示
- [ ] 调用 `showInfo('测试信息')`，蓝色 Toast 显示
- [ ] 等待 5 秒，Toast 自动消失
- [ ] 点击关闭按钮，Toast 立即消失
- [ ] 连续调用 5 次，只显示最近 3 个
- [ ] Toast 消息文本正确显示，无截断

### ConfirmationDialog 测试
- [ ] 调用 `confirmAction('确认操作？')`，对话框显示
- [ ] 对话框标题为"确认操作"
- [ ] 消息文本正确显示
- [ ] 点击"确定"，Promise resolve 为 true
- [ ] 点击"取消"，Promise resolve 为 false
- [ ] 点击背景遮罩，Promise resolve 为 false
- [ ] 按 Esc 键，Promise resolve 为 false（如果实现）
- [ ] 对话框居中显示

### 集成测试
- [ ] 在 GeneralSetting 中替换 window.confirm() 后功能正常
- [ ] 在 AboutTab 中替换 window.confirm() 后功能正常
- [ ] 重置设置后显示成功 Toast
- [ ] 取消重置不执行操作

## 性能要求

- [ ] Toast 渲染时间小于 100ms
- [ ] 同时显示 3 个 Toast 时帧率保持 60fps
- [ ] 无内存泄漏（事件监听器和定时器正确清理）
- [ ] 动画不影响页面滚动性能

## 边界条件

- [ ] 超长消息（>200字符）正常显示，不溢出容器
- [ ] 空消息字符串也能显示（虽然不应该发生）
- [ ] 特殊字符（如 emoji、HTML 标签）正确转义或显示
- [ ] 快速连续调用 20 次通知，不会崩溃或卡死
- [ ] 在通知显示期间刷新页面，状态正确重置

## 错误处理

- [ ] 事件详情缺失时有默认值或错误提示
- [ ] 定时器创建失败不影响其他通知
- [ ] 组件卸载时不会尝试更新状态

## 代码质量

- [ ] NotificationProvider 代码行数不超过 200 行
- [ ] Toast 组件代码行数不超过 100 行
- [ ] ConfirmationDialog 组件代码行数不超过 100 行
- [ ] 单个函数长度不超过 50 行
- [ ] 有适当的注释说明复杂逻辑
- [ ] 无重复代码
- [ ] 工具函数（notifications.ts）有完整的 JSDoc 注释

## 无障碍测试

- [ ] Toast 有适当的 ARIA 角色（role="alert" 或 role="status"）
- [ ] 屏幕阅读器可以读取通知内容
- [ ] 确认对话框有焦点陷阱（focus trap）
- [ ] 键盘用户可以操作所有交互元素
- [ ] 关闭按钮有清晰的 aria-label

## 兼容性测试

- [ ] Chrome/Edge WebView 中正常工作
- [ ] Firefox GeckoView 中正常工作（如果支持）
- [ ] Safari WKWebView 中正常工作（macOS）
- [ ] CustomEvent API 在所有目标平台可用

## 回归测试

- [ ] 原有的设置功能不受影响
- [ ] ThemeProvider 正常工作
- [ ] DebugPanel 正常工作
- [ ] 搜索和插件功能正常
- [ ] 应用启动和关闭窗口正常

## 文档完整性

- [ ] notifications.ts 中所有导出函数有 JSDoc 注释
- [ ] 每个函数有 @param 和 @returns 标签
- [ ] 复杂逻辑有行内注释
- [ ] README 或开发文档中提及通知系统的使用方法（可选）
