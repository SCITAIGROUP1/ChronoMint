import { parseContentDispositionFilename } from "@chronomint/contracts";

export async function saveDownloadResponse(
  res: Response,
  fallbackFilename: string
): Promise<void> {
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const filename =
    parseContentDispositionFilename(res.headers.get("content-disposition")) ??
    fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
