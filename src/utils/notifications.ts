/**
 * 统一的通知工具函数
 * 
 * 提供友好的用户反馈，替代原生 alert/confirm。
 */

/**
 * 显示成功通知
 */
export function showSuccess(message: string) {
  // 使用自定义事件触发全局通知
  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: { type: 'success', message }
  }));
  
  console.log(`✅ ${message}`);
}

/**
 * 显示错误通知
 */
export function showError(message: string) {
  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: { type: 'error', message }
  }));
  
  console.error(`❌ ${message}`);
}

/**
 * 显示警告通知
 */
export function showWarning(message: string) {
  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: { type: 'warning', message }
  }));
  
  console.warn(`⚠️ ${message}`);
}

/**
 * 显示信息通知
 */
export function showInfo(message: string) {
  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: { type: 'info', message }
  }));
  
  console.log(`ℹ️ ${message}`);
}

/**
 * 确认对话框（返回 Promise）
 */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 触发自定义事件，由全局通知组件处理
    const event = new CustomEvent('show-confirmation', {
      detail: { message, resolve }
    });
    window.dispatchEvent(event);
  });
}
