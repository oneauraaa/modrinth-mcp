// tests/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must import after stubbing so module sees env
describe('requireAuth', () => {
  afterEach(() => { delete process.env.MODRINTH_TOKEN; });

  it('throws when MODRINTH_TOKEN is not set', async () => {
    const { requireAuth } = await import('../src/client.js');
    expect(() => requireAuth()).toThrow('MODRINTH_TOKEN is not set');
  });

  it('does not throw when MODRINTH_TOKEN is set', async () => {
    process.env.MODRINTH_TOKEN = 'test-token';
    const { requireAuth } = await import('../src/client.js');
    expect(() => requireAuth()).not.toThrow();
  });
});

describe('modrinthFetch', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.MODRINTH_TOKEN; });

  it('sends User-Agent header', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1' }), { status: 200 })
    );
    const { modrinthFetch } = await import('../src/client.js');
    await modrinthFetch('/project/test');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.modrinth.com/v2/project/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'modrinth-mcp/1.0.0' }),
      })
    );
  });

  it('includes Authorization header when token is set', async () => {
    process.env.MODRINTH_TOKEN = 'my-pat';
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    const { modrinthFetch } = await import('../src/client.js');
    await modrinthFetch('/project/test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'my-pat' }),
      })
    );
  });

  it('does not include Authorization header when token is absent', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    const { modrinthFetch } = await import('../src/client.js');
    await modrinthFetch('/project/test');
    const call = mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(call.headers).not.toHaveProperty('Authorization');
  });

  it('throws readable error with description on non-2xx', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'not_found', description: 'Project not found' }),
        { status: 404 }
      )
    );
    const { modrinthFetch } = await import('../src/client.js');
    await expect(modrinthFetch('/project/missing')).rejects.toThrow('404 — Project not found');
  });

  it('throws status-only error when body is not parseable', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('bad gateway', { status: 502 }));
    const { modrinthFetch } = await import('../src/client.js');
    await expect(modrinthFetch('/project/test')).rejects.toThrow('502');
  });

  it('returns null for 204 responses', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { modrinthFetch } = await import('../src/client.js');
    const result = await modrinthFetch('/project/test', { method: 'DELETE' });
    expect(result).toBeNull();
  });
});
