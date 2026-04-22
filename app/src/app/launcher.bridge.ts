import { tauriInvoke } from "./tauri.bridge";

export async function launchExecutable(executablePath: string): Promise<boolean> {
  try {
    await tauriInvoke("launch_game", { executablePath });
    return true;
  } catch {
    return false;
  }
}
