"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/app/App"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading Money Fire Drill">
      <div className="skeleton h-12 w-48 rounded-full" />
    </div>
  ),
});

export default function ClientApp() {
  return <App />;
}
