import React from 'react'

interface RootErrorBoundaryState {
  error: Error | null
}

export class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Root render error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
          <div>
            <h1 className="text-xl font-medium text-foreground">Something went wrong.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Refresh the page to try again.</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
