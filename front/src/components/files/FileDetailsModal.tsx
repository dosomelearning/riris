import Modal from '../modals/Modal';
import type { FileRow } from './FilesTable';

type Props = {
    open: boolean;
    file: FileRow | null;
    onClose: () => void;
};

export default function FileDetailsModal({ open, file, onClose }: Props) {
    return (
        <Modal open={open} title="Podrobnosti" onClose={onClose}>
            {!file ? (
                <div className="placeholder">Izberi eno datoteko.</div>
            ) : (
                <div>
                    <div><strong>ID:</strong> {file.fileId}</div>
                    <div><strong>Ime:</strong> {file.originalFileName ?? ''}</div>
                    <div><strong>Tip:</strong> {file.contentType ?? ''}</div>
                    <div><strong>Velikost:</strong> {file.sizeBytes ?? ''}</div>
                    <div><strong>Status:</strong> {file.status ?? ''}</div>
                    <div><strong>Ustvarjeno:</strong> {file.createdAt ?? ''}</div>
                    <div><strong>Poteče:</strong> {file.expiresAt ?? ''}</div>

                    <div style={{ marginTop: '1rem' }} className="placeholder">
                        Scaffold. Kasneje: urejanje izbranih lastnosti.
                    </div>
                </div>
            )}

            <div style={{ marginTop: '1rem' }}>
                <button onClick={onClose}>Zapri</button>
            </div>
        </Modal>
    );
}
