// Escape contract for inline JSON-LD inside a <script> tag. Backslashes
// first so subsequent replacements don't double-escape their own output.
// `<` blocks any closing-tag literal forming inside the body. `/` breaks any
// `</script>` an entry could smuggle. U+2028 and U+2029 are legal in JSON
// but illegal in pre-ES2019 JS string literals (historic XSS vector).
// Source is trusted today (we author the data); the escape is the
// serialization-boundary contract, not user-input defence. Built via
// fromCharCode so source files stay free of literal U+2028/U+2029 that some
// tooling silently normalises.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

export function escapeForScriptTag(json: string): string {
  return json
    .replace(/\\/g, "\\\\")
    .replace(/</g, "\\u003c")
    .replace(/\//g, "\\/")
    .split(LS).join("\\u2028")
    .split(PS).join("\\u2029");
}
