import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { getNotifications, markNotificationRead, deleteNotification } from '../src/tools/notifications.js';

describe('notification tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getNotifications calls /user/:id/notifications', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getNotifications({ userId: 'u1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/user/u1/notifications');
  });

  it('markNotificationRead calls PATCH /notification/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await markNotificationRead({ id: 'n1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/notification/n1', { method: 'PATCH' });
  });

  it('deleteNotification calls DELETE /notification/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await deleteNotification({ id: 'n1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/notification/n1', { method: 'DELETE' });
  });
});
