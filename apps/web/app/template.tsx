/**
 * Route transition wrapper. Next.js re-mounts this template on every
 * navigation, so the `dg-page-enter` animation replays on each page —
 * giving the whole site a consistent, smooth entrance. The animation is
 * GPU-friendly (opacity + transform only) and disabled under
 * prefers-reduced-motion via the global media query in globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="dg-page-enter">{children}</div>;
}
