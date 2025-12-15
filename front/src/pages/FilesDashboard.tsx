import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import FilesToolbar from '../components/files/FilesToolbar';
import FilesTable from '../components/files/FilesTable';
import type { FileRow } from '../components/files/FilesTable';
import FileDetailsModal from '../components/files/FileDetailsModal';
import UploadModal from '../components/files/UploadModal';
import UploadProgressModal from '../components/files/UploadProgressModal';
import { listFiles, deleteFile } from '../api/files';

export default function FilesDashboard() {
    const auth = useAuth();

    const [items, setItems] = useState<FileRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modal state (scaffold)
    const [showUpload, setShowUpload] = useState(false);
    const [showUploadProgress, setShowUploadProgress] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const selectedCount = selectedIds.length;
    const selectedSingle = useMemo(() => {
        if (selectedIds.length !== 1) return null;
        return items.find(i => i.fileId === selectedIds[0]) ?? null;
    }, [items, selectedIds]);

    async function refresh() {
        if (!auth.user?.id_token) return;
        setLoading(true);
        setError(null);
        try {
            const resp = await listFiles(auth.user.id_token);
            setItems(resp.items ?? []);
            setSelectedIds([]); // reset selection on refresh for simplicity
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load files');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function onDeleteSelected() {
        if (!auth.user?.id_token) return;
        if (selectedIds.length === 0) return;

        setLoading(true);
        setError(null);
        try {
            for (const id of selectedIds) {
                await deleteFile(auth.user.id_token, id);
            }
            await refresh();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Delete failed');
            setLoading(false);
        }
    }

    return (
        <div>
            <h2>Moje datoteke</h2>

            <FilesToolbar
                loading={loading}
                selectedCount={selectedCount}
                onUploadNew={() => setShowUpload(true)}
                onDetails={() => setShowDetails(true)}
                onDelete={onDeleteSelected}
            />

            {error && (
                <div className="error-box" style={{ marginTop: '0.75rem' }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: '0.75rem' }}>
                <FilesTable
                    items={items}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            </div>

            {/* Modals (placeholder scaffolding) */}
            <UploadModal
                open={showUpload}
                onClose={() => setShowUpload(false)}
                onStartUpload={() => {
                    setShowUpload(false);
                    setShowUploadProgress(true);
                }}
            />

            <UploadProgressModal
                open={showUploadProgress}
                onClose={() => setShowUploadProgress(false)}
            />

            <FileDetailsModal
                open={showDetails}
                file={selectedSingle}
                onClose={() => setShowDetails(false)}
            />
        </div>
    );
}
