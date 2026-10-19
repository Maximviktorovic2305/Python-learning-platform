"use client";
import { useI18n } from "@/shared/i18n";
import Link from "next/link";
import { ArrowUpRight, AlertCircle, LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
export {
  Skeleton,
  SkeletonRegion,
  SkeletonLines,
  SkeletonCode,
} from "./skeleton";
export function Button({
  children,
  className = "",
  pending = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  const { text: localize } = useI18n();

  return (
    <button
      className={`button ${pending ? "button-pending" : ""} ${className}`}
      {...props}
      disabled={pending || props.disabled}
      aria-busy={pending || undefined}
    >
      {pending && (
        <LoaderCircle className="button-loader" size={18} aria-hidden="true" />
      )}
      {localize(children)}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  const { text: localize } = useI18n();

  return (
    <Link className={`button ${secondary ? "secondary" : ""}`} href={href}>
      {localize(children)}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function Tag({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  const { text: localize } = useI18n();

  return <span className={`tag ${tone}`}>{localize(children)}</span>;
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const { text: localize } = useI18n();

  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={localize(label)}
      aria-valuenow={Math.min(100, Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  const { text: localize } = useI18n();

  return (
    <div className="state error" role="alert">
      <AlertCircle size={25} />
      <p>{localize(message)}</p>
      {retry && (
        <Button onClick={retry} className="secondary">
          {localize(" Повторить ")}
        </Button>
      )}
    </div>
  );
}
export function CachedDataNotice({
  query,
}: {
  query: { data: unknown; error: unknown; refetch: () => Promise<unknown> };
}) {
  const { text: localize } = useI18n();

  if (!query.error || query.data === undefined) return null;
  return (
    <ErrorState
      message={localize(
        "Не удалось обновить данные. Показаны последние загруженные значения.",
      )}
      retry={() => {
        void query.refetch();
      }}
    />
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { text: localize } = useI18n();

  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{localize(eyebrow)}</div>
        <h1>{localize(title)}</h1>
        {description && <p>{localize(description)}</p>}
      </div>
      {localize(action)}
    </div>
  );
}
