const BASE_URL = 'https://api.modrinth.com/v2';

export function requireAuth(): void {
  if (!process.env.MODRINTH_TOKEN) {
    throw new Error('MODRINTH_TOKEN is not set — this tool requires authentication');
  }
}

export async function modrinthFetch(
  path: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<unknown> {
  const headers: Record<string, string> = {
    'User-Agent': 'modrinth-mcp/1.0.0',
    ...options.headers,
  };
  if (process.env.MODRINTH_TOKEN) {
    headers['Authorization'] = process.env.MODRINTH_TOKEN;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const body = await response.json() as { error?: string; description?: string };
      if (body.description) message += ` — ${body.description}`;
      else if (body.error) message += ` — ${body.error}`;
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function modrinthUpload(
  path: string,
  formData: FormData,
  method = 'POST'
): Promise<unknown> {
  requireAuth();
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'User-Agent': 'modrinth-mcp/1.0.0',
      'Authorization': process.env.MODRINTH_TOKEN!,
      // Do NOT set Content-Type — fetch sets it with boundary automatically for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const body = await response.json() as { error?: string; description?: string };
      if (body.description) message += ` — ${body.description}`;
      else if (body.error) message += ` — ${body.error}`;
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}
