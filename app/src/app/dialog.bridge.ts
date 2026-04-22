import { open } from "@tauri-apps/plugin-dialog";

export async function pickDirectory(): Promise<string | null> {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Game Install Folder",
    });

    return typeof selected === "string" ? selected : null;
  } catch {
    return null;
  }
}
