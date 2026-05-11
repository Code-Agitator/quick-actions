import { motion } from 'framer-motion';
import { Card, Button } from '@heroui/react';
import { IoCheckmarkCircle, IoCloseCircle, IoWarning, IoInformationCircle, IoClose } from 'react-icons/io5';

/**
 * Toast 通知类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast 数据结构
 */
export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

/**
 * Toast 组件属性
 */
export interface ToastProps {
  /** Toast 数据 */
  toast: ToastData;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 图标映射
 */
const iconMap: Record<ToastType, React.ElementType> = {
  success: IoCheckmarkCircle,
  error: IoCloseCircle,
  warning: IoWarning,
  info: IoInformationCircle,
};

/**
 * 颜色映射（支持亮色和暗色主题）
 */
const colorMap: Record<ToastType, string> = {
  success: 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

/**
 * Toast 通知组件
 * 
 * 显示单个通知消息，支持四种类型（成功、错误、警告、信息）。
 * 使用 Framer Motion 实现进入/退出动画效果。
 * 
 * @param props - 组件属性
 * @returns Toast 通知元素
 */
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
      role="alert"
      aria-live="polite"
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
            aria-label="关闭通知"
          >
            <IoClose className="text-base" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
