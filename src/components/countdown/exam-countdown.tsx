"use client";

import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useTick } from "@/hooks/use-tick";

type ExamDTO = { id: string; label: string; targetDate: string | Date };
type Parts = { days: number; hours: number; minutes: number; seconds: number };

const EMPTY_EXAMS: ExamDTO[] = [];

function diffParts(target: Date, now: Date): Parts | null {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function ExamCountdown() {
  const t = useTranslations("dashboard");
  const te = useTranslations("exam");

  const { data } = trpc.exams.list.useQuery();
  const exams = data ?? EMPTY_EXAMS;

  const now = useTick();
  const savingRef = useRef(false);
  const utils = trpc.useUtils();
  const upsert = trpc.exams.upsert.useMutation({
    onSuccess: () => {
      utils.exams.list.invalidate();
      setOpen(false);
    },
    onSettled: () => {
      savingRef.current = false;
    },
  });
  const remove = trpc.exams.delete.useMutation({
    onSuccess: () => utils.exams.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamDTO | null>(null);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ExamDTO | null>(null);

  function openAdd() {
    setEditing(null);
    setLabel("");
    setDate("");
    setOpen(true);
  }

  function openEdit(exam: ExamDTO) {
    setEditing(exam);
    setLabel(exam.label);
    setDate(new Date(exam.targetDate).toISOString().slice(0, 10));
    setOpen(true);
  }

  function save() {
    if (!label.trim() || !date || savingRef.current) return;
    savingRef.current = true;
    upsert.mutate({
      id: editing?.id,
      label: label.trim(),
      targetDate: new Date(date),
    });
  }

  return (
    <Card className="rounded-[4px] border-none min-w-0">
      <CardHeader className="flex-row items-center gap-2">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          {t("examCountdown")}
        </CardTitle>
        {exams.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="ms-auto"
            onClick={openAdd}
            aria-label={t("setExamDate")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {exams.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("noExamSet")}</p>
            <Button size="sm" variant="secondary" onClick={openAdd}>
              {t("setExamDate")}
            </Button>
          </div>
        ) : (
          // after
          <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,15rem))] gap-3">
            {exams.map((exam) => {
              const parts = diffParts(new Date(exam.targetDate), now);
              const isToday =
                parts &&
                parts.days === 0 &&
                parts.hours === 0 &&
                parts.minutes < 1;
              return (
                <div
                  key={exam.id}
                  className="min-w-0 rounded-[4px] border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-1">
                    <p
                      className="min-w-0 truncate text-sm font-bold"
                      title={exam.label}
                    >
                      {exam.label}
                    </p>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => openEdit(exam)}
                        aria-label={te("dialogTitleEdit")}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(exam)}
                        aria-label={te("delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {!parts ? (
                    <p className="mt-3 text-sm font-bold text-muted-foreground">
                      {te("passed")}
                    </p>
                  ) : isToday ? (
                    <p className="mt-3 text-lg font-extrabold text-primary">
                      {te("today")}
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-4 gap-1" dir="ltr">
                      <TimeUnit value={parts.days} unit={te("unitDays")} />
                      <TimeUnit value={parts.hours} unit={te("unitHours")} />
                      <TimeUnit
                        value={parts.minutes}
                        unit={te("unitMinutes")}
                      />
                      <TimeUnit
                        value={parts.seconds}
                        unit={te("unitSeconds")}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? te("dialogTitleEdit") : te("dialogTitleAdd")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{te("labelField")}</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={te("labelPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{te("dateField")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {te("cancel")}
            </Button>
            <Button
              variant="green"
              onClick={save}
              disabled={!label.trim() || !date || upsert.isPending}
            >
              {upsert.isPending ? te("saving") : te("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{te("delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {te("deleteConfirm", { label: confirmDelete?.label ?? "" })}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {te("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) remove.mutate({ id: confirmDelete.id });
                setConfirmDelete(null);
              }}
            >
              {te("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TimeUnit({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center rounded-[4px] bg-muted py-1.5">
      <span className="text-base font-extrabold tabular-nums">
        {pad(value)}
      </span>
      <span className="text-[9px] font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}
