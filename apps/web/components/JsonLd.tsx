/**
 * Renders JSON-LD structured data as a <script> tag.
 * Usage: <JsonLd data={jsonLdSoftware()} />
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(Array.isArray(data) ? data : [data]);
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint: intentional dangerouslySetInnerHTML for JSON-LD
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
