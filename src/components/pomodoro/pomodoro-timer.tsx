"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CloudRain,
  Coffee,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  SkipForward,
  Target,
  Waves,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  SOUND_NAMES,
  useAmbientSounds,
  type SoundName,
} from "@/hooks/use-ambient-sounds";
import { VolumeSlider } from "../ui/volume-slider";

type Mode = "focus" | "break";

const PRESETS = [
  { focus: 25, rest: 5 },
  { focus: 50, rest: 10 },
  { focus: 90, rest: 20 },
];
const PREFS_KEY = "gadwly:pomodoro";
const SOUND_ICONS: Record<
  SoundName,
  React.ComponentType<{ className?: string }>
> = {
  rain: CloudRain,
  fire: Flame,
  noise: Waves,
};

type PersistedSession = {
  mode: Mode;
  running: boolean;
  label: string;
  sessionId: string | null;
  endAt: number | null;
  secondsLeft: number | null;
};
type Persisted = {
  focusMin: number;
  breakMin: number;
  chime: boolean;
  mode: Mode;
  session: PersistedSession | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(n)));

function fmt(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h > 0 ? `${pad(h)}:` : ""}${pad(m)}:${pad(total % 60)}`;
}

export function PomodoroTimer() {
  const t = useTranslations("counter");
  const sounds = useAmbientSounds();

  const [mode, setMode] = useState<Mode>("focus");
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [chimeOn, setChimeOn] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [label, setLabel] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const fsRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const endAtRef = useRef<number | null>(null);
  const persistedRef = useRef<Persisted>({
    focusMin: 25,
    breakMin: 5,
    chime: true,
    mode: "focus",
    session: null,
  });

  const utils = trpc.useUtils();
  const { data: todayCount = 0 } = trpc.pomodoro.todayCount.useQuery();
  // Account-wide notification preferences (set from the settings dialog):
  // whether a completion notification should appear, and whether it should
  // include sound.
  const { data: notifPrefs } = trpc.preferences.get.useQuery();
  const start = trpc.pomodoro.start.useMutation({
    onSuccess: (s) => {
      sessionIdRef.current = s.id;
      if (persistedRef.current.session) {
        savePersisted({
          session: { ...persistedRef.current.session, sessionId: s.id },
        });
      }
    },
  });
  const finish = trpc.pomodoro.finish.useMutation({
    onSuccess: () => utils.pomodoro.todayCount.invalidate(),
  });

  function savePersisted(patch: Partial<Persisted>) {
    persistedRef.current = { ...persistedRef.current, ...patch };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(persistedRef.current));
    } catch {
      /* ignore (quota, private mode) */
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const p: Partial<Persisted> = raw ? JSON.parse(raw) : {};
      const focus =
        typeof p.focusMin === "number" ? clampInt(p.focusMin, 1, 180) : 25;
      const brk =
        typeof p.breakMin === "number" ? clampInt(p.breakMin, 1, 60) : 5;
      const chime = typeof p.chime === "boolean" ? p.chime : true;
      const restoredMode: Mode = p.mode === "break" ? "break" : "focus";

      setFocusMin(focus);
      setBreakMin(brk);
      setChimeOn(chime);
      persistedRef.current = {
        focusMin: focus,
        breakMin: brk,
        chime,
        mode: restoredMode,
        session: null,
      };

      const s = p.session;
      if (s && s.running && typeof s.endAt === "number") {
        const remaining = Math.ceil((s.endAt - Date.now()) / 1000);
        if (remaining > 0) {
          setMode(s.mode);
          setLabel(s.label ?? "");
          sessionIdRef.current = s.sessionId ?? null;
          endAtRef.current = s.endAt;
          setSecondsLeft(remaining);
          setStarted(true);
          setRunning(true);
          persistedRef.current.session = s;
        } else {
          if (s.mode === "focus" && s.sessionId) {
            finish.mutate({ id: s.sessionId, completed: true });
          }
          setMode(s.mode === "focus" ? "break" : "focus");
        }
      } else if (s && !s.running) {
        setMode(s.mode);
        setLabel(s.label ?? "");
        sessionIdRef.current = s.sessionId ?? null;
        setSecondsLeft(
          s.secondsLeft ?? (s.mode === "focus" ? focus : brk) * 60,
        );
        setStarted(true);
        setRunning(false);
        persistedRef.current.session = s;
      } else {
        setMode(restoredMode);
      }
    } catch {
      /* ignore malformed storage */
    }
    setPrefsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    savePersisted({ focusMin, breakMin, chime: chimeOn, mode });
  }, [prefsLoaded, focusMin, breakMin, chimeOn, mode]);

  const didMountResetEffect = useRef(false);
  useEffect(() => {
    if (!didMountResetEffect.current) {
      didMountResetEffect.current = true;
      return;
    }
    if (started) return;
    setSecondsLeft((mode === "focus" ? focusMin : breakMin) * 60);
  }, [focusMin, breakMin, mode, started]);

  const latest = useRef({ complete: () => {}, toggle: () => {} });
  useLayoutEffect(() => {
    latest.current = { complete, toggle };
  });

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (endAtRef.current === null) return;
      const ms = endAtRef.current - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0) latest.current.complete();
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const prev = document.title;
    document.title = `${fmt(secondsLeft)} · ${mode === "focus" ? t("focus") : t("break")}`;
    return () => {
      document.title = prev;
    };
  }, [running, secondsLeft, mode, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || settingsOpen) return;
      const el = e.target as HTMLElement | null;
      if (
        el?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el?.tagName ?? "")
      )
        return;
      e.preventDefault();
      latest.current.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  useEffect(() => {
    if (!fullscreen) return;
    fsRef.current?.requestFullscreen?.()?.catch(() => {});
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [fullscreen]);

  function abandon() {
    if (sessionIdRef.current) {
      finish.mutate({ id: sessionIdRef.current, completed: false });
      sessionIdRef.current = null;
    }
  }

  function toggle() {
    sounds.unlock();
    if (running) {
      let remaining = secondsLeft;
      if (endAtRef.current !== null) {
        remaining = Math.max(
          0,
          Math.ceil((endAtRef.current - Date.now()) / 1000),
        );
        setSecondsLeft(remaining);
      }
      endAtRef.current = null;
      setRunning(false);
      savePersisted({
        session: {
          mode,
          running: false,
          label,
          sessionId: sessionIdRef.current,
          endAt: null,
          secondsLeft: remaining,
        },
      });
      return;
    }
    // First start of a session is a user gesture — the right moment to ask,
    // rather than requesting on mount where the browser would likely ignore it.
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
    if (mode === "focus" && !sessionIdRef.current) {
      const id = crypto.randomUUID();
      sessionIdRef.current = id;
      start.mutate({ id, label: label || undefined, focusMin, breakMin });
    }
    const endAt = Date.now() + secondsLeft * 1000;
    endAtRef.current = endAt;
    setStarted(true);
    setRunning(true);
    savePersisted({
      session: {
        mode,
        running: true,
        label,
        sessionId: sessionIdRef.current,
        endAt,
        secondsLeft: null,
      },
    });
  }

  function reset() {
    abandon();
    endAtRef.current = null;
    setRunning(false);
    setStarted(false);
    setSecondsLeft((mode === "focus" ? focusMin : breakMin) * 60);
    savePersisted({ session: null });
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    abandon();
    endAtRef.current = null;
    setRunning(false);
    setStarted(false);
    setMode(next);
    savePersisted({ session: null });
  }

  function complete() {
    endAtRef.current = null;
    setRunning(false);
    setStarted(false);
    const finishedMode = mode;
    if (finishedMode === "focus" && sessionIdRef.current) {
      finish.mutate({ id: sessionIdRef.current, completed: true });
      sessionIdRef.current = null;
    }
    if (chimeOn) sounds.chime();

    if (
      notifPrefs?.pomodoroNotifyEnabled !== false &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      const silent = notifPrefs?.notificationSoundOn === false;
      new Notification(
        finishedMode === "focus"
          ? t("notifyFocusDoneTitle")
          : t("notifyBreakDoneTitle"),
        { body: label || undefined, silent, tag: "pomodoro-complete" },
      );
    }

    setMode(finishedMode === "focus" ? "break" : "focus");
    savePersisted({ session: null });
  }

  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const pct = Math.min(1, Math.max(0, 1 - secondsLeft / total));
  const timeText = fmt(secondsLeft);
  const hasHours = secondsLeft >= 3600;
  const modeLabel = mode === "focus" ? t("focus") : t("break");

  const RADIUS = 112;
  const CIRC = 2 * Math.PI * RADIUS;

  const mainButton = (
    <Button
      variant={mode === "focus" ? "default" : "green"}
      onClick={toggle}
      className="h-14 min-w-44 rounded-2xl px-8 text-base font-bold"
    >
      {running ? <Pause className="size-5" /> : <Play className="size-5" />}
      {running ? t("pause") : t("start")}
    </Button>
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="ms-auto flex shrink-0 gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("settings")}
            >
              <Settings className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFullscreen(true)}
              aria-label={t("fullscreen")}
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-6 pb-8">
          <div className="w-full max-w-xs">
            <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="focus" className="flex-1 gap-1.5">
                  <Target className="size-4" /> {t("focus")}
                </TabsTrigger>
                <TabsTrigger value="break" className="flex-1 gap-1.5">
                  <Coffee className="size-4" /> {t("break")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="relative aspect-square w-[min(78vw,20rem)]">
            <svg viewBox="0 0 260 260" className="size-full -rotate-90">
              <circle
                cx="130"
                cy="130"
                r={RADIUS}
                fill="none"
                stroke="var(--muted)"
                strokeWidth="16"
              />
              <circle
                cx="130"
                cy="130"
                r={RADIUS}
                fill="none"
                stroke={
                  mode === "focus" ? "var(--primary)" : "var(--accent-green)"
                }
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pct)}
                style={{
                  transition: "stroke-dashoffset 1s linear, stroke 0.3s",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span
                className={cn(
                  "font-extrabold tabular-nums tracking-tight",
                  hasHours ? "text-4xl" : "text-5xl sm:text-6xl",
                )}
              >
                {timeText}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  mode === "focus"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent-green/15 text-accent-green",
                )}
              >
                {modeLabel}
              </span>
            </div>
          </div>

          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("workingPlaceholder")}
            disabled={started}
            className="max-w-xs text-center"
          />

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={reset}
              aria-label={t("reset")}
              title={t("reset")}
              className="h-14 w-14 rounded-2xl"
            >
              <RotateCcw className="size-5" />
            </Button>
            {mainButton}
            <Button
              variant="outline"
              onClick={() => switchMode(mode === "focus" ? "break" : "focus")}
              aria-label={t("skip")}
              title={t("skip")}
              className="h-14 w-14 rounded-2xl"
            >
              <SkipForward className="size-5" />
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => {
              const active = p.focus === focusMin && p.rest === breakMin;
              return (
                <button
                  key={p.focus}
                  type="button"
                  disabled={started}
                  onClick={() => {
                    setFocusMin(p.focus);
                    setBreakMin(p.rest);
                  }}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm font-bold tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-50",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <span dir="ltr">
                    {p.focus} / {p.rest}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sounds")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {SOUND_NAMES.map((name) => {
              const Icon = SOUND_ICONS[name];
              const active = sounds.enabled[name];
              return (
                <div
                  key={name}
                  className={cn(
                    "rounded-2xl border p-3 transition-colors",
                    active ? "border-primary/30 bg-primary/5" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="flex-1 text-sm font-bold">{t(name)}</span>
                    <Switch
                      checked={active}
                      onCheckedChange={() => sounds.toggle(name)}
                    />
                  </div>
                  <div
                    className={cn(
                      "grid transition-all duration-200",
                      active
                        ? "mt-3 grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <VolumeSlider
                        value={sounds.volume[name]}
                        onValueChange={(v) => sounds.setVolume(name, v)}
                        disabled={!active}
                        aria-label={t(name)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-green/15 text-accent-green">
              <Target className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("sessionsToday")}
              </p>
              <p className="text-3xl font-extrabold tabular-nums">
                {todayCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("focusMinutes")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={focusMin}
                  disabled={started}
                  onChange={(e) =>
                    setFocusMin(clampInt(Number(e.target.value) || 1, 1, 180))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("breakMinutes")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={breakMin}
                  disabled={started}
                  onChange={(e) =>
                    setBreakMin(clampInt(Number(e.target.value) || 1, 1, 60))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3">
              <Label className="text-sm font-bold">{t("chime")}</Label>
              <Switch checked={chimeOn} onCheckedChange={setChimeOn} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="green" onClick={() => setSettingsOpen(false)}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {fullscreen && (
        <div
          ref={fsRef}
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right))",
          }}
          className={cn(
            "fixed inset-0 z-[200] flex flex-col text-white transition-colors duration-500",
            mode === "focus" ? "bg-primary" : "bg-accent-green",
          )}
        >
          <div className="h-1.5 shrink-0 rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct * 100}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label={t("exitFullscreen")}
            title={t("exitFullscreen")}
            className="absolute end-4 top-6 grid size-11 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          >
            <Minimize2 className="size-5" />
          </button>

          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
            {label && (
              <p className="max-w-xl truncate text-lg font-bold text-white/85">
                {label}
              </p>
            )}
            <p
              className={cn(
                "font-extrabold leading-none tabular-nums tracking-tight",
                hasHours
                  ? "text-[16vw] sm:text-[length:min(9rem,12vw)]"
                  : "text-[26vw] sm:text-[length:min(15rem,20vw)]",
              )}
            >
              {timeText}
            </p>
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">
              {modeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-2 pt-4">
            <button
              type="button"
              onClick={reset}
              aria-label={t("reset")}
              className="grid size-12 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
            >
              <RotateCcw className="size-5" />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={running ? t("pause") : t("start")}
              className={cn(
                "grid size-16 place-items-center rounded-full bg-white shadow-lg transition-transform hover:scale-105",
                mode === "focus" ? "text-primary" : "text-accent-green",
              )}
            >
              {running ? (
                <Pause className="size-7" />
              ) : (
                <Play className="size-7" />
              )}
            </button>
            <button
              type="button"
              onClick={() => switchMode(mode === "focus" ? "break" : "focus")}
              aria-label={t("skip")}
              className="grid size-12 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
            >
              <SkipForward className="size-5" />
            </button>

            <span className="mx-2 hidden h-8 w-px bg-white/25 sm:block" />

            {SOUND_NAMES.map((name) => {
              const Icon = SOUND_ICONS[name];
              const active = sounds.enabled[name];
              return (
                <div key={name} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => sounds.toggle(name)}
                    aria-label={t(name)}
                    aria-pressed={active}
                    className={cn(
                      "grid size-12 place-items-center rounded-full transition-colors",
                      active
                        ? mode === "focus"
                          ? "bg-white text-primary"
                          : "bg-white text-accent-green"
                        : "bg-white/15 hover:bg-white/25",
                    )}
                  >
                    <Icon className="size-5" />
                  </button>
                  {active && (
                    <VolumeSlider
                      value={sounds.volume[name]}
                      onValueChange={(v) => sounds.setVolume(name, v)}
                      aria-label={t(name)}
                      className="w-20 text-white"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
