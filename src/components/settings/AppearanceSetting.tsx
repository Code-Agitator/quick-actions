import { Button, Switch } from '@heroui/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { useAppSettings } from '../../hooks/useAppSettings'
import { Theme } from '../providers/ThemeProvider'

// 主题图标组件
function LightThemeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#F5F5F5" />
      <circle cx="24" cy="20" r="6" fill="#FFD93D" />
      <path d="M24 8V10M24 30V32M12 20H10M38 20H36M15.5 13.5L14 12M34 28L32.5 26.5M15.5 26.5L14 28M34 12L32.5 13.5" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="32" width="28" height="8" rx="2" fill="#E0E0E0" />
    </svg>
  )
}

function DarkThemeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#2A2A2A" />
      <path d="M26 10C20.477 10 16 14.477 16 20C16 25.523 20.477 30 26 30C27.5 30 28.9 29.7 30 29.1C27.5 27.5 26 24.9 26 22C26 17.6 29.6 14 34 14C34.9 14 35.8 14.2 36.6 14.5C34.5 11.9 31.4 10 26 10Z" fill="#FFD93D" />
      <circle cx="36" cy="12" r="1.5" fill="#FFD93D" />
      <circle cx="38" cy="18" r="1" fill="#FFD93D" />
      <rect x="10" y="32" width="28" height="8" rx="2" fill="#3A3A3A" />
    </svg>
  )
}

function CheckIcon({ className = '', width = 20 }: { className?: string; width?: number }) {
  return (
    <svg 
      width={width} 
      height={width} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function AppearanceSetting() {
  const { theme, setTheme } = useTheme() as { theme: Theme; setTheme: (theme: Theme) => void }
  const { settings, updateSetting, updateSettings } = useAppSettings()
  const [mounted, setMounted] = useState(false)

  // 等待组件挂载，避免 hydration 不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  const switchTheme = (newTheme: Theme) => {
    // 关闭跟随系统
    if (settings.syncWithSystemTheme) {
      updateSettings({ syncWithSystemTheme: false })
    }
    setTheme(newTheme)
  }

  const toggleSyncWithSystem = (sync: boolean) => {
    updateSettings({ syncWithSystemTheme: sync })
    if (sync) {
      // 立即同步系统主题
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT
      setTheme(systemTheme)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* 主题设置 */}
      <section>
        <div>
          <p className="font-bold text-large text-gray-900 dark:text-gray-100">主题</p>
        </div>

        {/* 跟随系统开关 */}
        <div className="mt-4 flex items-center">
          <p className="text-default-700 text-gray-700 dark:text-gray-300">跟随系统</p>
          <div className="ml-auto flex gap-4">
            <Switch
              aria-label="跟随系统主题"
              size="sm"
              isSelected={settings.syncWithSystemTheme}
              onChange={() => toggleSyncWithSystem(!settings.syncWithSystemTheme)}
            />
          </div>
        </div>

        {/* 主题选择按钮 */}
        <div className="mt-4 flex items-center">
          <p className="text-default-700 text-gray-700 dark:text-gray-300">切换主题</p>
          <div className="ml-auto flex gap-3">
            {/* 深色主题 */}
            <div className="flex flex-col items-center">
              <Button
                aria-label="深色主题"
                className="w-[96px] h-[72px] p-0 flex justify-center items-center relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all"
                onPress={() => switchTheme(Theme.DARK)}
              >
                <div>
                  <DarkThemeIcon />
                </div>
                {theme === Theme.DARK && (
                  <CheckIcon className="absolute text-primary" width={20} />
                )}
              </Button>
              <span className="mt-2 text-xs text-gray-600 dark:text-gray-400">深色</span>
            </div>

            {/* 浅色主题 */}
            <div className="flex flex-col items-center">
              <Button
                aria-label="浅色主题"
                className="w-[96px] h-[72px] p-0 flex justify-center items-center relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all"
                onPress={() => switchTheme(Theme.LIGHT)}
              >
                <div>
                  <LightThemeIcon />
                </div>
                {theme === Theme.LIGHT && (
                  <CheckIcon className="absolute text-primary" width={20} />
                )}
              </Button>
              <span className="mt-2 text-xs text-gray-600 dark:text-gray-400">浅色</span>
            </div>
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="my-6 h-px bg-gray-200 dark:bg-gray-700" />

      {/* 其他外观设置 */}
      <section>
        <div>
          <p className="font-bold text-large text-gray-900 dark:text-gray-100">其他设置</p>
        </div>

        {/* 启用动画 */}
        <div className="mt-4 flex items-center">
          <p className="text-default-700 text-gray-700 dark:text-gray-300">启用动画效果</p>
          <div className="ml-auto">
            <Switch
              aria-label="启用动画"
              size="sm"
              isSelected={settings.enableAnimations}
              onChange={() => updateSetting('enableAnimations', !settings.enableAnimations)}
            />
          </div>
        </div>

        {/* 布局密度 */}
        <div className="mt-4 flex items-center">
          <p className="text-default-700 text-gray-700 dark:text-gray-300">布局密度</p>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant={settings.layoutDensity === 'compact' ? 'primary' : 'outline'}
              onPress={() => updateSetting('layoutDensity', 'compact')}
            >
              紧凑
            </Button>
            <Button
              size="sm"
              variant={settings.layoutDensity === 'comfortable' ? 'primary' : 'outline'}
              onPress={() => updateSetting('layoutDensity', 'comfortable')}
            >
              宽松
            </Button>
          </div>
        </div>

        {/* 窗口透明度 */}
        <div className="mt-4 flex items-center">
          <p className="text-default-700 text-gray-700 dark:text-gray-300">
            窗口透明度: {Math.round(settings.windowOpacity * 100)}%
          </p>
          <div className="ml-auto w-48">
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.01"
              value={settings.windowOpacity}
              onChange={(e) => updateSetting('windowOpacity', parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
