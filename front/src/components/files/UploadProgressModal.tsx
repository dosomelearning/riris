import Modal from '../modals/Modal';

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function UploadProgressModal({ open, onClose }: Props) {
    return (
        <Modal open={open} title="Prenos v teku" onClose={onClose}>
            <div className="placeholder">
                Scaffold. Kasneje: prikaz napredka (opcijsko), status, preklic.
            </div>

            <div style={{ marginTop: '1rem' }}>
                <button onClick={onClose}>Zapri</button>
            </div>
        </Modal>
    );
}
