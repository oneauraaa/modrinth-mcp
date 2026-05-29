import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { getProjectTeam, addTeamMember, updateTeamMember, removeTeamMember, transferTeamOwnership } from '../src/tools/teams.js';

describe('team tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getProjectTeam calls /project/:id/members', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getProjectTeam({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/members');
  });

  it('addTeamMember calls POST /team/:id/members', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await addTeamMember({ teamId: 't1', user_id: 'u1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/team/t1/members', expect.objectContaining({ method: 'POST' }));
  });

  it('updateTeamMember calls PATCH /team/:id/members/:userId', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateTeamMember({ teamId: 't1', userId: 'u1', role: 'Developer' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/team/t1/members/u1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('removeTeamMember calls DELETE /team/:id/members/:userId', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await removeTeamMember({ teamId: 't1', userId: 'u1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/team/t1/members/u1', { method: 'DELETE' });
  });

  it('transferTeamOwnership calls PATCH /team/:id/owner', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await transferTeamOwnership({ teamId: 't1', user_id: 'u2' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/team/t1/owner', expect.objectContaining({ method: 'PATCH' }));
  });
});
