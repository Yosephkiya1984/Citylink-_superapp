import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-white">System Anomaly Detected</h1>
            <p className="text-slate-400">The Citylink core has encountered an unexpected state. Defensive protocols have been engaged.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-xl font-bold"
            >
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
