import { motion } from 'framer-motion';
import { Button } from '@heroui/react';
import { IoHelpCircle } from 'react-icons/io5';

/**
 * 确认对话框组件属性
 */
export interface ConfirmationDialogProps {
  /** 确认消息 */
  message: string;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

/**
 * 确认对话框组件
 * 
 * 显示模态确认对话框，用于危险操作的二次确认。
 * 支持点击背景或按 Esc 键取消。
 * 使用 Framer Motion 实现淡入淡出动画效果。
 * 
 * @param props - 组件属性
 * @returns 确认对话框元素
 */
export function ConfirmationDialog({ message, onConfirm, onCancel }: ConfirmationDialogProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <IoHelpCircle className="text-2xl text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 id="confirmation-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              确认操作
            </h3>
            <p id="confirmation-message" className="text-sm text-gray-600 dark:text-gray-400">
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
