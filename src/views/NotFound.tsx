import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useNavTitle } from "@/components/glass/GlassNavBar";

export default function NotFound() {
  useNavTitle("Not found");
  return (
    <div className="mx-auto flex max-w-[460px] flex-col items-center gap-4 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-st-surface-container text-st-primary shadow-sm">
        <Compass size={30} strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="text-[22px] font-bold text-st-primary">We couldn&apos;t find that page</h1>
      <p className="text-[15px] text-st-on-surface-variant">
        The link may be old or mistyped. Head back home and pick a drill.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex min-h-[46px] items-center justify-center rounded-full bg-st-primary-container px-6 text-[15px] font-semibold text-st-on-primary shadow-sm"
      >
        Back to home
      </Link>
    </div>
  );
}
