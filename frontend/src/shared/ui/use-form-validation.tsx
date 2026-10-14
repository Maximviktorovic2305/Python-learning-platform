"use client";
import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type FocusEvent,
} from "react";
import { serverFieldErrors, type FormRules } from "../lib/form-validation";

export function useFormValidation(
  rules: FormRules,
  initial: Record<string, string | boolean> = {},
) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(rules).map(([name, rule]) => [
        name,
        rule.validate(initial[name] ?? ""),
      ]),
    ),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const readErrors = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return Object.fromEntries(
      Object.entries(rules).map(([name, rule]) => {
        const control = form.elements.namedItem(name);
        const value =
          control instanceof HTMLInputElement && control.type === "checkbox"
            ? control.checked
            : String(data.get(name) ?? "");
        return [name, rule.validate(value)];
      }),
    );
  };
  const update = (
    event: FormEvent<HTMLFormElement> | FocusEvent<HTMLFormElement>,
  ) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) ||
      !rules[target.name]
    )
      return;
    setErrors(readErrors(event.currentTarget));
    setTouched((previous) => ({ ...previous, [target.name]: true }));
    if (event.type !== "blur")
      setServerErrors((previous) => ({ ...previous, [target.name]: "" }));
  };
  const error = (name: string) =>
    serverErrors[name] || (touched[name] ? errors[name] : "") || "";
  return {
    formProps: { ref, noValidate: true, onBlur: update },
    onChange: update,
    valid:
      !Object.values(errors).some(Boolean) &&
      !Object.values(serverErrors).some(Boolean),
    field: (name: string) => ({
      id: `${id}-${name}`,
      "aria-label": rules[name]?.label,
      "aria-invalid": error(name) ? (true as const) : undefined,
      "aria-describedby": error(name) ? `${id}-${name}-error` : undefined,
    }),
    error: (name: string) => (
      <FieldError id={`${id}-${name}-error`} message={error(name)} />
    ),
    acceptServerError: (requestError: Error) =>
      setServerErrors(serverFieldErrors(requestError, rules)),
    validate: (form: HTMLFormElement) => {
      const current = readErrors(form);
      setErrors(current);
      setTouched(
        Object.fromEntries(Object.keys(rules).map((name) => [name, true])),
      );
      return (
        !Object.values(current).some(Boolean) &&
        !Object.values(serverErrors).some(Boolean)
      );
    },
  };
}
export type FormValidation = ReturnType<typeof useFormValidation>;

function FieldError({ id, message }: { id: string; message: string }) {
  return message ? (
    <span id={id} className="field-error" aria-live="polite">
      {message}
    </span>
  ) : null;
}
