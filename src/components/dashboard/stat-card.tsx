import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  value,
  label,
  tint = "primary",
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tint?: "primary" | "green" | "amber";
}) {
  const tintClass = {
    primary: "bg-primary/10 text-primary",
    green: "bg-accent-green/10 text-accent-green",
    amber: "bg-amber-500/10 text-amber-500",
  }[tint];

  return (
    <Card className="rounded-[4px] border-none">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-[4px]",
            tintClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-none">{value}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
