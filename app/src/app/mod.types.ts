export interface ModEntry {
  id: string;
  name: string;
  sourceFolderPath: string;
  importedAt: string;
  description?: string;
  approvedModId?: string;
  modioModId?: number;
  modioProfileUrl?: string;
  selectedOptions?: Record<string, boolean>;
}

export type InstallStrategy = 'direct-copy' | 'archive-overlay';

export type ModsMap = Record<string, ModEntry>;

export interface ModManifest {
  id: string;
  name: string;
  description?: string;
}

export interface ModImportError {
  code: 'empty-path' | 'manifest-parse-failure';
  message: string;
}

export interface ApprovedModOption {
  id: string;
  label: string;
  description: string;
  sourceRelativePath: string;
  relativeTargetPath: string;
  installStrategy: InstallStrategy;
  lockedChecked?: boolean;
  includeInDeploy?: boolean;
}

export interface ApprovedModInstallStep {
  sourceRelativePath: string;
  relativeTargetPath: string;
  installStrategy: InstallStrategy;
}

export interface ApprovedModDefinition {
  id: string;
  name: string;
  modIoUrl: string;
  downloadUrl: string;
  description: string;
  baseInstallSteps: ApprovedModInstallStep[];
  options: ApprovedModOption[];
}
