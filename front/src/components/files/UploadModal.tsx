import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import Modal from '../modals/Modal';
import { initUpload, putObjectToPresignedUrl } from '../../api/files';

type Props = {
    open: boolean;
    onClose: () => void;
    onUploadBegin: () => void;
    onUploadFinished: (result: { ok: boolean; error?: string }) => void;
};

export default function UploadModal({ open, onClose, onUploadBegin, onUploadFinished }: Props) {
    const auth = useAuth();

    const [file, setFile] = useState<File | null>(null);
    const [expiresInDays, setExpiresInDays] = useState<number>(7);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Reset transient modal state on open so each upload starts clean.
    useEffect(() => {
        if (!open) return;

        setFile(null);
        setError(null);
        setSubmitting(false);
        // Intentionally keep expiresInDays as-is to preserve user preference across uploads.
    }, [open]);

    async function onUpload() {
        if (!auth.user?.id_token) return;

        if (!file) {
            setError('Izberi datoteko.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            onUploadBegin();

            const init = await initUpload(auth.user.id_token, {
                originalFileName: file.name,
                contentType: file.type || 'application/octet-stream',
                sizeBytes: file.size,
                expiresInDays,
            });

            await putObjectToPresignedUrl(init.upload.url, file, init.upload.headers);

            onUploadFinished({ ok: true });
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Nalaganje ni uspelo';
            setError(msg);
            onUploadFinished({ ok: false, error: msg });
        } finally {
            // Ensure buttons are re-enabled after any attempt (success or failure).
            setSubmitting(false);
        }
    }

    return (
        <Modal open={open} title="Naloži novo" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />

                <label>
                    Veljavnost (dni):
                    <input
                        type="number"
                        min={1}
                        max={30}
                        value={expiresInDays}
                        onChange={e => setExpiresInDays(Number(e.target.value))}
                        style={{ marginLeft: '0.5rem', width: '4rem' }}
                    />
                </label>

                {error && <div className="error-box">{error}</div>}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={onUpload} disabled={submitting}>
                        Naloži
                    </button>
                    <button onClick={onClose} disabled={submitting}>
                        Prekliči
                    </button>
                </div>
            </div>
        </Modal>
    );
}
