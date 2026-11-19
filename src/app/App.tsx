"use client";

import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";

/** Client-side app root. Loaded without SSR from src/app/[[...slug]]/ClientApp.tsx. */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
