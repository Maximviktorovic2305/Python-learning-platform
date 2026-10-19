"use client";
import { useI18n } from "@/shared/i18n";

import { HAS_ANALYTICS } from "@/shared/config";
import { openPrivacySettings } from "@/shared/lib/privacy-choice";
import { Button } from "@/shared/ui";

export function PrivacySettingsButton() {
  const { text: localize } = useI18n();

  return HAS_ANALYTICS ? (
    <Button className="secondary" onClick={openPrivacySettings}>
      {localize(" Настройки аналитики и cookie ")}
    </Button>
  ) : null;
}
