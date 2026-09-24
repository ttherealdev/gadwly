import { BookA } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";


export function NotFoundView({ fullScreen = true, gadwlyPages = false }: { fullScreen?: boolean, gadwlyPages?: boolean }) {
  const t = useTranslations("notFound");
  const Wrapper = fullScreen ? "main" : "div";

  return (
    <Wrapper
      className={cn(
        "grid place-items-center px-6 py-16",
        fullScreen ? "min-h-dvh" : "min-h-[60dvh]",
      )}
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <div
          dir="ltr"
          aria-hidden
          className="flex items-center text-[7rem] font-extrabold leading-none text-primary sm:text-[10rem]"
        >
          <span>4</span>
          <BookA className="size-[0.75em]" strokeWidth={1.25} />
          <span>4</span>
        </div>

        <h1 className="mt-8 text-2xl font-extrabold sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          {t("description")}
        </p>

        <Link
          href={gadwlyPages ? "/gadwly" : "/"}
          className={cn(buttonVariants({ size: "lg" }), "mt-8")}
        >
          {t("backHome")}
        </Link>
      </div>
    </Wrapper>
  );
}
