"use client";

import { BrowserRouter, HashRouter } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { FirebaseProvider } from "@/providers/FirebaseProvider";
import { AppRoutes } from "./router";

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Client-side app root. Loaded without SSR from src/app/[[...slug]]/ClientApp.tsx. */
export default function App() {
  const content = isCapacitorNative() ? (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  ) : (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );

  return (
    <ErrorBoundary>
      <FirebaseProvider>{content}</FirebaseProvider>
    </ErrorBoundary>
  );
}
