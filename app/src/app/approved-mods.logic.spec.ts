import { describe, expect, it } from 'vitest';
import { buildCandidatesForApprovedDefinition } from './approved-mods.logic';
import { directCopyFixture, realLifeFixture } from './fixtures/approved-mods.fixtures';
import type { ModEntry } from './mod.types';

describe('approved mods strategy planning', () => {
  it('builds archive-overlay candidates for base and selected option steps', () => {
    const modEntry: ModEntry = {
      id: 'real-life-mod',
      name: 'Real Life Mod',
      sourceFolderPath: 'D:/game/downloaded/real-life-mod',
      importedAt: '2026-01-01T00:00:00.000Z',
      approvedModId: 'real-life-mod',
      selectedOptions: { 'no-recovery': true },
    };

    const candidates = buildCandidatesForApprovedDefinition(modEntry, realLifeFixture);

    expect(candidates).toHaveLength(3);
    expect(candidates.every((entry) => entry.installStrategy === 'archive-overlay')).toBe(true);
    expect(
      candidates.every(
        (entry) => entry.relativeTargetPath === 'en_us/preload/paks/client/initial.pak',
      ),
    ).toBe(true);
  });

  it('builds direct-copy candidate when definition uses direct-copy strategy', () => {
    const modEntry: ModEntry = {
      id: 'simple-file-mod',
      name: 'Simple File Mod',
      sourceFolderPath: 'D:/game/downloaded/simple-file-mod',
      importedAt: '2026-01-01T00:00:00.000Z',
      approvedModId: 'simple-file-mod',
      selectedOptions: {},
    };

    const candidates = buildCandidatesForApprovedDefinition(modEntry, directCopyFixture);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].installStrategy).toBe('direct-copy');
    expect(candidates[0].relativeTargetPath).toBe('en_us/preload/config/my-config.xml');
  });
});
