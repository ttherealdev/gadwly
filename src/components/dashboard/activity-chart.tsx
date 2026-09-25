"use client";

import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityChart({
  data,
}: {
  data: { day: string; last: number; current: number }[];
}) {
  const t = useTranslations("dashboard");

  return (
    <Card className="rounded-[4px] border-none">
      <CardHeader>
        <CardTitle>{t("weeklyActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
              }}
            />
            <Line
              type="monotone"
              dataKey="last"
              stroke="#2f4bd6"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#55b649"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
