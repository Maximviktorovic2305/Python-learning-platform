import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Allow crawlers to read noindex on account pages. robots.txt is not
      // access control, and blocking them would hide their noindex directives.
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
