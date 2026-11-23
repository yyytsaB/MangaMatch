"use client";

import { useState } from "react";
import { cn } from "@/lib/ui";

/**
 * Cover art filling its 2:3 slot. Lazy-loaded plain <img> (AniList's CDN
 * already serves sized covers), falling back to the title set in type when
 * there is no cover or the image fails to load.
 */
export default function CoverImage({
  src,
  alt,
  imgClassName,
  priority = false,
  decorative = false,
}: {
  src: string | null;
  alt: string;
  imgClassName?: string;
  /** Eager-load above-the-fold covers (detail page hero). */
  priority?: boolean;
  /** The title is already announced next to the cover (cards, rows). */
  decorative?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div aria-hidden={decorative || undefined} className="flex h-full w-full items-center justify-center bg-ink p-3 text-center">
        <span className="line-clamp-4 font-display text-xs font-medium leading-snug text-muted">{alt}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(img) => {
        // A server-rendered image can fail before React attaches onError.
        if (img?.complete && img.naturalWidth === 0) setFailedSrc(src);
      }}
      src={src}
      alt={decorative ? "" : alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={cn("h-full w-full object-cover", imgClassName)}
    />
  );
}
