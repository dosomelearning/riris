import { apiConfig } from '../auth/config';

type ApiFetchOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    token?: string;
    body?: unknown;
};

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
    const url = `${apiConfig.baseUrl}${path}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (opts.token) {
        headers['Authorization'] = opts.token; // id_token
    }

    const resp = await fetch(url, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    const text = await resp.text();

    let json: JsonValue = null;
    if (text) {
        try {
            json = JSON.parse(text) as JsonValue;
        } catch {
            // If the backend returns non-JSON unexpectedly, treat it as an error payload.
            // Keep json = null; we'll fall back to status text.
        }
    }

    if (!resp.ok) {
        let msg = `HTTP ${resp.status}`;
        if (json && typeof json === 'object' && !Array.isArray(json)) {
            const maybe = (json as Record<string, JsonValue>)['message'];
            if (typeof maybe === 'string') msg = maybe;
        }
        throw new Error(msg);
    }
    return json as unknown as T;
}
