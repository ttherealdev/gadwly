import * as React from "react";
import { cn } from "@/lib/utils";

// A plain, semantic <label> rather than a headless-library primitive:
// Base UI's label story is folded into `Field.Root` + `Field.Label` for
// full form validation (see base-ui.com/react/components/field), which
// is more machinery than a form pairs with `htmlFor`/`id` needs here.
// Swap this for Field.Label if/when real client-side validation is added.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
