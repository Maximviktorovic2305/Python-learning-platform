"use client";
import { useI18n } from "@/shared/i18n";
import type { CSSProperties, ReactNode } from "react";

export function Skeleton({
  width,
  height,
  circle = false,
  className = "",
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  circle?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`skeleton ${circle ? "skeleton-circle" : ""} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRegion({
  children,
  label = "Загружаем данные…",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const { text: localize } = useI18n();

  return (
    <div className={`skeleton-region ${className}`} role="status">
      <span className="sr-only">{localize(label)}</span>
      <div aria-hidden="true">{localize(children)}</div>
    </div>
  );
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  const widths = ["100%", "92%", "72%", "84%"];
  return (
    <div className="skeleton-lines">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} width={widths[index % widths.length]} />
      ))}
    </div>
  );
}

export function SkeletonCode({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-code">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Skeleton width={12} height={12} />
          <Skeleton width={`${[58, 74, 43, 66, 35][index % 5]}%`} height={12} />
        </div>
      ))}
    </div>
  );
}
