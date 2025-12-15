import { apiFetch } from './http';
import type { FileRow } from '../components/files/FilesTable';

export type ListFilesResponse = {
    items: FileRow[];
};

export async function listFiles(idToken: string): Promise<ListFilesResponse> {
    return apiFetch<ListFilesResponse>('/files', { method: 'GET', token: idToken });
}

export async function deleteFile(idToken: string, fileId: string): Promise<unknown> {
    return apiFetch<unknown>(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', token: idToken });
}
