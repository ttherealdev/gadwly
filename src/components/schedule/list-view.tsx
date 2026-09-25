"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn, formatDuration } from "@/lib/utils";
import { CATEGORY_DOT, STATUS_META, type ScheduleItemDTO } from "./constants";
import { DeleteDialog } from "./delete-dialog";

function StatusPill({
  status,
  onClick,
}: {
  status: ScheduleItemDTO["status"];
  onClick: () => void;
}) {
  const ts = useTranslations("schedule.status");
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
        meta.pillClass,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {ts(status)}
    </button>
  );
}

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
  const locale = useLocale() as "ar" | "en";
  const [pendingDelete, setPendingDelete] = useState<ScheduleItemDTO | null>(null);

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
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold">{td(item.day)}</TableCell>
                <TableCell className="max-w-48 truncate font-semibold" title={item.title}>
                  {item.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1.5">
                    <span className={cn("size-2 shrink-0 rounded-full", CATEGORY_DOT[item.category])} />
                    {tc(item.category)}
                  </Badge>
                </TableCell>
                <TableCell className="text-primary tabular-nums" dir="ltr">
                  {item.startTime}
                </TableCell>
                <TableCell className="text-destructive tabular-nums" dir="ltr">
                  {item.endTime}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDuration(item.startTime, item.endTime, locale)}
                </TableCell>
                <TableCell>
                  <StatusPill status={item.status} onClick={() => onCycleStatus(item)} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(item)} aria-label={t("table.actions")}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(item)}
                      aria-label={t("table.actions")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        {items.map((item) => (
          <div key={item.id} className="isolate rounded-xl border border-border p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold" title={item.title}>
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{td(item.day)}</p>
              </div>
              <Badge variant="outline" className="shrink-0 gap-1.5 whitespace-nowrap">
                <span className={cn("size-2 shrink-0 rounded-full", CATEGORY_DOT[item.category])} />
                {tc(item.category)}
              </Badge>
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-sm" dir="ltr">
              <span className="font-semibold tabular-nums text-primary">{item.startTime}</span>
              <span className="text-muted-foreground">–</span>
              <span className="font-semibold tabular-nums text-destructive">{item.endTime}</span>
              <span className="ms-auto text-xs tabular-nums text-muted-foreground" dir={locale === "ar" ? "rtl" : "ltr"}>
                {formatDuration(item.startTime, item.endTime, locale)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
              <StatusPill status={item.status} onClick={() => onCycleStatus(item)} />
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(item)} aria-label={t("table.actions")}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(item)}
                  aria-label={t("table.actions")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeleteDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        label={pendingDelete?.title}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
