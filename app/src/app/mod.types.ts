export interface ModEntry {
  id: string;
  name: string;
  sourceFolderPath: string;
  importedAt: string;
  description?: string;
}

export type ModsMap = Record<string, ModEntry>;

export interface ModManifest {
  id: string;
  name: string;
  description?: string;
}

export interface ModImportError {
  code: "empty-path" | "manifest-parse-failure";
  message: string;
}
