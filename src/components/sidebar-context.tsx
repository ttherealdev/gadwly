"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface SidebarCtx {
  /** Desktop: icon-only vs full width. */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  /** Mobile: off-canvas drawer open/closed. */
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const Ctx = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Ctx.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
