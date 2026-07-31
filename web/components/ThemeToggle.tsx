"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./providers/ThemeProvider";

const options = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

export default function ThemeToggle({ overlay = false }: { overlay?: boolean }) {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const order = ["light", "dark", "system"] as const;
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const current = options.find((o) => o.value === theme)!;
  const Icon = current.icon;

  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${current.label}. Click to change.`}
      className={
        overlay
          ? "rounded-lg p-2 text-white transition-colors hover:bg-white/20 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
          : "rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-elevated hover:text-ink"
      }
    >
      <Icon className="h-5 w-5" strokeWidth={overlay ? 2.25 : 2} />
    </button>
  );
}
