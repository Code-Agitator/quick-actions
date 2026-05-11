import { Button, Divider, Select, SelectItem, Slider, Switch } from '@heroui/react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { IoEyeOutline, IoGridOutline, IoLanguageOutline, IoPlayCircleOutline } from 'react-icons/io5'

import { useAppSettings } from '../../hooks/useAppSettings'
import { debounce } from '../../utils/debounce'
import { Theme } from '../providers/ThemeProvider'

// 语言配置
const languages = [
  {
    label: '简体中文',
    value: 'zh-CN',
  },
  {
    label: 'English',
    value: 'en-US',
  },
]

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

  // 当前语言
  const currentLanguage = useMemo(() => {
    try {
      const currentLang = settings.language ?? languages[0].value
      if (!languages.map(({ value }) => value).find((lang) => lang === currentLang)) {
        updateSetting('language', 'zh-CN')
      }
      return new Set([currentLang])
    } catch (error) {
      console.error('[AppearanceSetting] Failed to get current language:', error);
      return new Set([languages[0].value])
    }
  }, [settings.language])

  const changeLanguage = async (language: string) => {
    updateSetting('language', language as 'zh-CN' | 'en-US')
  }

  // 防抖的透明度更新函数（300ms）
  const debouncedUpdateOpacity = useCallback(
    debounce((value: number) => {
      updateSetting('windowOpacity', value)
    }, 300),
    [updateSetting]
  )

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">外观</h1>
        <p className="text-small text-default-500">自定义应用的外观和主题设置</p>
      </div>

      <Divider className="mb-6" />

      {/* 主题设置 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-default-600 dark:text-default-700">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-medium">主题</p>
            <p className="text-small text-default-500">选择应用的主题模式</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <Button
              aria-label="深色主题"
              className="w-[96px] h-[72px] p-0 flex justify-center items-center relative"
              onPress={() => switchTheme(Theme.DARK)}
            >
              <div>
                <DarkThemeIcon />
              </div>
              {theme === Theme.DARK && <CheckIcon className="absolute text-primary" width={20} />}
            </Button>
            <p className="text-tiny text-default-500 mt-2">深色</p>
          </div>
          <div className="flex flex-col items-center">
            <Button
              aria-label="浅色主题"
              className="w-[96px] h-[72px] p-0 flex justify-center items-center relative"
              onPress={() => switchTheme(Theme.LIGHT)}
            >
              <div>
                <LightThemeIcon />
              </div>
              {theme === Theme.LIGHT && <CheckIcon className="absolute text-primary" width={20} />}
            </Button>
            <p className="text-tiny text-default-500 mt-2">浅色</p>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <p className="text-small text-default-600">跟随系统主题</p>
          <div className="ml-auto">
            <Switch
              aria-label="跟随系统主题"
              size="sm"
              color="primary"
              isSelected={settings.syncWithSystemTheme}
              onValueChange={() => toggleSyncWithSystem(!settings.syncWithSystemTheme)}
            />
          </div>
        </div>
      </section>

      <Divider className="mb-6" />

      {/* 语言设置 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
            <IoLanguageOutline className="text-default-600 dark:text-default-700 text-lg" />
          </div>
          <div>
            <p className="font-semibold text-medium">语言</p>
            <p className="text-small text-default-500">选择应用的显示语言</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
          <IoLanguageOutline className="text-xl text-default-500" />
          <Select
            className="flex-1"
            classNames={{ base: '!mt-0' }}
            selectionMode="single"
            selectedKeys={currentLanguage}
            disallowEmptySelection
            items={languages}
            onSelectionChange={(keys) => {
              const key = keys === 'all' ? languages[0].value : Array.from(keys)[0]
              if (key) {
                changeLanguage(String(key))
              }
            }}
          >
            {(language) => <SelectItem key={language.value}>{language.label}</SelectItem>}
          </Select>
        </div>
      </section>

      <Divider className="mb-6" />

      {/* 动画效果设置 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
            <IoPlayCircleOutline className="text-default-600 dark:text-default-700 text-lg" />
          </div>
          <div>
            <p className="font-semibold text-medium">动画效果</p>
            <p className="text-small text-default-500">控制界面过渡动画</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
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

      <Divider className="mb-6" />

      {/* 布局密度设置 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
            <IoGridOutline className="text-default-600 dark:text-default-700 text-lg" />
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
              const key = Array.from(keys)[0] as 'compact' | 'comfortable'
              if (key) {
                updateSetting('layoutDensity', key)
              }
            }}
          >
            <SelectItem key="compact">紧凑</SelectItem>
            <SelectItem key="comfortable">宽松</SelectItem>
          </Select>
        </div>
      </section>

      <Divider className="mb-6" />

      {/* 窗口透明度设置 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
            <IoEyeOutline className="text-default-600 dark:text-default-700 text-lg" />
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
                  debouncedUpdateOpacity(value[0])
                } else {
                  debouncedUpdateOpacity(value)
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
    </div>
  )
}
