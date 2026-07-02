export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_LABEL = "25 MB";

export const SENSITIVE_UPLOAD_WARNING =
  "ProjectPacket is for creative project assets only. Do not upload tax records, legal documents, medical records, government IDs, passwords, payment details, or highly sensitive personal information.";

export const CREATIVE_ASSET_CONFIRMATION =
  "I understand this packet is for creative project assets only.";

export const ALLOWED_UPLOAD_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "pdf",
  "zip",
  "doc",
  "docx",
  "txt",
  "mp4",
  "mov"
] as const;

export const BLOCKED_UPLOAD_EXTENSIONS = [
  "exe",
  "dmg",
  "pkg",
  "app",
  "js",
  "sh",
  "bat",
  "cmd",
  "php",
  "py",
  "rb",
  "jar",
  "scr",
  "msi"
] as const;

const allowedMimeTypesByExtension: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  svg: ["image/svg+xml"],
  pdf: ["application/pdf"],
  zip: ["application/zip", "application/x-zip-compressed", "multipart/x-zip"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
  mp4: ["video/mp4"],
  mov: ["video/quicktime", "video/mp4"]
};

export const FILE_ACCEPT_ATTRIBUTE = [
  ...ALLOWED_UPLOAD_EXTENSIONS.map((extension) => `.${extension}`),
  ...Object.values(allowedMimeTypesByExtension).flat()
].join(",");

export function validateCreativeAssetFile(input: {
  fileName: string;
  size: number;
  contentType?: string;
}) {
  if (input.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: "File is too large. Please upload a file under 25 MB."
    };
  }

  const extension = getFileExtension(input.fileName);

  if (!extension) {
    return {
      valid: false,
      error: "This file type is not allowed. ProjectPacket only accepts common creative asset files."
    };
  }

  if (
    BLOCKED_UPLOAD_EXTENSIONS.includes(extension as (typeof BLOCKED_UPLOAD_EXTENSIONS)[number]) ||
    !ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])
  ) {
    return {
      valid: false,
      error: "This file type is not allowed. ProjectPacket only accepts common creative asset files."
    };
  }

  const contentType = (input.contentType ?? "").toLowerCase();
  const allowedMimeTypes = allowedMimeTypesByExtension[extension] ?? [];
  const browserDidNotKnowType = !contentType || contentType === "application/octet-stream";

  if (!browserDidNotKnowType && allowedMimeTypes.length && !allowedMimeTypes.includes(contentType)) {
    return {
      valid: false,
      error: "This file type is not allowed. ProjectPacket only accepts common creative asset files."
    };
  }

  return { valid: true, error: "" };
}

export function getFileExtension(fileName: string) {
  const cleanName = fileName.trim().toLowerCase();
  const lastDot = cleanName.lastIndexOf(".");

  if (lastDot < 0 || lastDot === cleanName.length - 1) {
    return "";
  }

  return cleanName.slice(lastDot + 1);
}

export function allowedUploadSummary() {
  return `${ALLOWED_UPLOAD_EXTENSIONS.join(", ")} under ${MAX_UPLOAD_SIZE_LABEL}`;
}
