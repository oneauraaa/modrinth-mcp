// tests/projects.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch } from '../src/client.js';
import {
  searchProjects,
  getProject,
  getMultipleProjects,
  checkProjectValidity,
  getProjectDependencies,
} from '../src/tools/projects.js';

describe('project read tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('searchProjects calls /search with query params', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ hits: [], total_hits: 0 });
    await searchProjects({ query: 'sodium', limit: 10, offset: 0 });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/search?query=sodium&limit=10&offset=0'
    );
  });

  it('searchProjects omits undefined params', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ hits: [], total_hits: 0 });
    await searchProjects({});
    expect(modrinthFetch).toHaveBeenCalledWith('/search?');
  });

  it('getProject calls /project/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'abc', slug: 'sodium' });
    await getProject({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium');
  });

  it('getMultipleProjects calls /projects with ids param', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getMultipleProjects({ ids: ['abc', 'def'] });
    expect(modrinthFetch).toHaveBeenCalledWith('/projects?ids=%5B%22abc%22%2C%22def%22%5D');
  });

  it('checkProjectValidity calls /project/:id/check', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'abc' });
    await checkProjectValidity({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/check');
  });

  it('getProjectDependencies calls /project/:id/dependencies', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ projects: [], versions: [] });
    await getProjectDependencies({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/dependencies');
  });
});
