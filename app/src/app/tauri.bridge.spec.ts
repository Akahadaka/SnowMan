import { describe, expect, it, vi } from 'vitest';
import { registeredCommands, type TauriInvokeFn } from './tauri.bridge';
import { fetchPing } from './ping.bridge';

describe('typed Tauri command bridge', () => {
  it('registers the ping command', () => {
    expect(registeredCommands).toContain('ping');
    expect(registeredCommands).toContain('launch_game');
    expect(registeredCommands).toContain('download_and_extract_zip');
    expect(registeredCommands).toContain('deploy_launch_restore');
    expect(registeredCommands).toContain('sync_mod_catalog');
    expect(registeredCommands).toContain('search_mod_catalog');
    expect(registeredCommands).toContain('upsert_profile_mod_selection');
    expect(registeredCommands).toContain('get_profile_mod_selections');
  });

  it('covers exactly the expected command set', () => {
    expect([...registeredCommands]).toEqual([
      'ping',
      'launch_game',
      'download_and_extract_zip',
      'deploy_launch_restore',
      'sync_mod_catalog',
      'search_mod_catalog',
      'upsert_profile_mod_selection',
      'get_profile_mod_selections',
    ]);
  });

  it('fetchPing calls the typed invoke function with the ping command', async () => {
    const mockInvoke = vi.fn().mockResolvedValue('pong') as unknown as TauriInvokeFn;

    const result = await fetchPing(mockInvoke);

    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith('ping');
    expect(result).toBe('pong');
  });
});
