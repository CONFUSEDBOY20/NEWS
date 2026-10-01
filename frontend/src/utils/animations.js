/**
 * TruthLens Centralized Animation System
 *
 * Timing tiers:
 *  - MICRO    150–200ms  (button hover, input focus, icon)
 *  - COMPONENT 200–350ms (card entrance, dropdown, modal, filter)
 *  - PAGE      300–500ms (page entrance, report sections, major changes)
 *
 * All hooks respect prefers-reduced-motion automatically.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────
// 1. REDUCED MOTION DETECTION
// ─────────────────────────────────────────────

/**
 * Returns true if the user has requested reduced motion.
 * Subscribes to changes (e.g. system preference toggled at runtime).
 */
export function usePrefersReducedMotion() {
  const mql = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const [reduced, setReduced] = useState(mql?.matches ?? false);

  useEffect(() => {
    if (!mql) return;
    const handler = (e) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mql]);

  return reduced;
}

// ─────────────────────────────────────────────
// 2. INTERSECTION OBSERVER – scroll-triggered entrance
// ─────────────────────────────────────────────

/**
 * useInView — triggers once when element enters the viewport.
 * Returns [ref, isInView].
 *
 * @param {object} options
 * @param {number}  options.threshold   - 0–1, default 0.12
 * @param {boolean} options.triggerOnce - default true
 * @param {string}  options.rootMargin  - default "0px"
 */
export function useInView({
  threshold = 0.12,
  triggerOnce = true,
  rootMargin = "0px",
} = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    // If reduced motion → show immediately, no animation needed
    if (reduced) {
      setIsInView(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, triggerOnce, rootMargin, reduced]);

  return [ref, isInView];
}

// ─────────────────────────────────────────────
// 3. STAGGERED LIST ENTRANCE
// ─────────────────────────────────────────────

/**
 * useStaggeredList — returns a function getItemStyle(index) that produces
 * inline style for staggered list animations.
 *
 * @param {boolean} visible   - whether the list should be visible
 * @param {number}  stagger   - delay between items in ms (default 60)
 * @param {number}  duration  - animation duration in ms (default 300)
 */
export function useStaggeredList(visible, stagger = 60, duration = 300) {
  const reduced = usePrefersReducedMotion();

  const getItemStyle = useCallback(
    (index) => {
      if (reduced) return {};
      return {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${index * stagger}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${index * stagger}ms`,
        willChange: "opacity, transform",
      };
    },
    [visible, stagger, duration, reduced]
  );

  return getItemStyle;
}

// ─────────────────────────────────────────────
// 4. COUNT-UP ANIMATION (viewport triggered)
// ─────────────────────────────────────────────

/**
 * useCountUp — animates a number from 0 to targetNumber when scrolled into view.
 * Returns [ref, currentCount].
 *
 * @param {number} targetNumber
 * @param {number} duration     - ms (default 1400)
 */
export function useCountUp(targetNumber, duration = 1400) {
  const [count, setCount] = useState(0);
  const [ref, isInView] = useInView({ threshold: 0.2, triggerOnce: true });
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (reduced) {
      setCount(targetNumber);
      return;
    }
    let startTime = null;
    let raf;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(easeOutCubic(progress) * targetNumber));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setCount(targetNumber);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isInView, targetNumber, duration, reduced]);

  return [ref, count];
}

// ─────────────────────────────────────────────
// 5. EXPAND / COLLAPSE (Accordion)
// ─────────────────────────────────────────────

/**
 * useExpandCollapse — animates a panel open/close using max-height.
 * Returns { contentRef, style, isOpen, toggle }.
 *
 * @param {boolean} initialOpen
 */
export function useExpandCollapse(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const contentRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  const style = reduced
    ? { overflow: "hidden", display: isOpen ? "block" : "none" }
    : {
        overflow: "hidden",
        maxHeight: isOpen ? `${contentRef.current?.scrollHeight ?? 2000}px` : "0px",
        opacity: isOpen ? 1 : 0,
        transition:
          "max-height 300ms cubic-bezier(0.16,1,0.3,1), opacity 250ms ease",
        willChange: "max-height, opacity",
      };

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return { contentRef, style, isOpen, toggle, setIsOpen };
}

// ─────────────────────────────────────────────
// 6. MODAL / OVERLAY ANIMATION
// ─────────────────────────────────────────────

/**
 * useModalAnimation — drives mount/unmount with entrance + exit animations.
 * Returns { shouldRender, backdropStyle, panelStyle }.
 *
 * @param {boolean} isOpen
 * @param {number}  duration - ms (default 250)
 */
export function useModalAnimation(isOpen, duration = 250) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animating, setAnimating] = useState(isOpen);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Next tick so the initial style is applied before transitioning
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setShouldRender(false), reduced ? 0 : duration);
      return () => clearTimeout(t);
    }
  }, [isOpen, duration, reduced]);

  const backdropStyle = reduced
    ? { opacity: animating ? 1 : 0 }
    : {
        opacity: animating ? 1 : 0,
        transition: `opacity ${duration}ms ease`,
        willChange: "opacity",
      };

  const panelStyle = reduced
    ? {}
    : {
        opacity: animating ? 1 : 0,
        transform: animating ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1), transform ${duration}ms cubic-bezier(0.16,1,0.3,1)`,
        willChange: "opacity, transform",
      };

  return { shouldRender, backdropStyle, panelStyle };
}

// ─────────────────────────────────────────────
// 7. VERIFICATION STAGE LABELS (tied to real state)
// ─────────────────────────────────────────────

/**
 * getVerificationStageLabel — maps actual pipeline stage (0–4) to
 * a user-facing label. These correspond to real backend operations,
 * not fake delays.
 *
 * Stage 0: reading + ingesting input
 * Stage 1: extracting claims
 * Stage 2: searching evidence sources
 * Stage 3: comparing reports
 * Stage 4: synthesizing result
 */
export function getVerificationStageLabel(stage, submissionType = "text") {
  const imageLabels = [
    "Reading image metadata…",
    "Extracting text content…",
    "Searching evidence sources…",
    "Comparing reports…",
    "Preparing result…",
  ];
  const textLabels = [
    "Reading claim…",
    "Extracting factual claims…",
    "Searching evidence sources…",
    "Comparing reports…",
    "Preparing result…",
  ];
  const urlLabels = [
    "Fetching article…",
    "Extracting claims…",
    "Searching evidence sources…",
    "Comparing reports…",
    "Preparing result…",
  ];

  const labels =
    submissionType === "image"
      ? imageLabels
      : submissionType === "url"
      ? urlLabels
      : textLabels;

  return labels[Math.min(stage, labels.length - 1)];
}

// ─────────────────────────────────────────────
// 8. CSS CLASS HELPERS
// ─────────────────────────────────────────────

/**
 * Timing tokens — use as Tailwind duration values or inline style ms values.
 */
export const TIMING = {
  micro: 150,       // button hover, icon
  microSlow: 200,   // input focus, tooltip
  component: 250,   // card entrance, dropdown
  componentSlow: 350, // modal, accordion, filter
  page: 400,        // page entrance, major content change
  pageSlow: 500,    // report section reveal
};

/**
 * Easing curves — use in inline transition styles.
 */
export const EASE = {
  spring:   "cubic-bezier(0.16, 1, 0.3, 1)",   // snappy spring
  smooth:   "cubic-bezier(0.4, 0, 0.2, 1)",    // material smooth
  enter:    "cubic-bezier(0, 0, 0.2, 1)",       // fast enter
  exit:     "cubic-bezier(0.4, 0, 1, 1)",      // fast exit
  bounce:   "cubic-bezier(0.34, 1.56, 0.64, 1)", // light bounce
};

/**
 * cn utility — combines class strings (no dependency required).
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
