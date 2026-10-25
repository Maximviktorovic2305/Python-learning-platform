import { serializeJsonLd } from "@/shared/lib/seo-data";
import { headers } from "next/headers";

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script type="application/ld+json" nonce={nonce}>
      {serializeJsonLd(data)}
    </script>
  );
}
