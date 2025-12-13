import { apiConfig } from '../auth/config';

export async function fetchInitData(token: string): Promise<FormData> {
//    console.log("[INIT] Using idToken:", token.slice(0, 10));  // Log first 10 chars only
    const url = `${apiConfig.baseUrl}/init`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: token,
            "Content-Type": "application/json",
        },
        // body: JSON.stringify({}) // reserved for future use
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch init data: ${response.status}`);
    }

    const data = await response.json();
    return data.formData as FormData;
}
