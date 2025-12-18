import { apiConfig } from '../auth/config';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicFileMetadata } from '../api/files';

type UiState =
    | { kind: 'loading' }
    | { kind: 'uploading'; meta: MetaVm }
    | { kind: 'ready'; meta: MetaVm; auto: boolean }
    | { kind: 'password'; meta: MetaVm }
    | { kind: 'expired'; meta?: MetaVm }
    | { kind: 'deleted'; meta?: MetaVm }
    | { kind: 'notfound' }
    | { kind: 'error'; message: string };

type MetaVm = {
    fileId: string;
    originalFileName?: string;
    contentType?: string;
    sizeBytes?: number | null;
    createdAt?: string;
    expiresAt?: string | null;
    passwordRequired: boolean;
};

function fmtIsoToSeconds(v?: string | null): string {
    if (!v) return '';
    const [head] = v.split('.');
    return head.endsWith('Z') ? head : `${head}Z`;
}

function fmtBytes(n?: number | null): string {
    if (n === null || n === undefined) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let val = n;
    let i = 0;
    while (val >= 1024 && i < units.length - 1) {
        val /= 1024;
        i += 1;
    }
    const digits = i === 0 ? 0 : 2;
    return `${val.toFixed(digits)} ${units[i]}`;
}

export default function PublicDownload() {
    const { fileId } = useParams<{ fileId: string }>();
    const [state, setState] = useState<UiState>({ kind: 'loading' });

    const safeFileId = useMemo(() => fileId ?? '', [fileId]);

    useEffect(() => {
        if (!safeFileId) return;

        let cancelled = false;

        async function run() {
            setState({ kind: 'loading' });

            try {
                const meta = await getPublicFileMetadata(safeFileId);

                if (cancelled) return;

                const vm: MetaVm = {
                    fileId: meta.fileId,
                    originalFileName: meta.originalFileName,
                    contentType: meta.contentType,
                    sizeBytes: meta.sizeBytes ?? null,
                    createdAt: meta.createdAt,
                    expiresAt: meta.expiresAt ?? null,
                    passwordRequired: Boolean(meta.passwordRequired),
                };

                console.log('meta', vm);

                if (vm.passwordRequired) {
                    setState({ kind: 'password', meta: vm });
                    return;
                }

                const status = (meta.status ?? '').toLowerCase();

                if (status === 'ready') {
                    setState({ kind: 'ready', meta: vm, auto: true });
                    window.location.href = `${apiConfig.baseUrl}/files/${encodeURIComponent(safeFileId)}`;
                    return;
                }

// Not downloadable yet (e.g., uploading)
                setState({ kind: 'uploading', meta: vm });
            } catch (e: unknown) {
                if (cancelled) return;

                const msg = e instanceof Error ? e.message : 'Napaka';

                // We rely on backend status mapping -> message; keep it simple and robust
                if (msg.toLowerCase().includes('not found')) {
                    setState({ kind: 'notfound' });
                } else if (msg.toLowerCase().includes('deleted')) {
                    setState({ kind: 'deleted' });
                } else if (msg.toLowerCase().includes('expired')) {
                    setState({ kind: 'expired' });
                } else {
                    setState({ kind: 'error', message: msg });
                }
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [safeFileId]);

    function renderMeta(m: MetaVm) {
        return (
            <div style={{ marginTop: '0.75rem' }}>
                <div><strong>Ime:</strong> {m.originalFileName ?? m.fileId}</div>
                <div><strong>Velikost:</strong> {fmtBytes(m.sizeBytes)}</div>
                <div><strong>Tip:</strong> {m.contentType ?? ''}</div>
                <div><strong>Ustvarjeno:</strong> {fmtIsoToSeconds(m.createdAt)}</div>
                <div><strong>Poteče:</strong> {fmtIsoToSeconds(m.expiresAt)}</div>
            </div>
        );
    }

    return (
        <div className="page page--segment">
            <section className="segment">
                <h2>Prenos datoteke</h2>

                {state.kind === 'loading' && (
                    <p className="placeholder">Pripravljam prenos…</p>
                )}

                {state.kind === 'uploading' && (
                    <>
                        <p className="placeholder">
                            Datoteka se še pripravlja (nalaganje v teku). Poskusi znova čez nekaj trenutkov.
                        </p>
                        {renderMeta(state.meta)}
                    </>
                )}

                {state.kind === 'ready' && (
                    <>
                        <p>
                            Prenos se bo začel samodejno. Če se ne začne,
                            <br />
                            <a href={`${apiConfig.baseUrl}/files/${encodeURIComponent(state.meta.fileId)}`}>klikni tukaj</a>
                        </p>
                        {renderMeta(state.meta)}
                    </>
                )}

                {state.kind === 'password' && (
                    <>
                        <p className="placeholder">
                            Datoteka je zaščitena z geslom. (Funkcionalnost bo dodana kasneje.)
                        </p>
                        {renderMeta(state.meta)}
                        <button disabled style={{ marginTop: '0.75rem' }}>
                            Prenesi
                        </button>
                    </>
                )}

                {state.kind === 'expired' && (
                    <p className="placeholder">Datoteka je potekla in ni več na voljo.</p>
                )}

                {state.kind === 'deleted' && (
                    <p className="placeholder">Datoteka je bila izbrisana.</p>
                )}

                {state.kind === 'notfound' && (
                    <p className="placeholder">Datoteka ne obstaja ali ni več dostopna.</p>
                )}

                {state.kind === 'error' && (
                    <p className="placeholder">Napaka: {state.message}</p>
                )}
            </section>
        </div>
    );
}
