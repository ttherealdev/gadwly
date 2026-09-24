"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { humanTimeUntil } from "@/lib/utils";

export function ExamCountdown() {
  const t = useTranslations("dashboard");
  const te = useTranslations("exam");
  const tm = useTranslations("months");

  const utils = trpc.useUtils();
  const { data: exam } = trpc.preferences.getExamTarget.useQuery();
  const setExam = trpc.preferences.setExamTarget.useMutation({
    onSuccess: () => utils.preferences.getExamTarget.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(exam?.label ?? "arabic");
  const [date, setDate] = useState(
    exam?.targetDate ? new Date(exam.targetDate).toISOString().slice(0, 10) : ""
  );

  function save() {
    if (!date) return;
    setExam.mutate({ label, targetDate: new Date(date) });
    setOpen(false);
  }

  const humanized = exam ? humanTimeUntil(new Date(exam.targetDate)) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          {exam ? exam.label : t("examCountdown")}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants({ size: "icon", variant: "ghost" })}>
            <Pencil className="h-4 w-4" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{te("dialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{te("labelField")}</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{te("dateField")}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="green" onClick={save}>{te("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!exam ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("noExamSet")}</p>
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              {t("setExamDate")}
            </Button>
          </div>
        ) : (
          <p className="text-2xl font-extrabold text-primary">
            {humanized?.unit === "today" && te("today")}
            {humanized?.unit === "days" && te("days", { value: humanized.value })}
            {humanized?.unit === "weeks" && te("weeks", { value: humanized.value })}
            {humanized?.unit === "months" &&
              te(
                humanized.half === "early" ? "monthsEarly" : humanized.half === "mid" ? "monthsMid" : "monthsLate",
                { month: tm(String(new Date(exam.targetDate).getMonth() + 1)) }
              )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
