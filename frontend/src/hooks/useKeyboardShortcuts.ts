/**
 * Global keyboard shortcuts:
 *   Ctrl/Cmd + K  → focus search in sidebar
 *   Escape        → close active conversation (go back to list on mobile)
 */
"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function useKeyboardShortcuts() {
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K — focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search"]'
        );
        searchInput?.focus();
      }

      // Escape — deselect conversation (useful on mobile / keyboard nav)
      if (e.key === "Escape") {
        const active = document.activeElement as HTMLElement;
        // Only deselect if focus is not in the message composer
        if (!active?.closest("textarea")) {
          setActiveConversation(null);
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setActiveConversation]);
}
