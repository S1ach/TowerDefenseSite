export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error('Сервер недоступен. Запустите npm run server и PostgreSQL. Локальные сохранения работают без сервера.'); }
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? 'Сервер недоступен или вернул ошибку.');
  return result as T;
}
