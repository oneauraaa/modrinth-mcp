import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch } from '../src/client.js';
import { getCategories, getLoaders, getGameVersions, getLicenses } from '../src/tools/tags.js';

describe('tags', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getCategories calls /tag/category', async () => {
    const mockData = [{ name: 'adventure', project_type: 'mod', icon: '' }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getCategories();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/category');
    expect(result).toEqual(mockData);
  });

  it('getLoaders calls /tag/loader', async () => {
    const mockData = [{ name: 'fabric', supported_project_types: ['mod'] }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getLoaders();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/loader');
    expect(result).toEqual(mockData);
  });

  it('getGameVersions calls /tag/game_version', async () => {
    const mockData = [{ version: '1.21', version_type: 'release' }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getGameVersions();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/game_version');
    expect(result).toEqual(mockData);
  });

  it('getLicenses calls /tag/license', async () => {
    const mockData = [{ short: 'MIT', name: 'MIT License' }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getLicenses();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/license');
    expect(result).toEqual(mockData);
  });
});
