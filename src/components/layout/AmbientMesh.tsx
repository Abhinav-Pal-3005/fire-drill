/** Fixed ambient mesh: four large soft blobs drifting on 60s+ CSS loops. Pure CSS, no images. */
export function AmbientMesh() {
  return (
    <div aria-hidden className="no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />
      <div className="blob blob-d" />
    </div>
  );
}

/** Optional SVG displacement "lens" used by the tab bar and timer. Chromium only; silently ignored elsewhere. */
export function LensFilter() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <filter id="mfd-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="1" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
