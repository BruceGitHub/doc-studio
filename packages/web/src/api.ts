export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      // Only declare a JSON body when there is one: an empty POST with
      // `Content-Type: application/json` is rejected by Fastify.
      ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = text
    try {
      const parsed = JSON.parse(text) as { error?: string }
      if (parsed.error) message = parsed.error
    } catch {
      // Not JSON: keep the raw body.
    }
    throw new Error(message || `${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
