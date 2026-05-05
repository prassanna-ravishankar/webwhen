import { generateOrganizationStructuredData } from "@/utils/structuredData";
import { escapeForScriptTag } from "@/utils/jsonLd";

// Top-level Organization schema, routed through getOrigin() so each
// environment declares its own origin (webwhen.ai in prod, the override in
// staging). Replaces the static block in index.html that hardcoded
// https://webwhen.ai on every environment. See #282.
export function OrganizationJsonLd() {
  const json = JSON.stringify(generateOrganizationStructuredData());
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeForScriptTag(json) }}
    />
  );
}
