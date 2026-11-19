"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || "An unexpected error occurred.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application ErrorBoundary caught error:", error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: "" });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-st-surface px-4 py-8 text-st-on-surface">
        <div className="w-full max-w-[440px] space-y-4 rounded-[28px] bg-st-surface-container p-6 text-center shadow-lg">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-st-error-container text-st-error">
            <AlertTriangle size={24} aria-hidden />
          </div>
          <h1 className="text-[20px] font-bold text-st-on-surface">Something went wrong</h1>
          <p className="text-[13px] leading-relaxed text-st-on-surface-variant">
            {this.state.message.startsWith("{")
              ? "A database permission or sync error occurred. Please verify your sign-in session and try again."
              : this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-st-primary-container px-5 text-[14px] font-semibold text-st-on-primary shadow-sm transition-transform active:scale-[0.98]"
          >
            <RotateCcw size={16} aria-hidden />
            <span>Reload app</span>
          </button>
        </div>
      </div>
    );
  }
}
