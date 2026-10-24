import { serializeJsonLd } from "@/shared/lib/seo-data";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
