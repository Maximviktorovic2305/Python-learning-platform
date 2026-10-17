"use client";
import { HAS_ANALYTICS } from "@/shared/config";
import { openPrivacySettings } from "@/shared/lib/privacy-choice";
import { Button } from "@/shared/ui";

export function PrivacySettingsButton() {
  return HAS_ANALYTICS ? (
    <Button className="secondary" onClick={openPrivacySettings}>
      Настройки аналитики и cookie
    </Button>
  ) : null;
}
