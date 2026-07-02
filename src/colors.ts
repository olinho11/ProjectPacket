export interface ParsedColor {
  label: string;
  value: string;
}

const HEX_VALUE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_IN_TEXT = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const HASH_TOKEN = /#[^\s,;:)]+/g;

export function isColorItem(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  return text.includes("color") || text.includes("colour") || text.includes("hex");
}

export function parseColorSwatches(text = ""): ParsedColor[] {
  const segments = text.split(/[\n,;]+/);

  return segments.flatMap((segment) => {
    const matches = segment.match(HEX_IN_TEXT) ?? [];
    return matches.map((value) => ({
      value: normalizeHex(value),
      label: labelForSegment(segment, value)
    }));
  });
}

export function invalidHexTokens(text = "") {
  const tokens = text.match(HASH_TOKEN) ?? [];
  return tokens.filter((token) => !HEX_VALUE.test(token));
}

export function hasValidHex(text = "") {
  return parseColorSwatches(text).length > 0;
}

function normalizeHex(value: string) {
  return value.toUpperCase();
}

function labelForSegment(segment: string, value: string) {
  const before = segment.slice(0, segment.indexOf(value)).replace(/[:=-]/g, " ").trim();
  const cleaned = before.split(/\s+/).filter(Boolean).slice(-2).join(" ");
  return cleaned || "Color";
}
