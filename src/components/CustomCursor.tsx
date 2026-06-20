"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue } from "framer-motion";

export default function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false);
  const [isInput, setIsInput] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  useEffect(() => {
    // Only activate cursor on PC (devices supporting hover, fine pointer, and screen width >= 1024px)
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
    if (!mediaQuery.matches) return;

    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);

    // Create a style element to hide the browser cursor for standard hover elements,
    // but preserve it for user inputs and text areas for better accessibility.
    const style = document.createElement("style");
    style.innerHTML = `
      body, a, button, [role="button"], .cursor-pointer {
        cursor: none !important;
      }
      input, textarea, select, option, iframe {
        cursor: auto !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      document.body.style.cursor = "auto";
      style.remove();
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

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
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    />
  );
}
