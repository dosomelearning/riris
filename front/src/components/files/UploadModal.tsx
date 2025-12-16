import Modal from '../modals/Modal';

type Props = {
    open: boolean;
    onClose: () => void;
    onStartUpload: () => void;
};

export default function UploadModal({ open, onClose, onStartUpload }: Props) {
    return (
        <Modal open={open} title="Naloži novo" onClose={onClose}>
            <div className="placeholder">
                Scaffold. Kasneje: drag & drop + izbira datoteke + klic POST /files.
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={onStartUpload}>Začni nalaganje (demo)</button>
                <button onClick={onClose}>Prekliči</button>
            </div>
        </Modal>
    );
}
