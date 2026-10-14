import Link from "next/link";
import { LEGAL_ROUTES } from "@/shared/config";
import styles from "./Legal.module.css";
import type { FormValidation } from "../use-form-validation";
export function ConsentFields({ validation }: { validation: FormValidation }) {
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
          Принимаю{" "}
          <Link
            href={LEGAL_ROUTES.terms}
            target="_blank"
            rel="noopener noreferrer"
          >
            условия использования
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
          Даю{" "}
          <Link
            href={LEGAL_ROUTES.consent}
            target="_blank"
            rel="noopener noreferrer"
          >
            согласие на обработку персональных данных
          </Link>
          .{" "}
          <Link
            href={LEGAL_ROUTES.privacy}
            target="_blank"
            rel="noopener noreferrer"
          >
            Политика конфиденциальности
          </Link>
          .
        </span>
      </label>
      {validation.error("acceptDataProcessing")}
    </div>
  );
}
