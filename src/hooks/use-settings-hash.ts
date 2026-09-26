"use client";

import { useCallback, useEffect, useState } from "react";

export const SETTINGS_TABS = ["notifications", "sounds", "account"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];
const DEFAULT_TAB: SettingsTab = "notifications";

function parseHash(hash: string): { open: boolean; tab: SettingsTab } {
  // "#settings" or "#settings/notifications"
  const match = /^#settings(?:\/([a-z]+))?$/.exec(hash);
  if (!match) return { open: false, tab: DEFAULT_TAB };
  const tab = match[1];
  return {
    open: true,
    tab: (SETTINGS_TABS as readonly string[]).includes(tab ?? "")
      ? (tab as SettingsTab)
      : DEFAULT_TAB,
  };
}


export function useSettingsHash() {
  const [state, setState] = useState<{ open: boolean; tab: SettingsTab }>({
    open: false,
    tab: DEFAULT_TAB,
  });

  useEffect(() => {
    const sync = () => setState(parseHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const openSettings = useCallback((tab: SettingsTab = DEFAULT_TAB) => {
    window.location.hash = `settings/${tab}`;
  }, []);

  const setTab = useCallback((tab: SettingsTab) => {
    window.location.hash = `settings/${tab}`;
  }, []);

  const close = useCallback(() => {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setState({ open: false, tab: DEFAULT_TAB });
  }, []);

  return { ...state, openSettings, setTab, close, tabs: SETTINGS_TABS };
}
