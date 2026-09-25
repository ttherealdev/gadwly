"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { DAYS, CATEGORIES, type Day, type Category, type ScheduleItemDTO } from "./constants";


export function TaskDialog({
  open,
  onOpenChange,
  item,
  prefill,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: ScheduleItemDTO | null;
  prefill?: { day: Day; startTime: string; endTime: string };
}) {
  const t = useTranslations("schedule");
  const td = useTranslations("days");
  const tc = useTranslations("schedule.category");
  const utils = trpc.useUtils();
  const savingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const upsert = trpc.schedule.upsert.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      onOpenChange(false);
      setErrorMsg(null);
    },
    onError: (err) =>
      setErrorMsg(err.message === "DUPLICATE_TASK" ? t("form.errorDuplicate") : err.message),
    onSettled: () => {
      savingRef.current = false;
    },
  });

  const [day, setDay] = useState<Day>("SAT");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("STUDY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [notes, setNotes] = useState("");

    useEffect(() => {
    if (item) {
      setDay(item.day);
      setTitle(item.title);
      setCategory(item.category);
      setStartTime(item.startTime);
      setEndTime(item.endTime);
      setNotes(item.notes ?? "");
      setPendingId(item.id);
    } else {
      setDay(prefill?.day ?? "SAT");
      setTitle("");
      setCategory("STUDY");
      setStartTime(prefill?.startTime ?? "09:00");
      setEndTime(prefill?.endTime ?? "11:00");
      setNotes("");
      setPendingId(crypto.randomUUID());
    }
    setErrorMsg(null);
  }, [item, open, prefill]);

  function save() {
    if (!title.trim() || savingRef.current || !pendingId) return;
    savingRef.current = true;
    upsert.mutate({
      id: pendingId,
      day,
      title: title.trim(),
      category,
      startTime,
      endTime,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
         <DialogHeader>
          <DialogTitle>{item ? t("editTask") : t("addTask")}</DialogTitle>
        </DialogHeader>

        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("table.day")}</Label>
              <Select value={day} onValueChange={(v) => setDay(v as Day)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d} value={d}>{td(d)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("table.category")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{tc(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("table.activity")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("form.titlePlaceholder")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("table.start")}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("table.end")}</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("form.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("form.notesPlaceholder")} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t("form.cancel")}</Button>
          <Button variant="green" onClick={save} disabled={!title.trim() || upsert.isPending}>
            {upsert.isPending ? t("form.saving") : t("form.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
