"use client";

import { User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  name?: string | null;
  image?: string | null;
  className?: string;
};

/** The image URL is user-controlled data: only ever render https URLs. */
function toSafeSrc(image?: string | null) {
  return image && /^https:\/\//i.test(image) ? image : null;
}

/** Up to two initials. Array.from keeps multi-unit characters intact. */
function getInitials(name?: string | null) {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase();
}

/**
 * Deliberately a plain <img> instead of the shadcn/Base UI Avatar:
 * - Google's avatar CDN can answer 403 when a Referer is sent, and
 *   `referrerPolicy="no-referrer"` fixes it. Base UI preloads the image in a
 *   separate probe before rendering it, and that probe did not forward
 *   referrerPolicy in the versions I checked, so the image never showed.
 * - No preload means no second request and no fallback flash on hydration.
 * - next/image would need remotePatterns and adds a server hop for a 36px icon.
 * The parent decides size and shape; this fills it and inherits the radius.
 */
export function UserAvatar({ name, image, className }: Props) {
  const src = toSafeSrc(image);
  // Remember which src failed, so a new src gets a fresh attempt without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = getInitials(name);

  return (
    <span
      className={cn(
        "grid size-full place-items-center overflow-hidden rounded-[inherit] bg-white/20 text-sm font-bold",
        className,
      )}
    >
      {src && src !== failedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          draggable={false}
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : initials ? (
        <span aria-hidden>{initials}</span>
      ) : (
        <User className="size-4" aria-hidden />
      )}
    </span>
  );
}
