const URL_PREFIX_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const WINDOWS_ABSOLUTE_RE = /^[a-z]:[\\/]/i;
const POSIX_ABSOLUTE_RE = /^\/(?!uploads\/|users\/)/i;
const IMAGE_PROCESS_MARKERS = ["!", "?image_process=", "?x-oss-process=", "?imageMogr2", "?tr="];

function stripKnownImageParams(value: string) {
  let result = value;
  for (const marker of IMAGE_PROCESS_MARKERS) {
    const index = result.indexOf(marker);
    if (index >= 0) result = result.slice(0, index);
  }
  return result;
}

function cleanRelativeKey(value: string) {
  const withoutQuery = stripKnownImageParams(value.trim()).split("#")[0].split("?")[0];
  const normalized = withoutQuery.replace(/\\/g, "/").replace(/^\/+/, "");
  const withoutUploads = normalized.replace(/^uploads\//i, "");
  if (!withoutUploads || withoutUploads.includes("..")) return "";
  return withoutUploads;
}

export function normalizeImageKey(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(data|blob):/i.test(trimmed)) return "";
  if (WINDOWS_ABSOLUTE_RE.test(trimmed) || POSIX_ABSOLUTE_RE.test(trimmed)) return "";

  if (URL_PREFIX_RE.test(trimmed)) {
    try {
      const url = new URL(stripKnownImageParams(trimmed));
      const pathname = decodeURIComponent(url.pathname);
      if (!/^\/?(uploads\/|users\/)/i.test(pathname.replace(/^\/+/, ""))) return "";
      return cleanRelativeKey(pathname);
    } catch {
      return "";
    }
  }

  return cleanRelativeKey(trimmed);
}

export function normalizeImageKeyArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeImageKey(item)).filter(Boolean);
}
