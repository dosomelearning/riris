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
    const [showDeleted, setShowDeleted] = useState(false);
    const visibleItems = useMemo(() => {
        return showDeleted ? items : items.filter(i => i.status !== 'deleted');
    }, [items, showDeleted]);
    const selectedSingle = useMemo(() => {
        if (selectedIds.length !== 1) return null;
        return visibleItems.find(i => i.fileId === selectedIds[0]) ?? null;
    }, [items, selectedIds]);

    const [uploadDone, setUploadDone] = useState(false);
    const [uploadErr, setUploadErr] = useState<string | null>(null);

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

    function toggleShowDeleted() {
        setShowDeleted(prev => !prev);
        setSelectedIds([]); // avoid keeping selection of items that become hidden
    }

    async function copySelectedLinks() {
        if (selectedIds.length === 0) return;

        const base = window.location.origin;
        const text = selectedIds.map(id => `${base}/d/${id}`).join('\n');

        try {
            await navigator.clipboard.writeText(text);
        } catch {
            setError('Kopiranje v odložišče ni uspelo (clipboard).');
        }
    }

    return (
        <div>
            <h2>Moje datoteke</h2>

            <FilesToolbar
                loading={loading}
                selectedCount={selectedCount}
                showDeleted={showDeleted}
                onToggleShowDeleted={toggleShowDeleted}
                onCopyLinks={copySelectedLinks}
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
                    items={visibleItems}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            </div>

            {/* Modals (placeholder scaffolding) */}
            <UploadModal
                open={showUpload}
                onClose={() => setShowUpload(false)}
                onUploadBegin={() => {
                    setShowUpload(false);
                    setUploadDone(false);
                    setUploadErr(null);
                    setShowUploadProgress(true);
                }}
                onUploadFinished={async (res) => {
                    if (res.ok) {
                        setUploadDone(true);
                        setUploadErr(null);
                        await refresh(); // refresh list immediately
                    } else {
                        setUploadDone(true);
                        setUploadErr(res.error ?? 'Nalaganje ni uspelo');
                    }
                }}
            />

            <UploadProgressModal
                open={showUploadProgress}
                done={uploadDone}
                error={uploadErr}
                onClose={() => {
                    setShowUploadProgress(false);
                    void refresh();
                }}
            />

            <FileDetailsModal
                open={showDetails}
                file={selectedSingle}
                onClose={() => setShowDetails(false)}
            />
        </div>
    );
}
