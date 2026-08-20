import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Catches render errors and shows a fallback UI instead of a blank page */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
          <div className="max-w-md w-full rounded-lg border border-amber-200 bg-amber-50/80 p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {this.props.fallbackTitle ?? "Something went wrong"}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {this.props.fallbackMessage ?? "This page could not be loaded."}
            </p>
            <p className="text-xs text-gray-500 font-mono mb-4 break-all">
              {this.state.error.message}
            </p>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
