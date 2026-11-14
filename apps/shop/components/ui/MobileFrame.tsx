import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface MobileFrameProps {
  className?: string;
  children?: ReactNode;
}

/** Client views are constrained to 480px, centred (in production the frame is just max-width + margin auto). */
export function MobileFrame({ className, children }: MobileFrameProps) {
  return <div className={cx("relative mx-auto w-full max-w-120 bg-surface", className)}>{children}</div>;
}
