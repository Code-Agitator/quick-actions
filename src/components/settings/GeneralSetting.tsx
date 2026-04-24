import { Button, Divider, Switch } from '@heroui/react'
import { IoRocketOutline, IoDesktopOutline, IoKeyOutline, IoRefreshOutline } from 'react-icons/io5'

import { useAppSettings } from '../../hooks/useAppSettings'

export default function GeneralSetting() {
  const { settings, updateSetting, resetSettings } = useAppSettings()

  const restoreSettings = async () => {
    if (window.confirm('确定要重置所有设置为默认值吗？')) {
      resetSettings()
    }
  }

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
          <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
            <IoKeyOutline className="text-xl text-default-500" />
            <div className="flex-1">
              <p className="text-small text-default-600">全局快捷键</p>
              <p className="text-tiny text-default-500 mt-0.5">当前: {settings.globalShortcut}</p>
            </div>
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
