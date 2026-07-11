"use client";

import { useSidebar } from "@/components/providers/SidebarProvider";

export default function SidebarToggle() {
  const { isOpen, toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
      aria-expanded={isOpen}
      className={`sidebar-wave-toggle ${isOpen ? "sidebar-wave-toggle-active" : ""}`}
    >
      <svg className="sidebar-wave-ring" viewBox="0 0 36 36" aria-hidden="true">
        <defs>
          <linearGradient id="sidebarWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--kelmon-purple-brand)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--theme-primary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--kelmon-purple-brand)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <circle
          className="sidebar-wave-arc"
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="url(#sidebarWaveGrad)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="10 92"
        />
      </svg>
      <span
        className="material-symbols-outlined sidebar-wave-icon"
        style={{ fontVariationSettings: "'wght' 400" }}
        aria-hidden="true"
      >
        {isOpen ? "keyboard_double_arrow_left" : "keyboard_double_arrow_right"}
      </span>
    </button>
  );
}
