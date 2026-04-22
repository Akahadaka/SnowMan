export type InvokeFn = (command: string) => Promise<string>;

export function getAppTitle(): string {
  return "Snowman";
}

export async function fetchPing(invokeFn: InvokeFn): Promise<string> {
  return invokeFn("ping");
}
