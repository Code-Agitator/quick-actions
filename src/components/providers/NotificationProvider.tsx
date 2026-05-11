import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast, ToastData } from '../common/Toast';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

/**
 * 确认对话框状态
 */
interface ConfirmationState {
  /** 是否打开 */
  isOpen: boolean;
  /** 确认消息 */
  message: string;
  /** Promise resolve 函数 */
  resolve: (value: boolean) => void;
}

/**
 * 通知提供者组件属性
 */
export interface NotificationProviderProps {
  /** 子组件 */
  children: React.ReactNode;
}

/**
 * 最大同时显示的 Toast 数量
 */
const MAX_TOASTS = 3;

/**
 * Toast 自动消失时间（毫秒）
 */
const TOAST_DURATION = 5000;

/**
 * 通知提供者组件
 * 
 * 全局通知管理器，监听自定义事件并显示 Toast 和确认对话框。
 * 管理通知队列，限制同时显示数量，自动清理过期通知。
 * 
 * @param props - 组件属性
 * @returns 通知提供者元素
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  
  // 使用 ref 存储定时器ID，便于清理
  const timersRef = useRef<Map<string, number>>(new Map());

  /**
   * 移除指定 Toast
   * @param id - Toast ID
   */
  const removeToast = useCallback((id: string) => {
    // 清除对应的定时器
    const timerId = timersRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      timersRef.current.delete(id);
    }
    
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  /**
   * 处理通知事件
   * @param e - 自定义事件
   */
  const handleNotification = useCallback((e: CustomEvent<{ type: string; message: string }>) => {
    const { type, message } = e.detail;
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const newToast: ToastData = {
      id,
      type: type as ToastData['type'],
      message,
      createdAt: Date.now(),
    };
    
    setToasts(prev => {
      const newToasts = [...prev, newToast];
      // 限制最多显示 3 个 Toast
      if (newToasts.length > MAX_TOASTS) {
        return newToasts.slice(-MAX_TOASTS);
      }
      return newToasts;
    });
    
    // 设置自动移除定时器
    const timerId = window.setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION);
    
    timersRef.current.set(id, timerId);
  }, [removeToast]);

  /**
   * 处理确认对话框事件
   * @param e - 自定义事件
   */
  const handleConfirmation = useCallback((e: CustomEvent<{ message: string; resolve: (value: boolean) => void }>) => {
    const { message, resolve } = e.detail;
    setConfirmation({ isOpen: true, message, resolve });
  }, []);

  /**
   * 处理确认操作
   */
  const handleConfirm = useCallback(() => {
    if (confirmation) {
      confirmation.resolve(true);
      setConfirmation(null);
    }
  }, [confirmation]);

  /**
   * 处理取消操作
   */
  const handleCancel = useCallback(() => {
    if (confirmation) {
      confirmation.resolve(false);
      setConfirmation(null);
    }
  }, [confirmation]);

  // 监听事件
  useEffect(() => {
    window.addEventListener('show-notification', handleNotification as EventListener);
    window.addEventListener('show-confirmation', handleConfirmation as EventListener);
    
    return () => {
      window.removeEventListener('show-notification', handleNotification as EventListener);
      window.removeEventListener('show-confirmation', handleConfirmation as EventListener);
      
      // 组件卸载时清除所有定时器
      timersRef.current.forEach((timerId) => {
        clearTimeout(timerId);
      });
      timersRef.current.clear();
    };
  }, [handleNotification, handleConfirmation]);

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
}
