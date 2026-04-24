import { describe, expect, it } from 'vitest';
import { evaluateLaunchReadiness, executeControlledDeploy, planRestore } from './deploy-execution';
import type { DeployCandidate } from './safety-dry-run.types';

describe('controlled deploy and restore execution', () => {
  it('blocks deploy when dry-run has errors', () => {
    const candidates: DeployCandidate[] = [
      {
        modId: 'mod-a',
        sourcePath: 'C:/mods/mod-a/file.pak',
        relativeTargetPath: '../SnowRunner.exe',
        targetExists: false,
      },
    ];

    const result = executeControlledDeploy(candidates, '2026-04-22T00:00:00.000Z');

    expect(result.status).toBe('blocked');
    expect(result.plannedCopies).toEqual([]);
    expect(result.plannedBackups).toEqual([]);
  });

  it('returns planned deploy operations and backup records when dry-run is safe', () => {
    const candidates: DeployCandidate[] = [
      {
        modId: 'mod-a',
        sourcePath: 'C:/mods/mod-a/file-a.pak',
        relativeTargetPath: 'mods/file-a.pak',
        targetExists: true,
      },
    ];

    const result = executeControlledDeploy(candidates, '2026-04-22T00:00:00.000Z');

    expect(result.status).toBe('planned');
    expect(result.plannedCopies).toHaveLength(1);
    expect(result.plannedBackups).toEqual([
      {
        targetPath: 'mods/file-a.pak',
        backupPath: 'mods/file-a.pak.snowman-backup.2026-04-22T00-00-00.000Z',
        createdAt: '2026-04-22T00:00:00.000Z',
      },
    ]);
  });

  it('launch is blocked when dry-run cannot proceed', () => {
    const candidates: DeployCandidate[] = [
      {
        modId: 'mod-a',
        sourcePath: 'C:/mods/mod-a/file.pak',
        relativeTargetPath: '../unsafe.pak',
        targetExists: false,
      },
    ];

    const deploy = executeControlledDeploy(candidates, '2026-04-22T00:00:00.000Z');
    const launch = evaluateLaunchReadiness(deploy.dryRun);

    expect(launch.status).toBe('blocked');
    expect(launch.reason).toBeTruthy();
  });

  it('launch is ready when dry-run can proceed', () => {
    const candidates: DeployCandidate[] = [
      {
        modId: 'mod-a',
        sourcePath: 'C:/mods/mod-a/file.pak',
        relativeTargetPath: 'mods/safe.pak',
        targetExists: false,
      },
    ];

    const deploy = executeControlledDeploy(candidates, '2026-04-22T00:00:00.000Z');
    const launch = evaluateLaunchReadiness(deploy.dryRun);

    expect(launch.status).toBe('ready');
  });

  it('plans restore operations from backup records', () => {
    const restore = planRestore([
      {
        targetPath: 'mods/file-a.pak',
        backupPath: 'mods/file-a.pak.snowman-backup.2026-04-22T00-00-00.000Z',
        createdAt: '2026-04-22T00:00:00.000Z',
      },
    ]);

    expect(restore.status).toBe('planned');
    expect(restore.plannedRestores).toEqual([
      {
        backupPath: 'mods/file-a.pak.snowman-backup.2026-04-22T00-00-00.000Z',
        targetPath: 'mods/file-a.pak',
      },
    ]);
  });

  it('returns none when there are no backups', () => {
    const restore = planRestore([]);

    expect(restore.status).toBe('none');
    expect(restore.plannedRestores).toEqual([]);
  });
});
