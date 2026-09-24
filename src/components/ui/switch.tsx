"use client";
import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted transition-colors data-[checked]:bg-accent-green",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform translate-x-0.5 data-[checked]:translate-x-[18px] rtl:data-[checked]:-translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
