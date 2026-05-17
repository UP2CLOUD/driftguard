type Messages = Record<string, unknown>;

function getNested(messages: Messages, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as object)) {
      return (acc as Messages)[part];
    }
    return undefined;
  }, messages);

  return typeof value === "string" ? value : undefined;
}

export function createTranslator(messages: Messages) {
  return function t(key: string, values?: Record<string, string | number>) {
    const template = getNested(messages, key) ?? key;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) =>
      values[name] !== undefined ? String(values[name]) : `{${name}}`
    );
  };
}
