import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/quan-tri", "/api/", "/dang-nhap", "/dang-ky", "/tai-khoan"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
