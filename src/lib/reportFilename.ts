type BuildReportFilenameInput = {
  modeId: string;
  reportType: string;
  variety?: string;
  process?: string;
  contentDisposition?: string | null;
  fallbackExtension?: string;
};

const CONTENT_DISPOSITION_FILENAME_REGEX = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i;

const sanitizePart = (value?: string): string => {
  if (!value) return "unknown";
  const trimmed = value.trim();
  if (!trimmed) return "unknown";
  return trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
};

const extractFilenameFromDisposition = (contentDisposition?: string | null): string | null => {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(CONTENT_DISPOSITION_FILENAME_REGEX);
  if (!match?.[1]) return null;
  return match[1].replace(/['"]/g, "");
};

const extractExtension = (filename?: string | null): string | null => {
  if (!filename) return null;
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === filename.length - 1) return null;
  return filename.slice(dotIndex);
};

const normalizeReportTypeForFilename = (reportType: string): string => {
  if (reportType === "milled-rice") return "milledrice";
  return reportType.toLowerCase();
};

export const buildReportFilename = ({
  modeId,
  reportType,
  variety,
  process,
  contentDisposition,
  fallbackExtension = ".pdf",
}: BuildReportFilenameInput): string => {
  const headerFilename = extractFilenameFromDisposition(contentDisposition);
  const extension = extractExtension(headerFilename) ?? fallbackExtension;

  return [
    sanitizePart(modeId),
    sanitizePart(normalizeReportTypeForFilename(reportType)),
    sanitizePart(variety),
    sanitizePart(process),
  ].join("_") + extension;
};
