"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValue } from "framer-motion";

const CURSOR_STYLE_ID = "ntg-custom-cursor-style";

export default function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false);
  const [isInput, setIsInput] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const pathname = usePathname();
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const lastPos = useRef({ x: -100, y: -100 });
  const isVisibleRef = useRef(false);

  const excludedPaths = ["/login", "/signup", "/profile", "/admin"];
  const isExcluded = excludedPaths.some((path) => pathname?.startsWith(path));

  // Only hide the native cursor while the custom dot is actually visible.
  useEffect(() => {
    if (!isActive || isExcluded) return;

    let style = document.getElementById(CURSOR_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = CURSOR_STYLE_ID;
      document.head.appendChild(style);
    }

    if (isVisible) {
      style.textContent = `
        * {
          cursor: none !important;
        }
        input, textarea, select, option, iframe {
          cursor: auto !important;
        }
      `;
    } else {
      style.textContent = "";
    }

    return () => {
      style?.remove();
    };
  }, [isActive, isExcluded, isVisible]);

  useEffect(() => {
    if (isExcluded) return;

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
    if (!mediaQuery.matches) return;

    setIsActive(true);

    const syncPosition = (x: number, y: number) => {
      lastPos.current = { x, y };
      cursorX.set(x);
      cursorY.set(y);
    };

    const showCursorAt = (x: number, y: number) => {
      if (document.hidden) return;
      syncPosition(x, y);
      isVisibleRef.current = true;
      setIsVisible(true);
    };

    const showCursorFromLast = () => {
      if (document.hidden) return;
      syncPosition(lastPos.current.x, lastPos.current.y);
      isVisibleRef.current = true;
      setIsVisible(true);
    };

    const hideCursor = () => {
      isVisibleRef.current = false;
      setIsVisible(false);
      setIsHovered(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      syncPosition(e.clientX, e.clientY);
      if (!isVisibleRef.current) showCursorAt(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      syncPosition(e.clientX, e.clientY);
      if (!isVisibleRef.current) showCursorAt(e.clientX, e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInteractive =
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("cursor-pointer") ||
        target.getAttribute("role") === "button";

      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.isContentEditable;

      setIsHovered(!!isInteractive);
      setIsInput(!!isInputField);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideCursor();
      } else {
        showCursorFromLast();
      }
    };

    const handleWindowFocus = () => showCursorFromLast();
    const handleDocumentMouseEnter = (e: MouseEvent) => showCursorAt(e.clientX, e.clientY);
    const handlePointerEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      showCursorAt(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("mouseleave", hideCursor);
    document.addEventListener("mouseenter", handleDocumentMouseEnter);
    document.addEventListener("pointerleave", hideCursor);
    document.addEventListener("pointerenter", handlePointerEnter);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("mouseleave", hideCursor);
      document.removeEventListener("mouseenter", handleDocumentMouseEnter);
      document.removeEventListener("pointerleave", hideCursor);
      document.removeEventListener("pointerenter", handlePointerEnter);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.getElementById(CURSOR_STYLE_ID)?.remove();
      setIsActive(false);
      setIsVisible(false);
    };
  }, [cursorX, cursorY, isExcluded]);

  // Restore custom cursor after in-app navigation without waiting for mousemove.
  useEffect(() => {
    if (isExcluded || !isActive || document.hidden) return;
    isVisibleRef.current = true;
    setIsVisible(true);
  }, [pathname, isExcluded, isActive]);

  if (isExcluded || !isActive || !isVisible) return null;

  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        borderRadius: "50%",
        backgroundColor: "white",
        mixBlendMode: "difference",
        pointerEvents: "none",
        zIndex: 999999,
        x: cursorX,
        y: cursorY,
        translateX: "-50%",
        translateY: "-50%",
        display: isInput ? "none" : "block",
      }}
      animate={{
        width: isHovered ? 48 : 18,
        height: isHovered ? 48 : 18,
      }}
      transition={{
        width: { type: "spring", stiffness: 300, damping: 25 },
        height: { type: "spring", stiffness: 300, damping: 25 },
      }}
    />
  );
}
