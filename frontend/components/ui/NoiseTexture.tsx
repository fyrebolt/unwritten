export function NoiseTexture() {
  // Inline SVG with feTurbulence — scaled up, low opacity, multiply blend.
  // Fixed position so it never moves during scroll (applied in globals.css).
  return (
    <svg
      aria-hidden="true"
      className="paper-grain"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="paper-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.82"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix
          values="0 0 0 0 0.10
                  0 0 0 0 0.10
                  0 0 0 0 0.09
                  0 0 0 0.35 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-noise)" />
    </svg>
  );
}
