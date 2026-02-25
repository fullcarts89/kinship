/**
 * ErrorBoundary
 *
 * Catches unexpected render errors across the app and shows a
 * full-screen fallback UI with a "Restart" button.
 */

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text } from "react-native";
import { colors } from "@design/tokens";
import { ErrorState } from "./ui/ErrorState";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log for crash reporting integration
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-cream items-center justify-center">
          <ErrorState
            message="Something unexpected happened"
            onRetry={this.handleReset}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
