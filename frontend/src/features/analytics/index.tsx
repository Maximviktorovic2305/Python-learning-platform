"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { YANDEX_METRIKA_ID } from "@/shared/config";
import { usePrivacyChoice } from "@/shared/lib/privacy-choice";
import {
  startMetrika,
  stopMetrika,
  trackMetrikaPage,
} from "@/shared/lib/metrika";

export function Analytics() {
  const pathname = usePathname();
  const choice = usePrivacyChoice();
  useEffect(() => {
    if (YANDEX_METRIKA_ID === null || choice !== "analytics") {
      stopMetrika();
      return;
    }
    startMetrika(YANDEX_METRIKA_ID);
    trackMetrikaPage(pathname);
  }, [choice, pathname]);
  return null;
}
