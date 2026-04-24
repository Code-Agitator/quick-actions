import { ThemeProvider as NextThemesProvider, ThemeProviderProps, useTheme, UseThemeProps } from 'next-themes'
import { ReactElement, useEffect, useMemo } from 'react'

import { useAppSettings } from '../../hooks/useAppSettings'

type ContentProps = { children: ReactElement }

export enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
}

function Content({ children }: ContentProps) {
  const { theme, setTheme } = useTheme() as { theme: Theme } & UseThemeProps
  const { settings, updateSettings } = useAppSettings()

  // 当主题变化时，同步到设置
  useEffect(() => {
    if (theme && theme !== settings.theme) {
      updateSettings({ theme })
    }
  }, [theme])

  // 当"跟随系统"设置变化时，更新主题
  useEffect(() => {
    if (settings.syncWithSystemTheme) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT
      setTheme(systemTheme)
    }
  }, [settings.syncWithSystemTheme])

  // 监听系统主题变化
  const handleSystemThemeChange = useMemo(
    () =>
      ({ matches }: MediaQueryListEvent) => {
        if (settings.syncWithSystemTheme) {
          setTheme(matches ? Theme.DARK : Theme.LIGHT)
        }
      },
    [settings.syncWithSystemTheme],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [handleSystemThemeChange])

  return children
}

const ThemeProvider = ({ children, ...props }: ThemeProviderProps & ContentProps) => (
  <NextThemesProvider attribute="class" defaultTheme="light" {...props}>
    <Content>{children}</Content>
  </NextThemesProvider>
)

export default ThemeProvider
export { useTheme }
