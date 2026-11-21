"use client";

import { Bell, CalendarDays, Home, Menu, PanelLeft, X } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

const NAV = [
  { label: "Главная", icon: Home, active: false },
  { label: "Смены", icon: CalendarDays, active: true },
] as const;

interface NavListProps {
  /** Классы подписи пункта: в рейке подпись скрыта, в выдвижном меню видна. */
  labelClassName?: string;
  /** Иконка по центру (рейка) или слева (развёрнутое меню). */
  centered?: boolean;
}

function NavList({ labelClassName, centered }: NavListProps) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map(({ label, icon: Icon, active }) => (
        <li key={label}>
          <Link
            href="/"
            aria-current={active ? "page" : undefined}
            title={label}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-2.5 text-base font-medium",
              centered && "justify-center lg:justify-start",
              active ? "bg-surface" : "hover:bg-surface/60"
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className={labelClassName}>{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Каркас CRM.
 * sm (<640): верхняя панель + выдвижное меню; md (640–1199): рейка с иконками;
 * lg (≥1200): полное меню 280 px со сворачиванием.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      {/* sm: верхняя панель */}
      <header className="border-line flex h-14 shrink-0 items-center justify-between border-b px-4 md:hidden">
        <span className="text-xl leading-6 font-semibold">CRM</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Уведомления"
            className="hover:bg-surface/60 flex size-10 items-center justify-center rounded-lg"
          >
            <Bell className="size-5" />
          </button>
          <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <Dialog.Trigger
              aria-label="Открыть меню"
              className="hover:bg-surface/60 flex size-10 items-center justify-center rounded-lg"
            >
              <Menu className="size-5" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-40 bg-black/40" />
              <Dialog.Content
                aria-describedby={undefined}
                className="bg-background data-[state=open]:animate-in data-[state=open]:slide-in-from-left fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col px-3.5 py-4 shadow-xl outline-none"
              >
                <div className="mb-4 flex h-10 items-center justify-between">
                  <Dialog.Title className="text-xl leading-6 font-semibold">CRM</Dialog.Title>
                  <Dialog.Close
                    aria-label="Закрыть меню"
                    className="hover:bg-surface/60 flex size-10 items-center justify-center rounded-lg"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <NavList />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>

      {/* md/lg: боковое меню */}
      <nav
        aria-label="Основное меню"
        className={cn(
          "border-line hidden shrink-0 flex-col border-r px-3.5 py-4 transition-[width] md:flex md:w-[76px]",
          collapsed ? "lg:w-[76px]" : "lg:w-[280px]"
        )}
      >
        <div className={cn("mb-4 flex h-10 items-center justify-center", !collapsed && "lg:justify-between")}>
          <span className="text-xl leading-6 font-semibold">CRM</span>
          {!collapsed && (
            <button
              type="button"
              aria-label="Уведомления"
              className="text-foreground hover:bg-surface/60 hidden size-10 items-center justify-center rounded-lg lg:flex"
            >
              <Bell className="size-5" />
            </button>
          )}
        </div>
        <NavList centered labelClassName={cn("hidden", !collapsed && "lg:inline")} />
        <button
          type="button"
          onClick={() => setCollapsed(value => !value)}
          className="hover:bg-surface/60 mt-auto hidden h-10 items-center gap-3 rounded-lg px-2.5 text-base font-medium lg:flex"
        >
          <PanelLeft className="size-5 shrink-0" aria-hidden />
          {!collapsed && "Свернуть меню"}
        </button>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-6 md:px-6 lg:gap-6 lg:overflow-hidden lg:px-[30px] lg:pt-6">
        {children}
      </main>
    </div>
  );
}
