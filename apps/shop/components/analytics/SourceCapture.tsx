"use client";

import { useEffect } from "react";
import { captureSource } from "@/lib/utm";

/** Stores the landing utm_* for the session (any entry page). Renders nothing. */
export function SourceCapture() {
  useEffect(() => {
    captureSource();
  }, []);
  return null;
}
