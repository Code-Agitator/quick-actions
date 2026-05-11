# 模块 3: 通知系统 - 详细规划文档

## 1. 任务概述

- **复杂度评级**: L2（中等）
- **输入源**: 
  - `src/utils/notifications.ts` - 已定义通知API
  - `project-conventions.md v1.4` - 禁止使用alert/confirm，应使用Toast
- **输出目标**: 实现全局通知组件，替代原生对话框，提供友好的用户反馈

## 2. 可复用资源

### 2.1 已有的通知API

```typescript
// src/utils/notifications.ts 中已定义的函数
- showSuccess(message: string) // 成功通知
- showError(message: string)   // 错误通知
- showWarning(message: string) // 警告通知
- showInfo(message: string)    // 信息通知
- confirmAction(message: string): Promise<boolean> // 确认对话框
```

**事件机制**：
- 所有通知函数通过 `window.dispatchEvent` 触发自定义事件
- 事件名称：`show-notification` 和 `show-confirmation`
- 事件详情：`{ type: 'success' | 'error' | 'warning' | 'info', message: string }`

### 2.2 已有的UI组件库

- HeroUI React (`@heroui/react`) 提供：
  - `Card` - 用于通知卡片
  - `Button` - 用于确认对话框按钮
  - 可使用 Framer Motion 实现动画效果

### 2.3 已有的动画库

- `framer-motion` (已安装) - 用于通知进入/退出动画

## 3. 依赖关系

### 3.1 依赖的模块

- ✅ Framer Motion（已安装）
- ✅ HeroUI React（已安装）
- ✅ CustomEvent API（浏览器原生支持）

### 3.2 被依赖的模块

- ❌ Module 2（快捷键编辑器）- 将使用此通知系统
- ❌ Module 4（确认对话框）- 与此模块一起实现
- ⚠️ GeneralSetting.tsx 和 AboutTab.tsx - 需要替换 window.confirm()

## 4. 关键映射

| 原名称 | 新名称/用途 | 类型 |
|-------|-----------|------|
| `show-notification` 事件 | 触发通知显示 | CustomEvent |
| `show-confirmation` 事件 | 触发确认对话框 | CustomEvent |
| NotificationProvider | 全局通知容器组件 | React Component |
| Toast | 单个通知项组件 | React Component |
| ConfirmationDialog | 确认对话框组件 | React Component |

## 5. 实现要点

### 5.1 整体架构设计

**组件层级**：
```
App
├── ThemeProvider
├── NotificationProvider (新增)
│   ├── ToastContainer
│   │   ├── Toast (多个)
│   │   └── ...
│   └── ConfirmationDialog (模态层)
├── Settings / SearchBar / ...
└── DebugPanel
```

**数据流**：
```
工具函数调用 → dispatchEvent → NotificationProvider监听 → 更新state → 渲染Toast/Dialog
```

### 5.2 NotificationProvider 组件

**文件位置**：`src/components/providers/NotificationProvider.tsx`

**核心功能**：
1. 监听 `show-notification` 和 `show-confirmation` 事件
2. 管理通知队列和显示状态
3. 自动移除过期的通知
4. 渲染 Toast 和 ConfirmationDialog

**状态管理**：
```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  createdAt: number;
}

interface ConfirmationState {
  isOpen: boolean;
  message: string;
  resolve: (value: boolean) => void;
}

const [toasts, setToasts] = useState<Toast[]>([]);
const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
```

**事件监听**：
```typescript
useEffect(() => {
  const handleNotification = (e: CustomEvent<{ type: string; message: string }>) => {
    const { type, message } = e.detail;
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const newToast: Toast = {
      id,
      type: type as Toast['type'],
      message,
      createdAt: Date.now(),
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // 自动移除（5秒后）
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const handleConfirmation = (e: CustomEvent<{ message: string; resolve: (value: boolean) => void }>) => {
    const { message, resolve } = e.detail;
    setConfirmation({ isOpen: true, message, resolve });
  };

  window.addEventListener('show-notification', handleNotification as EventListener);
  window.addEventListener('show-confirmation', handleConfirmation as EventListener);
  
  return () => {
    window.removeEventListener('show-notification', handleNotification as EventListener);
    window.removeEventListener('show-confirmation', handleConfirmation as EventListener);
  };
}, []);
```

**移除通知**：
```typescript
const removeToast = (id: string) => {
  setToasts(prev => prev.filter(toast => toast.id !== id));
};
```

**确认对话框处理**：
```typescript
const handleConfirm = () => {
  if (confirmation) {
    confirmation.resolve(true);
    setConfirmation(null);
  }
};

const handleCancel = () => {
  if (confirmation) {
    confirmation.resolve(false);
    setConfirmation(null);
  }
};
```

**渲染逻辑**：
```tsx
return (
  <>
    {/* Toast 容器 */}
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>

    {/* 确认对话框 */}
    {confirmation && (
      <ConfirmationDialog
        message={confirmation.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )}

    {/* 子组件 */}
    {children}
  </>
);
```

### 5.3 Toast 组件

**文件位置**：`src/components/common/Toast.tsx`

**UI设计**：
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@heroui/react';
import { IoCheckmarkCircle, IoCloseCircle, IoWarning, IoInformationCircle, IoClose } from 'react-icons/io5';

interface ToastProps {
  toast: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };
  onClose: () => void;
}

const iconMap = {
  success: IoCheckmarkCircle,
  error: IoCloseCircle,
  warning: IoWarning,
  info: IoInformationCircle,
};

const colorMap = {
  success: 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

export function Toast({ toast, onClose }: ToastProps) {
  const Icon = iconMap[toast.type];
  const colorClass = colorMap[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto"
    >
      <Card className={`p-4 min-w-[300px] max-w-[400px] border ${colorClass}`}>
        <div className="flex items-start gap-3">
          <Icon className="text-xl flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {toast.message}
            </p>
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onClose}
            className="min-w-6 w-6 h-6"
          >
            <IoClose className="text-base" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
```

**动画说明**：
- 进入：从右侧滑入，同时淡入和放大
- 退出：向右侧滑出，同时淡出和缩小
- 持续时间：300ms

### 5.4 ConfirmationDialog 组件

**文件位置**：`src/components/common/ConfirmationDialog.tsx`

**UI设计**：
```tsx
import { motion } from 'framer-motion';
import { Button } from '@heroui/react';
import { IoHelpCircle } from 'react-icons/io5';

interface ConfirmationDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({ message, onConfirm, onCancel }: ConfirmationDialogProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel} // 点击背景关闭
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <IoHelpCircle className="text-2xl text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              确认操作
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            variant="flat"
            onPress={onCancel}
          >
            取消
          </Button>
          <Button
            color="primary"
            onPress={onConfirm}
          >
            确定
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

**交互说明**：
- 点击背景遮罩层或按 Esc 键可取消
- 点击"确定"按钮执行确认操作
- 点击"取消"按钮或背景关闭对话框

### 5.5 集成到应用

**修改文件**：`src/main.tsx` 或 `src/App.tsx`

**方案A：在 main.tsx 中包裹（推荐）**
```tsx
import { NotificationProvider } from './components/providers/NotificationProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <ThemeProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </ThemeProvider>
    </HeroUIProvider>
  </React.StrictMode>,
);
```

**方案B：在 App.tsx 中包裹**
```tsx
import { NotificationProvider } from './components/providers/NotificationProvider';

function App() {
  return (
    <NotificationProvider>
      {/* 现有内容 */}
    </NotificationProvider>
  );
}
```

**建议**：采用方案A，确保所有组件都能使用通知系统。

### 5.6 替换 window.confirm()

**修改文件1**：`src/components/settings/GeneralSetting.tsx`

**原代码**（line 9-13）：
```tsx
const restoreSettings = async () => {
  if (window.confirm('确定要重置所有设置为默认值吗？')) {
    resetSettings();
  }
};
```

**新代码**：
```tsx
import { confirmAction, showSuccess } from '../../utils/notifications';

const restoreSettings = async () => {
  const confirmed = await confirmAction('确定要重置所有设置为默认值吗？');
  if (confirmed) {
    resetSettings();
    showSuccess('设置已重置为默认值');
  }
};
```

**修改文件2**：`src/components/settings/AboutTab.tsx`

**原代码**（line 60-64）：
```tsx
<Button
  onPress={() => {
    if (window.confirm('确定要重置所有设置为默认值吗？')) {
      onReset?.();
    }
  }}
  // ...
>
```

**新代码**：
```tsx
import { confirmAction, showSuccess } from '../../utils/notifications';

<Button
  onPress={async () => {
    const confirmed = await confirmAction('确定要重置所有设置为默认值吗？');
    if (confirmed) {
      onReset?.();
      showSuccess('设置已重置为默认值');
    }
  }}
  // ...
>
```

### 5.7 性能优化

1. **通知数量限制**：
   - 最多同时显示3个通知
   - 超出时移除最早的通知

```typescript
const MAX_TOASTS = 3;

const handleNotification = (e: CustomEvent<...>) => {
  // ...
  setToasts(prev => {
    const newToasts = [...prev, newToast];
    if (newToasts.length > MAX_TOASTS) {
      return newToasts.slice(-MAX_TOASTS);
    }
    return newToasts;
  });
};
```

2. **自动清理定时器**：
   - 使用 Map 存储定时器ID，便于清理
   - 组件卸载时清除所有定时器

```typescript
const timersRef = useRef<Map<string, number>>(new Map());

const removeToast = (id: string) => {
  const timerId = timersRef.current.get(id);
  if (timerId) {
    clearTimeout(timerId);
    timersRef.current.delete(id);
  }
  setToasts(prev => prev.filter(toast => toast.id !== id));
};
```

3. **避免不必要的重渲染**：
   - 使用 `React.memo` 包裹 Toast 组件
   - 使用 `useCallback` 包裹事件处理函数

## 6. 引用约定

### 6.1 user-conventions.md

- **2.3 React + TypeScript 特定约定**：
  - 组件使用函数式组件 + Hooks ✅
  - 自定义 Hooks 以 `use` 开头：不适用
  - 禁止使用 `any` 类型 ✅

- **2.5 错误处理**：
  - API 调用失败必须显示友好的错误提示 ✅（通知系统正是为此设计）

- **4. 文档要求**：
  - 公共 API 必须有 JSDoc/tsdoc 注释 ✅（为所有导出函数添加注释）

### 6.2 project-conventions.md

- **2.4 用户交互规范**：
  - 禁止使用 `alert()` 和 `confirm()` 原生对话框 ✅（此模块解决此问题）
  - 应使用 Toast、Modal 或自定义对话框组件提供用户反馈 ✅
  - 错误提示应友好且包含可操作的解决方案 ✅
  - 成功操作应有明确的视觉反馈（如Toast、动画） ✅

- **2.5 TypeScript 类型安全**：
  - 禁止使用 `as any` 类型断言 ✅
  - 应定义明确的接口类型 ✅

## 7. 测试要求

### 7.1 手动测试清单

**Toast 测试**：
- [ ] 调用 `showSuccess('测试')`，确认绿色Toast显示
- [ ] 调用 `showError('测试')`，确认红色Toast显示
- [ ] 调用 `showWarning('测试')`，确认黄色Toast显示
- [ ] 调用 `showInfo('测试')`，确认蓝色Toast显示
- [ ] 等待5秒，确认Toast自动消失
- [ ] 点击关闭按钮，确认Toast立即消失
- [ ] 连续调用4次，确认只显示最近3个

**ConfirmationDialog 测试**：
- [ ] 调用 `confirmAction('确认吗？')`，确认对话框显示
- [ ] 点击"确定"，确认返回 true
- [ ] 点击"取消"，确认返回 false
- [ ] 点击背景遮罩，确认返回 false
- [ ] 按 Esc 键，确认返回 false（如果实现了键盘事件）

**集成测试**：
- [ ] 在 GeneralSetting 中点击"恢复设置"，确认显示确认对话框
- [ ] 确认后，确认显示成功Toast
- [ ] 取消后，确认不执行重置

### 7.2 边界测试

- [ ] 发送超长消息（>200字符），确认Toast正常显示且不溢出
- [ ] 快速连续发送10个通知，确认不会出现性能问题
- [ ] 在通知显示期间刷新页面，确认通知清除
- [ ] 在暗色主题下，确认Toast颜色适配

### 7.3 无障碍测试

- [ ] 使用屏幕阅读器，确认通知内容可读
- [ ] 使用键盘导航，确认可以关闭Toast和对话框
- [ ] 检查对比度，确认符合WCAG标准

## 8. 风险提示

### 8.1 技术风险（低）

1. **Framer Motion 与 HeroUI 动画冲突**
   - **风险等级**：🟢 低
   - **影响**：动画效果不正常
   - **缓解措施**：
     1. 优先使用 Framer Motion 的 `AnimatePresence`
     2. 避免在Toast上使用HeroUI的内置动画
     3. 测试各种场景确保兼容性

2. **事件监听器泄漏**
   - **风险等级**：🟢 低
   - **影响**：内存泄漏，多次触发
   - **缓解措施**：
     1. 严格在 useEffect cleanup 中移除监听器
     2. 使用 ESLint 插件检测泄漏
     3. 开发工具中监控事件监听器数量

3. **定时器未清理**
   - **风险等级**：🟢 低
   - **影响**：内存泄漏，回调在组件卸载后执行
   - **缓解措施**：
     1. 使用 ref 存储定时器ID
     2. 组件卸载时清除所有定时器
     3. 在 removeToast 中清除对应定时器

### 8.2 用户体验风险（低）

1. **通知过多可能干扰用户**
   - **风险等级**：🟢 低
   - **影响**：用户感到烦躁
   - **缓解措施**：
     1. 限制同时显示的通知数量（最多3个）
     2. 自动消失时间合理（5秒）
     3. 提供手动关闭按钮

2. **确认对话框打断用户流程**
   - **风险等级**：🟢 低
   - **影响**：用户需要额外点击
   - **缓解措施**：
     1. 只在危险操作时使用（如删除、重置）
     2. 提供清晰的说明文本
     3. 考虑添加"不再提示"选项（可选）

### 8.3 兼容性风险（极低）

1. **CustomEvent 在不支持的浏览器中失效**
   - **风险等级**：🟢 极低
   - **影响**：通知系统完全不工作
   - **缓解措施**：
     1. Tauri 使用现代WebView，完全支持 CustomEvent
     2. 如需兼容旧浏览器，可使用 polyfill
     3. 当前项目无需考虑

## 9. 后续优化建议

1. **通知持久化**：
   - 将重要通知保存到 localStorage
   - 提供通知历史记录查看

2. **通知分组**：
   - 相同类型的通知合并显示
   - 显示计数徽章

3. **通知优先级**：
   - 高优先级通知置顶显示
   - 高优先级通知不自动消失

4. **通知声音**：
   - 为不同类型的通知添加音效
   - 允许用户在设置中禁用声音

5. **通知位置自定义**：
   - 允许用户选择通知显示位置（左上、右上、左下、右下）
   - 在设置中添加选项

## 10. 下一步

完成此模块后，立即修复 GeneralSetting.tsx 和 AboutTab.tsx 中的 window.confirm() 调用。然后可以继续实现 Module 1（外观增强设置）或 Module 4（确认对话框，实际上已在此模块中实现）。
