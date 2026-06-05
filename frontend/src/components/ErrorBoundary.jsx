import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8 max-w-2xl shadow-sm">
            <div className="rounded-2xl bg-red-100 p-4 w-12 h-12 flex items-center justify-center text-red-600 mx-auto mb-4">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-red-900">Dashboard Loading Error</h2>
            <p className="mt-2 text-sm text-red-700">
              Something went wrong while rendering this section.
            </p>
            <div className="mt-4 text-left bg-white border border-red-100 rounded-2xl p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-red-800 leading-relaxed">
                {this.state.error?.stack || this.state.error?.toString()}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-2xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
