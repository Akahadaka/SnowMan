import type { ApprovedModDefinition } from '../mod.types';

export const realLifeFixture: ApprovedModDefinition = {
  id: 'real-life-mod',
  name: 'Real Life Mod',
  modIoUrl: 'https://mod.io/g/snowrunner/m/real-life-mod#description',
  downloadUrl: 'https://example.invalid/real-life-mod.zip',
  description: 'Fixture for archive-overlay strategy.',
  baseInstallSteps: [
    {
      sourceRelativePath: 'media',
      relativeTargetPath: 'en_us/preload/paks/client/initial.pak',
      installStrategy: 'archive-overlay',
    },
    {
      sourceRelativePath: 'strings',
      relativeTargetPath: 'en_us/preload/paks/client/initial.pak',
      installStrategy: 'archive-overlay',
    },
  ],
  options: [
    {
      id: 'no-recovery',
      label: 'No Recovery',
      description: 'Optional overlay.',
      sourceRelativePath: 'options/no-recovery/media',
      relativeTargetPath: 'en_us/preload/paks/client/initial.pak',
      installStrategy: 'archive-overlay',
    },
  ],
};

export const directCopyFixture: ApprovedModDefinition = {
  id: 'simple-file-mod',
  name: 'Simple File Mod',
  modIoUrl: 'https://example.invalid/mod',
  downloadUrl: 'https://example.invalid/mod.zip',
  description: 'Fixture for direct-copy strategy.',
  baseInstallSteps: [
    {
      sourceRelativePath: 'config/my-config.xml',
      relativeTargetPath: 'en_us/preload/config/my-config.xml',
      installStrategy: 'direct-copy',
    },
  ],
  options: [],
};
