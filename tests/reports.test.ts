import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { submitReport, getReports, updateReport } from '../src/tools/reports.js';

describe('report tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('submitReport calls POST /report', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'r1' });
    await submitReport({ report_type: 'spam', item_id: 'proj1', item_type: 'project', body: 'Spam content' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/report', expect.objectContaining({ method: 'POST' }));
  });

  it('getReports calls GET /report', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getReports();
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/report');
  });

  it('updateReport calls PATCH /report/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateReport({ id: 'r1', closed: true });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/report/r1', expect.objectContaining({ method: 'PATCH' }));
  });
});
