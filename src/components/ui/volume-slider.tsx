import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
};


export function VolumeSlider({
  value,
  onValueChange,
  className,
  style,
  ...props
}: Props) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      {...props}
      value={value}
      onChange={(e) => onValueChange(e.currentTarget.valueAsNumber)}
      className={cn("volume-slider text-primary", className)}
      // --p (0..1) drives the filled part of the track in CSS
      style={{ ...style, "--p": value / 100 } as CSSProperties}
    />
  );

}
