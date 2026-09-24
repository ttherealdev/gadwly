import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListTodo, Clock3, CheckCheck, Flame } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ExamCountdown } from "@/components/countdown/exam-countdown";
import { PrayerWidget } from "@/components/prayer/prayer-widget";
import { requireSession } from "@/lib/require-session";
import { db } from "@/lib/db";

const weeklyPlaceholder = [
  { day: "SAT", last: 1, current: 0 },
  { day: "SUN", last: 2, current: 0 },
  { day: "MON", last: 0, current: 0 },
  { day: "TUE", last: 1, current: 0 },
  { day: "WED", last: 0, current: 0 },
  { day: "THU", last: 0, current: 1 },
  { day: "FRI", last: 0, current: 2 },
];

export default async function DashboardPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession(locale);

  const t = await getTranslations("dashboard");
  const td = await getTranslations("days");

  const items = await db.scheduleItem.findMany({ where: { userId: session.user.id } });
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3).toUpperCase();
  const dayMap: Record<string, string> = { SAT: "SAT", SUN: "SUN", MON: "MON", TUE: "TUE", WED: "WED", THU: "THU", FRI: "FRI" };
  const todayKey = dayMap[today] ?? "SAT";
  const todayItems = items.filter((i) => i.day === todayKey);
  const completed = items.filter((i) => i.status === "DONE").length;

  const chartData = weeklyPlaceholder.map((d) => ({ ...d, day: td(d.day as any) }));

  return (
    <>
      <Topbar title={t("greeting", { name: session.user.name?.split(" ")[0] ?? "" })} />
      <main className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={ListTodo} value={todayItems.length} label={t("tasksToday")} tint="primary" />
          <StatCard
            icon={Clock3}
            value={items.length}
            label={t("hoursPlanned")}
            tint="amber"
          />
          <StatCard icon={CheckCheck} value={completed} label={t("completed")} tint="green" />
          <StatCard icon={Flame} value={0} label={t("streak")} tint="primary" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ExamCountdown />
          <PrayerWidget />
        </div>

        <ActivityChart data={chartData} />
      </main>
    </>
  );
}
