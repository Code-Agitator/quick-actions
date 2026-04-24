# HeroUI v3 主题管理 - 快速参考

## 🚀 核心要点

### 1. HeroUI v3 不需要 Provider
```tsx
// ❌ 错误（v2 写法）
import { HeroUIProvider } from '@heroui/react'
<HeroUIProvider><App /></HeroUIProvider>

// ✅ 正确（v3 写法）
import ThemeProvider from './components/providers/ThemeProvider'
<ThemeProvider><App /></ThemeProvider>
```

### 2. 使用 next-themes 管理主题
```bash
pnpm add next-themes
```

### 3. 主题只有 light/dark
```typescript
// AppSettings 接口
theme: 'light' | 'dark'  // 不再有 'system'
syncWithSystemTheme: boolean  // 新增
```

---

## 📝 常用代码片段

### 获取当前主题
```tsx
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()
console.log(theme) // 'light' | 'dark'
```

### 切换主题
```tsx
setTheme('dark')  // 切换到深色
setTheme('light') // 切换到浅色
```

### 跟随系统主题
```tsx
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
  ? 'dark' 
  : 'light'
setTheme(systemTheme)
```

### 监听系统主题变化
```tsx
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => {
    if (settings.syncWithSystemTheme) {
      setTheme(e.matches ? 'dark' : 'light')
    }
  }
  mediaQuery.addEventListener('change', handler)
  return () => mediaQuery.removeEventListener('change', handler)
}, [settings.syncWithSystemTheme])
```

---

## 🎨 HeroUI 组件示例

### Button
```tsx
import { Button } from '@heroui/react'

<Button variant="primary">主要按钮</Button>
<Button variant="outline">边框按钮</Button>
<Button onPress={() => console.log('clicked')}>点击</Button>
```

### Switch
```tsx
import { Switch } from '@heroui/react'

<Switch
  isSelected={value}
  onChange={() => setValue(!value)}
  size="sm"
>
  开关标签
</Switch>
```

---

## 🔧 常见问题

### Q1: TypeScript 报错找不到 HeroUIProvider？
**A**: HeroUI v3 不需要 HeroUIProvider，直接使用 ThemeProvider 即可。

### Q2: 如何实现"跟随系统"功能？
**A**: 
1. 添加 `syncWithSystemTheme` 设置项
2. 检测系统主题并调用 `setTheme()`
3. 监听 `prefers-color-scheme` 变化

### Q3: 主题切换时页面闪烁？
**A**: next-themes 自动处理 hydration，确保在 `_app.tsx` 或 `main.tsx` 中正确包裹 ThemeProvider。

### Q4: 如何自定义主题颜色？
**A**: 通过 Tailwind CSS 配置或 HeroUI 主题配置（参考官方文档）。

---

## 📚 文件结构

```
src/
├── components/
│   ├── providers/
│   │   └── ThemeProvider.tsx          # 主题提供者
│   ├── settings/
│   │   └── AppearanceSetting.tsx      # 外观设置组件
│   └── Settings.tsx                   # 主设置页面
├── hooks/
│   └── useAppSettings.ts              # 应用设置 Hook
└── main.tsx                           # 应用入口
```

---

## 🔗 相关链接

- **HeroUI 官方文档**: https://heroui.com/docs
- **next-themes GitHub**: https://github.com/pacocoursey/next-themes
- **完整重构文档**: `HEROUI_V3_THEME_REFACTORING_COMPLETE.md`
- **技术总结**: `THEME_REFACTORING_SUMMARY.md`

---

## 💡 最佳实践

1. **始终使用 next-themes 的 useTheme hook**
   - 不要直接操作 DOM class
   - 让 next-themes 管理状态

2. **主题状态与 AppSettings 保持同步**
   - 主题变化 → 更新设置
   - 设置变化 → 更新主题

3. **避免在服务端渲染时访问 window**
   - 使用 `mounted` 状态检查
   - 或使用 `useEffect` 包裹

4. **提供平滑的主题切换体验**
   - 添加 CSS transitions
   - 避免突然的颜色变化

5. **测试所有主题场景**
   - 手动切换深色/浅色
   - 跟随系统主题
   - 系统主题变化时的响应

---

**最后更新**: 2026-04-23  
**状态**: ✅ 已完成并验证
