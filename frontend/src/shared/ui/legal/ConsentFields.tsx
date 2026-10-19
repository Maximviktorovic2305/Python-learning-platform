"use client";
import { useI18n } from "@/shared/i18n";
import Link from "next/link";
import { LEGAL_ROUTES } from "@/shared/config";
import styles from "./Legal.module.css";
import type { FormValidation } from "../use-form-validation";
export function ConsentFields({ validation }: { validation: FormValidation }) {
  const { text: localize } = useI18n();

  return (
    <div className={styles.consentChecks}>
      <label>
        <input
          type="checkbox"
          name="acceptTerms"
          required
          {...validation.field("acceptTerms")}
        />
        <span>
          {localize(" Принимаю")}{" "}
          <Link
            href={LEGAL_ROUTES.terms}
            target="_blank"
            rel="noopener noreferrer"
          >
            {localize(" условия использования ")}
          </Link>
          .
        </span>
      </label>
      {validation.error("acceptTerms")}
      <label>
        <input
          type="checkbox"
          name="acceptDataProcessing"
          required
          {...validation.field("acceptDataProcessing")}
        />
        <span>
          {localize(" Даю")}{" "}
          <Link
            href={LEGAL_ROUTES.consent}
            target="_blank"
            rel="noopener noreferrer"
          >
            {localize(" согласие на обработку персональных данных ")}
          </Link>
          .{" "}
          <Link
            href={LEGAL_ROUTES.privacy}
            target="_blank"
            rel="noopener noreferrer"
          >
            {localize(" Политика конфиденциальности ")}
          </Link>
          .
        </span>
      </label>
      {validation.error("acceptDataProcessing")}
    </div>
  );
}
