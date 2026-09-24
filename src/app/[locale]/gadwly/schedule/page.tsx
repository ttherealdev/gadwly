import { getTranslations, setRequestLocale } from "next-intl/server";
import { Topbar } from "@/components/topbar";
import { ScheduleTable } from "@/components/schedule/schedule-table";
import { requireSession } from "@/lib/require-session";

export default async function SchedulePage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSession(locale);
  const t = await getTranslations("nav");

  return (
    <>
      <Topbar title={t("schedule")} />
      <main className="flex-1 p-6">
        <ScheduleTable />
      </main>
    </>
  );
}
