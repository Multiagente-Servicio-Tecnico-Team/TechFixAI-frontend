import { useEffect, useRef } from "react";

function isSpace(event) {
  return event.code === "Space" || event.key === " ";
}

function shouldKeepSpaceBehavior(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    'input, textarea, select, button, a[href], summary, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="button"]',
  ));
}

/** Hold Space to record outside text-entry and interactive controls. */
export function useSpacebarPushToTalk({ enabled, onStart, onStop }) {
  const enabledRef = useRef(enabled);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);
  const heldRef = useRef(false);

  enabledRef.current = enabled;
  onStartRef.current = onStart;
  onStopRef.current = onStop;

  useEffect(() => {
    const release = () => {
      if (!heldRef.current) return;
      heldRef.current = false;
      onStopRef.current?.();
    };

    const handleKeyDown = (event) => {
      if (!isSpace(event) || event.repeat || event.isComposing || event.defaultPrevented || !enabledRef.current
          || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
          || shouldKeepSpaceBehavior(event.target)) return;
      event.preventDefault();
      if (heldRef.current) return;
      heldRef.current = true;
      onStartRef.current?.();
    };

    const handleKeyUp = (event) => {
      if (!isSpace(event) || !heldRef.current) return;
      event.preventDefault();
      release();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") release();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
