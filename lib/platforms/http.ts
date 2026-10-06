const TIMEOUT_MS = 8000

export class NotConfiguredError extends Error {}

type FetchOptions = RequestInit & { revalidate?: number }

/**
 * GET/POST helper with a timeout. `revalidate` stores the response in the
 * Next.js Data Cache so the page and /api/live share one upstream call.
 */
export async function fetchOk(url: string, { revalidate, ...init }: FetchOptions = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(revalidate !== undefined && { next: { revalidate } }),
  })
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${new URL(url).pathname} failed with status ${response.status}`)
  }
  return response
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

type AppToken = { value: string; expiresAt: number }

/**
 * Client-credentials token kept in memory for the lifetime of the server
 * instance; refreshed a minute before it expires.
 */
export function appTokenProvider(request: () => Promise<{ access_token: string; expires_in: number }>) {
  let token: AppToken | null = null
  return async () => {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value
    const payload = await request()
    token = { value: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 }
    return token.value
  }
}
