export interface ParsedColor {
  label: string;
  value: string;
}

const HEX_VALUE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_IN_TEXT = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const HASH_TOKEN = /#[^\s,;:)]+/g;
const DEFAULT_BRAND_COLOR = "#0f766e";
const INK_COLOR = "#1f2421";

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

export function normalizeBrandColor(value = "", fallback = DEFAULT_BRAND_COLOR) {
  const trimmed = value.trim();

  if (!HEX_VALUE.test(trimmed)) {
    return fallback;
  }

  if (trimmed.length === 4) {
    return `#${trimmed.slice(1).split("").map((character) => character.repeat(2)).join("")}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

export function brandForeground(value = "") {
  const brandColor = normalizeBrandColor(value);
  const brandLuminance = relativeLuminance(brandColor);
  const inkLuminance = relativeLuminance(INK_COLOR);
  const whiteContrast = 1.05 / (brandLuminance + 0.05);
  const inkContrast = (brandLuminance + 0.05) / (inkLuminance + 0.05);

  return inkContrast >= whiteContrast ? INK_COLOR : "#ffffff";
}

function normalizeHex(value: string) {
  return value.toUpperCase();
}

function relativeLuminance(value: string) {
  const hex = normalizeBrandColor(value).slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function labelForSegment(segment: string, value: string) {
  const before = segment.slice(0, segment.indexOf(value)).replace(/[:=-]/g, " ").trim();
  const cleaned = before.split(/\s+/).filter(Boolean).slice(-2).join(" ");
  return cleaned || "Color";
}
