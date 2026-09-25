"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Rows3, LayoutGrid as GridIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc";
import { DAYS, type Day, type ScheduleItemDTO } from "./constants";
import { ScheduleListView } from "./list-view";
import { ScheduleGridView } from "./grid-view";
import { TaskDialog } from "./task-dialog";

export function ScheduleTable() {
  const t = useTranslations("schedule");
  const td = useTranslations("days");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "grid" ? "grid" : "list";

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.schedule.list.useQuery();
  const cycleStatus = trpc.schedule.updateStatus.useMutation({
    onSuccess: () => utils.schedule.list.invalidate(),
  });
  const remove = trpc.schedule.delete.useMutation({
    onSuccess: () => utils.schedule.list.invalidate(),
  });

  const [dayFilter, setDayFilter] = useState<Day | "ALL">("ALL");
  const [editItem, setEditItem] = useState<ScheduleItemDTO | null>(null);
  const [prefill, setPrefill] = useState<{ day: Day; startTime: string; endTime: string } | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(
    () => (dayFilter === "ALL" ? items : items.filter((i) => i.day === dayFilter)),
    [items, dayFilter]
  );

  const countByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of items) map[i.day] = (map[i.day] ?? 0) + 1;
    return map;
  }, [items]);

  function nextStatus(s: string) {
    return s === "PLANNED" ? "IN_PROGRESS" : s === "IN_PROGRESS" ? "DONE" : "PLANNED";
  }

  function setView(v: "list" | "grid") {
    router.replace({ pathname, query: { view: v } });
  }

  function openAdd() {
    setEditItem(null);
    setPrefill(undefined);
    setDialogOpen(true);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:ms-auto sm:w-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as "list" | "grid")}>
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5">
                <Rows3 className="h-3.5 w-3.5" /> {t("viewList")}
              </TabsTrigger>
              <TabsTrigger value="grid" className="gap-1.5">
                <GridIcon className="h-3.5 w-3.5" /> {t("viewGrid")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="green" className="ms-auto sm:ms-0" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("addTask")}</span>
          </Button>
        </div>
      </CardHeader>


      {view === "list" && (
        <div
          role="tablist"
          aria-label={t("table.day")} 
          className="-mx-1 flex gap-1.5 overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(["ALL", ...DAYS] as const).map((d) => {
            const active = dayFilter === d;
            const count = d === "ALL" ? items.length : countByDay[d] ?? 0;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDayFilter(d)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {d === "ALL" ? t("allDays") : td(d)}
                {count > 0 && (
                  <span
                    className={cn(
                      "grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                      active ? "bg-white/25" : "bg-secondary",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <CardContent className="pt-4">
        {isLoading ? null : view === "list" ? (
          <ScheduleListView
            items={filtered}
            onEdit={(item) => { setEditItem(item); setPrefill(undefined); setDialogOpen(true); }}
            onCycleStatus={(item) => cycleStatus.mutate({ id: item.id, status: nextStatus(item.status) as any })}
            onDelete={(item) => remove.mutate({ id: item.id })}
          />
        ) : (
          <ScheduleGridView
            items={items}
            onEdit={(item) => { setEditItem(item); setPrefill(undefined); setDialogOpen(true); }}
            onAddAt={(day, startTime, endTime) => {
              setEditItem(null);
              setPrefill({ day, startTime, endTime });
              setDialogOpen(true);
            }}
          />
        )}
      </CardContent>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editItem} prefill={prefill} />
    </Card>
  );
}
