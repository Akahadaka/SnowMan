import type { TauriInvokeFn } from "./tauri.bridge";

export function getAppTitle(): string {
  return "SnowMan";
}

export async function fetchPing(invokeFn: TauriInvokeFn): Promise<string> {
  return invokeFn("ping");
}
