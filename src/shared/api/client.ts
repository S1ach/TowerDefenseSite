const REQUEST_TIMEOUT_MS = 10000;

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const hasBody = body !== undefined;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: hasBody ? 'POST' : 'GET',
      credentials: 'include',
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error('Сервер недоступен. Запустите npm run server и PostgreSQL.');
  }
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? 'Сервер недоступен или вернул ошибку.');
  return result as T;
}
