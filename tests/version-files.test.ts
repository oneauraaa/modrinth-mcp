// tests/version-files.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth, modrinthUpload } from '../src/client.js';
import { deleteFileFromVersion, addFilesToVersion } from '../src/tools/version-files.js';

describe('version file tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deleteFileFromVersion calls DELETE /version_file/:hash', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await deleteFileFromVersion({ hash: 'abc123', algorithm: 'sha1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/version_file/abc123?algorithm=sha1',
      { method: 'DELETE' }
    );
  });

  it('deleteFileFromVersion supports sha512 algorithm', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await deleteFileFromVersion({ hash: 'def456', algorithm: 'sha512' });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/version_file/def456?algorithm=sha512',
      { method: 'DELETE' }
    );
  });

  it('addFilesToVersion calls modrinthUpload with version endpoint', async () => {
    vi.mocked(modrinthUpload).mockResolvedValueOnce({ id: 'file1' });
    // Mock readFile to avoid actual file I/O
    vi.doMock('fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue(Buffer.from('test content')),
    }), { virtual: true });

    await addFilesToVersion({ versionId: 'ver1', file_parts: [] });
    expect(modrinthUpload).toHaveBeenCalledWith(
      '/version/ver1/files',
      expect.any(FormData)
    );
  });
});
