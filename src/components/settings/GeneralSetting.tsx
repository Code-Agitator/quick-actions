import { Button, Divider, Switch, Kbd } from '@heroui/react'
import { IoRocketOutline, IoDesktopOutline, IoKeyOutline, IoRefreshOutline } from 'react-icons/io5'
import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'

import { useAppSettings } from '../../hooks/useAppSettings'
import { confirmAction, showSuccess, showError, showWarning, showInfo } from '../../utils/notifications'

export default function GeneralSetting() {
  const { settings, updateSetting, resetSettings } = useAppSettings()

  // 快捷键录制状态
  const [isRecording, setIsRecording] = useState(false)
  const [currentKeys, setCurrentKeys] = useState<string>('')
  const [pendingShortcut, setPendingShortcut] = useState<string>('')

  const restoreSettings = async () => {
    const confirmed = await confirmAction('确定要重置所有设置为默认值吗？')
    if (confirmed) {
      resetSettings()
      showSuccess('设置已重置为默认值')
    }
  }

  /**
   * 验证快捷键是否有效
   */
  const isValidShortcut = useCallback((shortcut: string): boolean => {
    // 至少需要一个修饰键
    const hasModifier = /(Ctrl|Alt|Shift|Meta)/.test(shortcut)
    
    // 不能只是修饰键
    const parts = shortcut.split('+')
    const hasMainKey = parts.length > 1
    
    // 黑名单：禁止某些组合（如 Ctrl+Alt+Delete）
    const blacklist = ['Ctrl+Alt+Delete', 'Ctrl+Alt+Esc']
    const isBlacklisted = blacklist.includes(shortcut)
    
    return hasModifier && hasMainKey && !isBlacklisted
  }, [])

  /**
   * 格式化键名
   */
  const formatKeyName = useCallback((key: string): string => {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'Escape': 'Esc',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
    }
    return keyMap[key] || key
  }, [])

  /**
   * 开始录制快捷键
   */
  const startRecording = useCallback(() => {
    setIsRecording(true)
    setCurrentKeys('')
    setPendingShortcut('')
    showInfo('请按下您想要设置的快捷键组合')
  }, [])

  /**
   * 取消录制
   */
  const cancelRecording = useCallback(() => {
    setIsRecording(false)
    setCurrentKeys('')
    setPendingShortcut('')
  }, [])

  /**
   * 保存快捷键
   */
  const saveShortcut = useCallback(async () => {
    if (!pendingShortcut || !isValidShortcut(pendingShortcut)) {
      showError('无效的快捷键组合')
      return
    }

    try {
      // 调用后端命令
      await invoke('update_global_shortcut', { 
        shortcut: pendingShortcut 
      })
      
      // 直接更新 localStorage，确保立即生效
      const settingsStr = localStorage.getItem('quick-actions-settings')
      if (settingsStr) {
        const settings = JSON.parse(settingsStr)
        settings.globalShortcut = pendingShortcut
        localStorage.setItem('quick-actions-settings', JSON.stringify(settings))
      }
      
      // 同时更新 React state
      updateSetting('globalShortcut', pendingShortcut)
      
      // 显示成功提示
      showSuccess(`快捷键已更新为 ${pendingShortcut}`)
      
      // 退出录制模式
      setIsRecording(false)
    } catch (error) {
      console.error('Failed to update shortcut:', error)
      
      // 区分不同类型的错误
      const errorMessage = String(error)
      if (errorMessage.includes('command not found')) {
        showError('后端命令未实现，请联系开发者')
      } else if (errorMessage.includes('timeout')) {
        showError('请求超时，请重试')
      } else {
        showError('快捷键设置失败，请重试')
      }
    }
  }, [pendingShortcut, isValidShortcut, updateSetting])

  // 键盘事件监听
  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // 收集修饰键
      const modifiers: string[] = []
      if (e.ctrlKey) modifiers.push('Ctrl')
      if (e.altKey) modifiers.push('Alt')
      if (e.shiftKey) modifiers.push('Shift')
      if (e.metaKey) modifiers.push('Meta') // macOS Command

      // 获取主键
      let mainKey = e.key
      
      // 特殊键名映射
      mainKey = formatKeyName(mainKey)

      // 忽略单独的修饰键
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return
      }

      // 构建快捷键字符串
      const shortcut = [...modifiers, mainKey].join('+')
      setCurrentKeys(shortcut)
      setPendingShortcut(shortcut)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording, formatKeyName])

  // 焦点丢失时自动取消录制
  useEffect(() => {
    if (!isRecording) return

    const handleBlur = () => {
      cancelRecording()
      showWarning('窗口失去焦点，已取消快捷键设置')
    }

    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [isRecording, cancelRecording])

  // 点击外部区域时取消录制
  useEffect(() => {
    if (!isRecording) return

    const handleClickOutside = (e: MouseEvent) => {
      // 如果点击的不是快捷键编辑区域，取消录制
      const target = e.target as HTMLElement
      if (!target.closest('.shortcut-editor')) {
        cancelRecording()
        showWarning('已取消快捷键设置')
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isRecording, cancelRecording])

  return (
    <div className="flex flex-col">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">通用</h1>
        <p className="text-small text-default-500">管理应用的基本设置和偏好</p>
      </div>

      <Divider className="mb-6" />

      {/* 窗口设置 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
            <IoDesktopOutline className="text-default-600 dark:text-default-700 text-lg" />
          </div>
          <div>
            <p className="font-semibold text-medium">窗口</p>
            <p className="text-small text-default-500">配置应用窗口的行为</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
            <IoRocketOutline className="text-xl text-default-500" />
            <div className="flex-1">
              <p className="text-small text-default-600">开机自动启动</p>
            </div>
            <Switch
              aria-label="开机自动启动"
              size="sm"
              color="primary"
              isSelected={settings.autoStart}
              onValueChange={(v) => updateSetting('autoStart', v)}
            />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
            <IoDesktopOutline className="text-xl text-default-500" />
            <div className="flex-1">
              <p className="text-small text-default-600">显示托盘图标</p>
              <p className="text-tiny text-default-500 mt-0.5">如果禁用，关闭窗口时应用将退出</p>
            </div>
            <Switch
              aria-label="显示托盘图标"
              size="sm"
              color="primary"
              isSelected={settings.showTrayIcon}
              onValueChange={(v) => updateSetting('showTrayIcon', v)}
            />
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg bg-default-100 shortcut-editor ${isRecording ? 'border-2 border-primary' : ''}`}>
            <IoKeyOutline className={`text-xl ${isRecording ? 'text-primary' : 'text-default-500'}`} />
            {!isRecording ? (
              <>
                <div className="flex-1">
                  <p className="text-small text-default-600">全局快捷键</p>
                  <p className="text-tiny text-default-500 mt-0.5">
                    当前: <Kbd>{settings.globalShortcut}</Kbd>
                  </p>
                </div>
                <Button size="sm" variant="flat" onPress={startRecording}>
                  修改
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-small text-default-600">请按下新的快捷键</p>
                  <p className="text-tiny text-default-500 mt-0.5">
                    当前按下: <Kbd>{currentKeys || '等待按键...'}</Kbd>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="flat" onPress={cancelRecording}>
                    取消
                  </Button>
                  <Button 
                    size="sm" 
                    color="primary" 
                    onPress={saveShortcut} 
                    isDisabled={!pendingShortcut || !isValidShortcut(pendingShortcut)}
                  >
                    保存
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <Divider className="mb-6" />

      {/* 配置管理 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
            <IoRefreshOutline className="text-default-600 dark:text-default-700 text-lg" />
          </div>
          <div>
            <p className="font-semibold text-medium">配置</p>
            <p className="text-small text-default-500">管理应用配置</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
          <IoRefreshOutline className="text-xl text-default-500" />
          <div className="flex-1">
            <p className="text-small text-default-600">恢复默认设置</p>
            <p className="text-tiny text-default-500 mt-0.5">将所有设置恢复为默认值</p>
          </div>
          <Button variant="flat" color="danger" size="sm" onPress={restoreSettings}>
            恢复设置
          </Button>
        </div>
      </section>
    </div>
  )
}
