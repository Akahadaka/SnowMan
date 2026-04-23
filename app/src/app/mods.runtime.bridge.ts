import { tauriInvoke } from "./tauri.bridge";

export async function downloadAndExtractZip(
  url: string,
  destinationPath: string,
): Promise<string | null> {
  try {
    const extractedPath = await tauriInvoke("download_and_extract_zip", {
      url,
      destinationPath,
    });
    return extractedPath;
  } catch {
    return null;
  }
}
