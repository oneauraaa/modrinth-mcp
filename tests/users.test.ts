import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { getUser, getAuthenticatedUser, updateUser, getUserProjects } from '../src/tools/users.js';

describe('user tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getUser calls /user/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'u1', username: 'alice' });
    await getUser({ idOrUsername: 'alice' });
    expect(modrinthFetch).toHaveBeenCalledWith('/user/alice');
  });

  it('getAuthenticatedUser calls /user and requiresAuth', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'u1' });
    await getAuthenticatedUser();
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/user');
  });

  it('updateUser calls PATCH /user/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateUser({ id: 'u1', bio: 'Hello' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/user/u1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('getUserProjects calls /user/:id/projects', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getUserProjects({ idOrUsername: 'alice' });
    expect(modrinthFetch).toHaveBeenCalledWith('/user/alice/projects');
  });
});
