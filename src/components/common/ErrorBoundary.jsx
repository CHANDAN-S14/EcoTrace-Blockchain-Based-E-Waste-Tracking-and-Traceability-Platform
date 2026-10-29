import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[EcoTrace ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        })
      }

      return (
        <div className="bg-white rounded-2xl p-6 border border-[#F8B4B4] bg-[#FDF2F2]/30 shadow-xs space-y-3 my-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FDF2F2] flex items-center justify-center text-[#D94F4F] shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-[#003B23]">
                {this.props.title || 'Component Display Error'}
              </h3>
              <p className="text-xs text-[#66756D] mt-0.5">
                {this.props.message ||
                  'This section encountered an unexpected issue while rendering. The rest of the application remains available.'}
              </p>
              {this.state.error?.message && (
                <div className="p-2.5 bg-white rounded-lg border border-[#E3EAE5] mt-2 font-mono text-[11px] text-[#D94F4F] break-all">
                  {this.state.error.message}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end pt-2 border-t border-[#E3EAE5]">
            <button
              onClick={this.handleReset}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#176B45] bg-white hover:bg-[#E8F5EE] border border-[#C2E3D0] rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
