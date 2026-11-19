"use client";

import { BrowserRouter, HashRouter } from "react-router-dom";
import { AppRoutes } from "./router";

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

/** Client-side app root. Loaded without SSR from src/app/[[...slug]]/ClientApp.tsx. */
export default function App() {
  if (isCapacitorNative()) {
    return (
      <HashRouter future={routerFuture}>
        <AppRoutes />
      </HashRouter>
    );
  }

  return (
    <BrowserRouter future={routerFuture}>
      <AppRoutes />
    </BrowserRouter>
  );
}
