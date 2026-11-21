"use client";

import { Bell, CalendarDays, Home, PanelLeft } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

const NAV = [
  { label: "Главная", icon: Home, active: false },
  { label: "Смены", icon: CalendarDays, active: true },
] as const;

/** Каркас CRM: боковое меню со сворачиванием + область контента. */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-dvh">
      <nav
        aria-label="Основное меню"
        className={cn(
          "border-line flex shrink-0 flex-col border-r px-3.5 py-4 transition-[width]",
          collapsed ? "w-19" : "w-70"
        )}
      >
        <div className="mb-4 flex h-10 items-center justify-between">
          <span className="text-xl leading-6 font-semibold">CRM</span>
          {!collapsed && (
            <button
              type="button"
              aria-label="Уведомления"
              className="text-foreground hover:bg-surface/60 flex size-10 items-center justify-center rounded-lg"
            >
              <Bell className="size-5" />
            </button>
          )}
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ label, icon: Icon, active }) => (
            <li key={label}>
              <Link
                href="/"
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-2.5 text-base font-medium",
                  active ? "bg-surface" : "hover:bg-surface/60"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {!collapsed && label}
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setCollapsed(value => !value)}
          className="hover:bg-surface/60 mt-auto flex h-10 items-center gap-3 rounded-lg px-2.5 text-base font-medium"
        >
          <PanelLeft className="size-5 shrink-0" aria-hidden />
          {!collapsed && "Свернуть меню"}
        </button>
      </nav>
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden px-7.5 pt-6 pb-6">{children}</main>
    </div>
  );
}
