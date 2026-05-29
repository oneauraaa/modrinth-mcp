// tests/versions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch } from '../src/client.js';
import {
  listVersions,
  getVersion,
  getVersionFromHash,
  updateVersion,
  deleteVersion,
  scheduleVersion,
} from '../src/tools/versions.js';

describe('version tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listVersions calls /project/:id/version with filters', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await listVersions({ idOrSlug: 'sodium', loaders: ['fabric'], game_versions: ['1.21'] });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/project/sodium/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%221.21%22%5D'
    );
  });

  it('listVersions calls without filters', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await listVersions({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/version?');
  });

  it('getVersion calls /version/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'ver1' });
    await getVersion({ id: 'ver1' });
    expect(modrinthFetch).toHaveBeenCalledWith('/version/ver1');
  });

  it('getVersionFromHash calls /version_file/:hash', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'ver1' });
    await getVersionFromHash({ hash: 'abc123', algorithm: 'sha1' });
    expect(modrinthFetch).toHaveBeenCalledWith('/version_file/abc123?algorithm=sha1');
  });

  it('updateVersion calls PATCH /version/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateVersion({ id: 'ver1', name: 'Updated Name' });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/version/ver1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('deleteVersion calls DELETE /version/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await deleteVersion({ id: 'ver1' });
    expect(modrinthFetch).toHaveBeenCalledWith('/version/ver1', { method: 'DELETE' });
  });

  it('scheduleVersion calls POST /version/:id/schedule', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await scheduleVersion({ id: 'ver1', requested_status: 'listed', time: '2026-06-01T00:00:00Z' });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/version/ver1/schedule',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
