import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Copy, Bug } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Vibe Engineering: Global & Local Error Boundary
 * Prevents "White Screen of Death" by catching localized errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`🔴 Error in Boundary [${this.props.name || 'Global'}]:`, error, errorInfo);

    // Log to console for dev
    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed('Error Details');
      console.log(error.message);
      console.log(errorInfo.componentStack);
      console.groupEnd();
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleCopyError = () => {
    const errorText = `Error in ${this.props.name || 'Global'}:\n${this.state.error?.message}\n\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(errorText);
    toast.success('تم نسخ تفاصيل الخطأ');
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-4 min-h-[300px] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 rounded-full bg-red-500/10 ring-1 ring-red-500/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-bold text-white">عذراً، حدث خطأ ما</h3>
            <p className="text-sm text-gray-400">
              {this.props.name
                ? `حدث خطأ في مكون "${this.props.name}". يمكنك المحاولة مرة أخرى.`
                : 'حدث خطأ غير متوقع، لكن باقي النظام يعمل بشكل سليم.'}
            </p>
          </div>

          {/* Error Details (Dev Mode Only or Expanded) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="w-full max-w-lg mt-4 p-3 bg-black/40 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono text-red-300 border border-red-500/20">
              <p className="font-bold border-b border-red-500/20 pb-1 mb-1">
                {this.state.error.toString()}
              </p>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={this.handleReset}
              className="flex items-center space-x-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-medium shadow-lg shadow-red-500/20 active:scale-95"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>

            <button
              onClick={this.handleCopyError}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all font-medium border border-white/10 active:scale-95"
              title="نسخ تفاصيل الخطأ"
            >
              <Copy className="w-4 h-4" />
            </button>

            {process.env.NODE_ENV === 'development' && (
              <button
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all font-medium border border-white/10 active:scale-95"
                title="Report Bug"
              >
                <Bug className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
