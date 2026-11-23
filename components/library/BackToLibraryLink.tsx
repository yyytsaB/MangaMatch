"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/Icons";
import { rememberedLibraryHref } from "@/lib/library-view";
import { buttonClass, cn } from "@/lib/ui";

const noSubscription = () => () => {};

/** Returns to the shelf exactly as it was filtered, sorted, and laid out. */
export default function BackToLibraryLink() {
  const href = useSyncExternalStore(noSubscription, rememberedLibraryHref, () => "/library");

  return (
    <Link href={href} className={cn(buttonClass("ghost", "sm"), "-ml-3")}>
      <ArrowLeftIcon size={14} />
      Back to library
    </Link>
  );
}
