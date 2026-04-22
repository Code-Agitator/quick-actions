import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
            ⚠️ 出现错误
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            {this.state.error?.message || '未知错误'}
          </p>
          <details className="text-xs text-red-600 dark:text-red-400">
            <summary className="cursor-pointer font-medium">查看详细信息</summary>
            <pre className="mt-2 p-3 bg-white dark:bg-gray-900 rounded overflow-auto max-h-60">
              {this.state.error?.stack}
            </pre>
            <pre className="mt-2 p-3 bg-white dark:bg-gray-900 rounded overflow-auto max-h-60">
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
