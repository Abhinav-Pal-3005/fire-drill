import ClientApp from "./ClientApp";

// The whole product is a client-side React Router app (see src/app/App.tsx).
// This catch-all route lets every deep link (e.g. /library/upi-01) load it.
export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function CatchAllPage() {
  return <ClientApp />;
}
