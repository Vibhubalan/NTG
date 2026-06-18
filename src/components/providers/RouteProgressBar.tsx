"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function RouteProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<number | null>(null);
  const pathRef = useRef(pathname);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function start() {
    clearTimer();
    setActive(true);
    setWidth(14);
    timerRef.current = window.setInterval(() => {
      setWidth((current) => (current >= 88 ? current : current + Math.random() * 10));
    }, 220);
  }

  function finish() {
    clearTimer();
    setWidth(100);
    window.setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 200);
  }

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor?.href) return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin) return;

      const nextPath = `${next.pathname}${next.search}`;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (nextPath === currentPath) return;

      start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    if (active) finish();
  }, [pathname, active]);

  useEffect(() => () => clearTimer(), []);

  if (!active && width === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[2px]"
      role="progressbar"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-iris)] to-cyan-400 shadow-[0_0_12px_rgba(94,234,212,0.55)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
