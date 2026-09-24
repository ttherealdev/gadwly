import { getTranslations, setRequestLocale } from "next-intl/server";
import { Topbar } from "@/components/topbar";
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";
import { requireSession } from "@/lib/require-session";

export default async function CounterPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSession(locale);
  const t = await getTranslations("nav");

  return (
    <>
      <Topbar title={t("counter")} />
      <main className="flex-1 p-6">
        <PomodoroTimer />
      </main>
    </>
  );
}
