"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  CalendarRange,
  Check,
  Crosshair,
  Maximize2,
  Minimize2,
  Plus,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toMinutes } from "@/lib/prayer-times";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAYS, CATEGORY_VAR, type Day, type ScheduleItemDTO } from "./constants";

type Mode = "week" | "day";
type Seg = { item: ScheduleItemDTO; start: number; end: number };
type Laid = { seg: Seg; lane: number; lanes: number };

const DAY_MIN = 24 * 60;
const PAD = 14; // breathing room above 00:00 and below 24:00 (so the first label isn't clipped)
const WEEK_HEADER_H = 44;
const GUTTER_W = 52;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3.6;
const ZOOM_DEFAULT = 1.15;
const ZOOM_STEP = 1.25;
const STORAGE_KEY = "gadwly:schedule-grid";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snap = (m: number, step = 15) => Math.round(m / step) * step;

/** "HH:MM" for storage. 24:00 wraps to 00:00, which the app already reads as "end of day". */
function clock(min: number) {
  const m = ((Math.round(min) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Same, but for display only: shows 24:00 instead of 00:00 at the end of the day. */
function label(min: number) {
  return min >= DAY_MIN ? "24:00" : clock(min);
}

/**
 * Lane layout per *cluster* of overlapping items. The old version used one lane count for the
 * whole day, so a single overlap in the morning made every block half-width until midnight.
 */
function layoutDay(segs: Seg[]): Laid[] {
  const sorted = [...segs].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Laid[] = [];
  let cluster: { seg: Seg; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const c of cluster) out.push({ ...c, lanes });
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const seg of sorted) {
    if (cluster.length && seg.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((e) => e <= seg.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.end);
    } else {
      laneEnds[lane] = seg.end;
    }
    cluster.push({ seg, lane });
    clusterEnd = Math.max(clusterEnd, seg.end);
  }
  flush();
  return out;
}

function dragRange(a: number, b: number) {
  let start = snap(Math.min(a, b));
  let end = snap(Math.max(a, b));
  start = Math.min(start, DAY_MIN - 30);
  if (end - start < 30) end = Math.min(start + 30, DAY_MIN);
  return [start, end] as const;
}


export function ScheduleGridView({
  items,
  onEdit,
  onAddAt,
}: {
  items: ScheduleItemDTO[];
  onEdit: (item: ScheduleItemDTO) => void;
  onAddAt: (day: Day, startTime: string, endTime: string) => void;
}) {
  const t = useTranslations("schedule");
  const td = useTranslations("days");

  const scrollRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const anchorRef = useRef<{ minute: number; offset: number } | null>(null);
  const scrolledRef = useRef(false);

  const [mode, setMode] = useState<Mode>("week");
  const [ppm, setPpm] = useState(ZOOM_DEFAULT); // pixels per minute = the zoom level
  const [fit, setFit] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);

  const headerH = mode === "week" ? WEEK_HEADER_H : 0;

  const live = useRef({ ppm, headerH, mode });
  useLayoutEffect(() => {
    live.current = { ppm, headerH, mode };
  });

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const todayIdx = now ? (now.getDay() + 1) % 7 : -1;


  const segmentsByDay = useMemo(() => {
    const map: Record<string, Seg[]> = {};
    for (const d of DAYS) map[d] = [];
    for (const item of items) {
      const i = (DAYS as readonly string[]).indexOf(item.day);
      if (i < 0) continue;
      const start = toMinutes(item.startTime);
      let end = toMinutes(item.endTime);
      if (end <= start) end += DAY_MIN;
      if (end <= DAY_MIN) {
        map[item.day].push({ item, start, end });
      } else {
        map[item.day].push({ item, start, end: DAY_MIN });
        map[DAYS[(i + 1) % DAYS.length]].push({ item, start: 0, end: Math.min(end - DAY_MIN, DAY_MIN) });
      }
    }
    return map;
  }, [items]);

  const laidByDay = useMemo(() => {
    const map: Record<string, Laid[]> = {};
    for (const d of DAYS) map[d] = layoutDay(segmentsByDay[d] ?? []);
    return map;
  }, [segmentsByDay]);

  const counts = useMemo(
    () => DAYS.map((d) => items.filter((i) => i.day === d).length),
    [items],
  );


  useEffect(() => {
    let saved: { mode?: Mode; ppm?: number; fit?: boolean } = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
    } catch {}
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    setMode(saved.mode === "day" || saved.mode === "week" ? saved.mode : mobile ? "day" : "week");
    if (typeof saved.ppm === "number") setPpm(clamp(saved.ppm, ZOOM_MIN, ZOOM_MAX));
    if (saved.fit) setFit(true);
    const d = new Date();
    setNow(d);
    setDayIdx((d.getDay() + 1) % 7);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, ppm: Math.round(ppm * 1000) / 1000, fit }),
      );
    } catch {}
  }, [ready, mode, ppm, fit]);

  // keep the "now" line and today highlight fresh
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);


  const zoomTo = useCallback((next: number, clientY?: number) => {
    const el = scrollRef.current;
    if (el) {
      const { ppm: cur, headerH: hh } = live.current;
      const offset =
        clientY === undefined ? el.clientHeight / 2 : clientY - el.getBoundingClientRect().top;
      anchorRef.current = { minute: (el.scrollTop + offset - hh - PAD) / cur, offset };
    }
    setPpm(clamp(next, ZOOM_MIN, ZOOM_MAX));
  }, []);

  useLayoutEffect(() => {
    const a = anchorRef.current;
    const el = scrollRef.current;
    anchorRef.current = null;
    if (!a || !el) return;
    el.scrollTop = headerH + PAD + a.minute * ppm - a.offset;
  }, [ppm, headerH]);

  // "Fit": the whole 24h always fits the available height, even after resize / expand.
  useEffect(() => {
    if (!fit) return;
    const el = scrollRef.current;
    if (!el) return;
    const apply = () =>
      setPpm(clamp((el.clientHeight - headerH - PAD * 2) / DAY_MIN, ZOOM_MIN, ZOOM_MAX));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, expanded, headerH]);

  const stepDay = useCallback(
    (delta: number) => setDayIdx((i) => (i + delta + DAYS.length) % DAYS.length),
    [],
  );

  // Ctrl/Cmd + wheel (and trackpad pinch), two-finger pinch on touch, swipe between days.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setFit(false);
      zoomTo(live.current.ppm * Math.exp(-e.deltaY * 0.0025), e.clientY);
    };

    let pinch: { dist: number; ppm: number } | null = null;
    let swipe: { x: number; y: number; t: number } | null = null;
    const dist = (l: TouchList) =>
      Math.hypot(l[0].clientX - l[1].clientX, l[0].clientY - l[1].clientY);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch = { dist: dist(e.touches), ppm: live.current.ppm };
        swipe = null;
      } else if (e.touches.length === 1) {
        swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      setFit(false);
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomTo(pinch.ppm * (dist(e.touches) / pinch.dist), midY);
    };
    const onEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) pinch = null;
      if (swipe && e.touches.length === 0 && live.current.mode === "day") {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - swipe.x;
        const dy = touch.clientY - swipe.y;
        if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && Date.now() - swipe.t < 600) {
          const rtl = getComputedStyle(el).direction === "rtl";
          stepDay((rtl ? dx > 0 : dx < 0) ? 1 : -1);
        }
      }
      if (e.touches.length === 0) swipe = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [expanded, zoomTo, stepDay]);


  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // let an open task dialog take the Escape first
      if (document.querySelector('[role="dialog"]:not([data-grid-overlay])')) return;
      setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);


  useEffect(() => {
    scrolledRef.current = false;
  }, [expanded]);

  useEffect(() => {
    if (!ready || fit || scrolledRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    scrolledRef.current = true;

    const visible = mode === "week" ? DAYS.map((_, i) => i) : [dayIdx];
    const starts = visible.flatMap((i) => segmentsByDay[DAYS[i]].map((s) => s.start));
    let focus = 8 * 60;
    if (nowMin !== null && (mode === "week" || dayIdx === todayIdx)) focus = nowMin - 30;
    else if (starts.length) focus = Math.min(...starts) - 30;
    el.scrollTop = Math.max(0, PAD + focus * ppm - 8);
  });

  // keep the selected day chip visible (swipe / "now" can change it off-screen)
  useEffect(() => {
    chipRefs.current[dayIdx]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [dayIdx, mode, expanded]);


  const addAt = useCallback(
    (day: Day, a: number, b: number) => onAddAt(day, clock(a), clock(b)),
    [onAddAt],
  );

  function goNow() {
    if (todayIdx >= 0) setDayIdx(todayIdx);
    const el = scrollRef.current;
    if (!el || nowMin === null || fit) return;
    el.scrollTo({ top: Math.max(0, PAD + (nowMin - 30) * ppm - 8), behavior: "smooth" });
  }

  function quickAdd() {
    const day = DAYS[mode === "day" ? dayIdx : Math.max(todayIdx, 0)];
    const start = Math.min(nowMin === null ? 9 * 60 : Math.ceil(nowMin / 30) * 30, 23 * 60);
    addAt(day, start, Math.min(start + 60, DAY_MIN));
  }


  const hourPx = ppm * 60;
  const step = hourPx >= 34 ? 1 : hourPx >= 20 ? 2 : 3; // hours between labels
  const showHalf = hourPx >= 96;
  const totalH = PAD * 2 + DAY_MIN * ppm;

  const marks = useMemo(() => {
    const out: { min: number; text: string; minor: boolean }[] = [];
    for (let h = 0; h < 24; h += step) {
      const hh = String(h).padStart(2, "0");
      out.push({ min: h * 60, text: `${hh}:00`, minor: false });
      if (showHalf) out.push({ min: h * 60 + 30, text: `${hh}:30`, minor: true });
    }
    return out;
  }, [step, showHalf]);

  const visibleIdx = mode === "week" ? DAYS.map((_, i) => i) : [dayIdx];

  const pill =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground transition-colors hover:bg-secondary";


  const surface = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="week" className="gap-1.5">
              <CalendarRange className="h-3.5 w-3.5" /> {t("grid.week")}
            </TabsTrigger>
            <TabsTrigger value="day" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {t("grid.day")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <button type="button" onClick={goNow} className={pill} title={t("grid.now")}>
          <Crosshair className="size-4" />
          <span className="hidden sm:inline">{t("grid.now")}</span>
        </button>

        <div className="ms-auto flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-border bg-card">
            <IconButton
              label={t("grid.zoomOut")}
              disabled={ppm <= ZOOM_MIN + 0.001}
              onClick={() => {
                setFit(false);
                zoomTo(ppm / ZOOM_STEP);
              }}
            >
              <ZoomOut className="size-4" />
            </IconButton>
            <button
              type="button"
              onClick={() => {
                setFit(false);
                zoomTo(ZOOM_DEFAULT);
              }}
              title={t("grid.resetZoom")}
              className="hidden h-9 w-12 text-center text-xs font-bold tabular-nums hover:bg-secondary sm:block"
            >
              {Math.round((ppm / ZOOM_DEFAULT) * 100)}%
            </button>
            <IconButton
              label={t("grid.zoomIn")}
              disabled={ppm >= ZOOM_MAX - 0.001}
              onClick={() => {
                setFit(false);
                zoomTo(ppm * ZOOM_STEP);
              }}
            >
              <ZoomIn className="size-4" />
            </IconButton>
          </div>

          <button
            type="button"
            aria-pressed={fit}
            onClick={() => setFit((f) => !f)}
            className={cn(pill, fit && "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            {t("grid.fit")}
          </button>

          <IconButton
            label={expanded ? t("grid.close") : t("grid.expand")}
            onClick={() => setExpanded((v) => !v)}
            className="border border-border bg-card"
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </IconButton>

          {expanded && (
            <button
              type="button"
              onClick={quickAdd}
              aria-label={t("addTask")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-green px-3 text-xs font-bold text-accent-green-foreground shadow-sm hover:bg-accent-green/90"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t("addTask")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Day chips (day mode) */}
      {mode === "day" && (
        <div
          role="tablist"
          className="-mx-1 mb-2 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
        >
          {DAYS.map((d, i) => {
            const active = i === dayIdx;
            return (
              <button
                key={d}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDayIdx(i)}
                className={cn(
                  "relative flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {td(d)}
                {counts[i] > 0 && (
                  <span
                    className={cn(
                      "grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                      active ? "bg-white/25" : "bg-secondary",
                    )}
                  >
                    {counts[i]}
                  </span>
                )}
                {i === todayIdx && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 end-2 size-2 rounded-full bg-accent-green ring-2 ring-background"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* The grid itself: its own scroll area, so the header + hours stay put */}
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-border bg-card"
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div
          className={cn("grid", mode === "week" && "[--col-min:96px] sm:[--col-min:128px]")}
          style={{
            gridTemplateColumns:
              mode === "week"
                ? `${GUTTER_W}px repeat(7, minmax(var(--col-min), 1fr))`
                : `${GUTTER_W}px minmax(0, 1fr)`,
            minWidth: mode === "week" ? `calc(${GUTTER_W}px + 7 * var(--col-min))` : undefined,
          }}
        >
          {mode === "week" && (
            <>
              <div
                className="sticky start-0 top-0 z-40 border-b border-e border-border bg-card"
                style={{ height: WEEK_HEADER_H }}
              />
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  title={t("grid.day")}
                  onClick={() => {
                    setDayIdx(i);
                    setMode("day");
                  }}
                  className="sticky top-0 z-30 flex items-center justify-center border-b border-s border-border bg-card text-xs font-bold transition-colors hover:bg-secondary"
                  style={{ height: WEEK_HEADER_H }}
                >
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1",
                      i === todayIdx && "bg-primary text-primary-foreground",
                    )}
                  >
                    {td(d)}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Hours gutter (sticks to the side while you scroll sideways) */}
          <div
            className="sticky start-0 z-20 border-e border-border bg-card"
            style={{ height: totalH }}
          >
            {marks.map((m) => (
              <span
                key={m.min}
                className={cn(
                  "absolute end-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground sm:text-[11px]",
                  m.minor && "opacity-60",
                )}
                style={{ top: PAD + m.min * ppm }}
              >
                {m.text}
              </span>
            ))}
          </div>

          {visibleIdx.map((i) => (
            <DayColumn
              key={DAYS[i]}
              day={DAYS[i]}
              isToday={i === todayIdx}
              ppm={ppm}
              laid={laidByDay[DAYS[i]] ?? []}
              nowMin={nowMin}
              showHalf={showHalf}
              single={mode === "day"}
              onEdit={onEdit}
              onAdd={addAt}
            />
          ))}
        </div>
      </div>

      <p className="shrink-0 pt-2 text-center text-[11px] text-muted-foreground">
        <span className="hidden sm:inline">{t("grid.hint")}</span>
        <span className="sm:hidden">{t("grid.hintTouch")}</span>
      </p>
    </div>
  );

  if (expanded) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        data-grid-overlay
        className="fixed inset-0 z-40 bg-background p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] animate-in fade-in-0 duration-150 sm:p-4"
      >
        {surface}
      </div>,
      document.body,
    );
  }

  return <div className="h-[calc(100dvh-14rem)] min-h-[460px]">{surface}</div>;
}


function IconButton({
  label: text,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}


function DayColumn({
  day,
  isToday,
  ppm,
  laid,
  nowMin,
  showHalf,
  single,
  onEdit,
  onAdd,
}: {
  day: Day;
  isToday: boolean;
  ppm: number;
  laid: Laid[];
  nowMin: number | null;
  showHalf: boolean;
  single: boolean;
  onEdit: (item: ScheduleItemDTO) => void;
  onAdd: (day: Day, start: number, end: number) => void;
}) {
  const tc = useTranslations("schedule.category");
  const ref = useRef<HTMLDivElement>(null);
  const press = useRef<{ y: number; min: number; mouse: boolean; moved: boolean } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);

  const hourPx = ppm * 60;

  const minuteAt = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return clamp((clientY - r.top - PAD) / ppm, 0, DAY_MIN);
  };

  const line = "color-mix(in oklab, currentColor 9%, transparent)";
  const faint = "color-mix(in oklab, currentColor 5%, transparent)";
  const backgroundImage = showHalf
    ? `linear-gradient(to bottom, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${faint} 1px, transparent 1px)`
    : `linear-gradient(to bottom, ${line} 1px, transparent 1px)`;
  const backgroundSize = showHalf ? `100% ${hourPx}px, 100% ${hourPx}px` : `100% ${hourPx}px`;
  const backgroundPosition = showHalf
    ? `0 ${PAD}px, 0 ${PAD + hourPx / 2}px`
    : `0 ${PAD}px`;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    const mouse = e.pointerType === "mouse";
    if (mouse && e.button !== 0) return;
    press.current = { y: e.clientY, min: minuteAt(e.clientY), mouse, moved: false };
    if (mouse) e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (e.pointerType === "mouse" && !p) setHover(Math.floor(minuteAt(e.clientY) / 30) * 30);
    if (!p || !p.mouse) return;
    if (!p.moved && Math.abs(e.clientY - p.y) < 6) return;
    p.moved = true;
    setHover(null);
    setDrag({ a: p.min, b: minuteAt(e.clientY) });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const p = press.current;
    press.current = null;
    setDrag(null);
    if (!p) return;
    if (p.moved && p.mouse) {
      const [s, en] = dragRange(p.min, minuteAt(e.clientY));
      onAdd(day, s, en);
    } else {
      // a tap / click: default one-hour slot on the half-hour grid
      const s = Math.min(Math.floor(p.min / 30) * 30, DAY_MIN - 30);
      onAdd(day, s, Math.min(s + 60, DAY_MIN));
    }
  }

  const ghost = "pointer-events-none absolute inset-x-1 flex items-start gap-1 rounded-lg border border-dashed border-primary/60 bg-primary/10 px-1.5 py-1 text-[10px] font-bold text-primary";
  const range = drag ? dragRange(drag.a, drag.b) : null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative cursor-pointer select-none border-s border-border text-foreground",
        isToday && "bg-primary/[0.04]",
      )}
      style={{
        height: PAD * 2 + DAY_MIN * ppm,
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat: "repeat-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        press.current = null;
        setDrag(null);
      }}
      onPointerLeave={() => setHover(null)}
    >
      {/* night hours (before 06:00 and after 22:00) are shaded so the day reads as a whole */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 bg-foreground/[0.04]"
        style={{ height: PAD + 6 * 60 * ppm }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-foreground/[0.04]"
        style={{ top: PAD + 22 * 60 * ppm }}
      />

      {hover !== null && !drag && (
        <div
          aria-hidden
          className={ghost}
          style={{ top: PAD + hover * ppm, height: Math.max(60 * ppm - 2, 20) }}
        >
          <Plus className="size-3 shrink-0" />
          <span dir="ltr">{label(hover)}</span>
        </div>
      )}

      {range && (
        <div
          aria-hidden
          className={cn(ghost, "bg-primary/20")}
          style={{ top: PAD + range[0] * ppm, height: Math.max((range[1] - range[0]) * ppm, 20) }}
        >
          <span dir="ltr">
            {label(range[0])}–{label(range[1])}
          </span>
        </div>
      )}

      {laid.map(({ seg, lane, lanes }) => {
        const { item } = seg;
        const height = Math.max((seg.end - seg.start) * ppm - 2, 18);
        const widthPct = 100 / lanes;
        const color = CATEGORY_VAR[item.category];
        const done = item.status === "DONE";
        const showMeta = height >= 34;
        return (
          <button
            key={`${item.id}-${seg.start}`}
            type="button"
            data-block
            title={`${item.title} • ${item.startTime}–${item.endTime}`}
            onClick={() => onEdit(item)}
            className={cn(
              "absolute z-[1] overflow-hidden rounded-lg border border-border/60 border-s-4 bg-card text-start shadow-sm outline-none transition-shadow hover:z-20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
              done && "opacity-60",
            )}
            style={{
              top: PAD + seg.start * ppm + 1,
              height,
              insetInlineStart: `calc(${lane * widthPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              borderInlineStartColor: color,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
            />
            <span className="relative flex h-full flex-col gap-0.5 px-1.5 py-1">
              <span className="flex items-center gap-1">
                {done && <Check className="size-3 shrink-0 text-accent-green" />}
                {item.status === "IN_PROGRESS" && (
                  <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent-green" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 font-bold leading-tight",
                    single ? "text-sm" : "text-[11px] sm:text-xs",
                    height >= 64 ? "line-clamp-2" : "truncate",
                    done && "line-through",
                  )}
                >
                  {item.title}
                </span>
              </span>
              {showMeta && (
                <span
                  className={cn(
                    "truncate leading-tight text-muted-foreground",
                    single ? "text-xs" : "text-[10px]",
                  )}
                >
                  <span dir="ltr">
                    {item.startTime}–{item.endTime}
                  </span>
                  {height >= 48 && <> · {tc(item.category)}</>}
                </span>
              )}
            </span>
          </button>
        );
      })}

      {isToday && nowMin !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10"
          style={{ top: PAD + nowMin * ppm }}
        >
          <div className="h-0.5 -translate-y-1/2 bg-destructive" />
          <span
            className="absolute top-0 size-2.5 -translate-y-1/2 rounded-full bg-destructive"
            style={{ insetInlineStart: -5 }}
          />
        </div>
      )}
    </div>
  );
}
