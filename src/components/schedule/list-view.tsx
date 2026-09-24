"use client";

import { useLocale, useTranslations } from "next-intl";
import { Pencil, Trash2, CheckCircle2, Circle, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn, formatDuration } from "@/lib/utils";
import { CATEGORY_DOT, type ScheduleItemDTO } from "./constants";

const STATUS_ICON = { PLANNED: Circle, IN_PROGRESS: CircleDot, DONE: CheckCircle2 };

export function ScheduleListView({
  items,
  onEdit,
  onCycleStatus,
  onDelete,
}: {
  items: ScheduleItemDTO[];
  onEdit: (item: ScheduleItemDTO) => void;
  onCycleStatus: (item: ScheduleItemDTO) => void;
  onDelete: (item: ScheduleItemDTO) => void;
}) {
  const t = useTranslations("schedule");
  const td = useTranslations("days");
  const tc = useTranslations("schedule.category");
  const ts = useTranslations("schedule.status");
  const locale = useLocale() as "ar" | "en";

  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <>
      {/* Desktop / tablet: full table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.day")}</TableHead>
              <TableHead>{t("table.activity")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead>{t("table.start")}</TableHead>
              <TableHead>{t("table.end")}</TableHead>
              <TableHead>{t("table.duration")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-end">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const StatusIcon = STATUS_ICON[item.status];
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{td(item.day)}</TableCell>
                  <TableCell className="font-semibold">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", CATEGORY_DOT[item.category])} />
                      {tc(item.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-primary">{item.startTime}</TableCell>
                  <TableCell className="text-destructive">{item.endTime}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(item.startTime, item.endTime, locale)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => onCycleStatus(item)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold",
                        item.status === "DONE" && "text-accent-green",
                        item.status === "IN_PROGRESS" && "text-amber-500",
                        item.status === "PLANNED" && "text-muted-foreground"
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {ts(item.status)}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards — a wide table just doesn't work under ~600px */}
      <div className="flex flex-col gap-3 sm:hidden">
        {items.map((item) => {
          const StatusIcon = STATUS_ICON[item.status];
          return (
            <div key={item.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{td(item.day)}</p>
                </div>
                <Badge variant="outline" className="shrink-0 gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", CATEGORY_DOT[item.category])} />
                  {tc(item.category)}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="text-primary">{item.startTime}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-destructive">{item.endTime}</span>
                <span className="ms-auto text-xs text-muted-foreground">
                  {formatDuration(item.startTime, item.endTime, locale)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => onCycleStatus(item)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-bold",
                    item.status === "DONE" && "text-accent-green",
                    item.status === "IN_PROGRESS" && "text-amber-500",
                    item.status === "PLANNED" && "text-muted-foreground"
                  )}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {ts(item.status)}
                </button>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
