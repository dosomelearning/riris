import Modal from '../modals/Modal';

type Props = {
    open: boolean;
    done: boolean;
    error?: string | null;
    onClose: () => void;
};

export default function UploadProgressModal({ open, done, error, onClose }: Props) {
    const title = done ? 'Nalaganje končano' : 'Nalaganje...';

    return (
        <Modal open={open} title={title} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {!done && !error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="spinner" />
                        <div>Datoteka se nalaga. Prosimo počakaj.</div>
                    </div>
                )}

                {done && !error && (
                    <div>Nalaganje uspešno zaključeno.</div>
                )}

                {error && (
                    <div className="error-box">
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={onClose} disabled={!done && !error}>
                        Zapri
                    </button>
                </div>
            </div>
        </Modal>
    );
}
