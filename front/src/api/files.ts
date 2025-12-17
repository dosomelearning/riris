import { apiFetch } from './http';
import type { FileRow } from '../components/files/FilesTable';

export type ListFilesResponse = {
    items: FileRow[];
};

export type InitUploadRequest = {
    originalFileName: string;
    contentType: string;
    sizeBytes: number;
    expiresInDays?: number;
};

export type InitUploadResponse = {
    fileId: string;
    upload: {
        method: 'PUT';
        url: string;
        headers?: Record<string, string>;
    };
};

export async function listFiles(idToken: string): Promise<ListFilesResponse> {
    return apiFetch<ListFilesResponse>('/files', { method: 'GET', token: idToken });
}

export async function deleteFile(idToken: string, fileId: string): Promise<unknown> {
    return apiFetch<unknown>(`/files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
        token: idToken,
    });
}

export async function initUpload(
    idToken: string,
    req: InitUploadRequest
): Promise<InitUploadResponse> {
    return apiFetch<InitUploadResponse>('/files', {
        method: 'POST',
        token: idToken,
        body: req,
    });
}

export async function putObjectToPresignedUrl(
    url: string,
    file: File,
    headers?: Record<string, string>
): Promise<void> {
    const resp = await fetch(url, {
        method: 'PUT',
        headers,
        body: file,
    });

    if (!resp.ok) {
        throw new Error(`S3 upload failed (${resp.status})`);
    }
}
