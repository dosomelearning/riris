import { useEffect } from 'react';

type Props = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: Props) {
    useEffect(() => {
        if (!open) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    // ...rest of your modal markup stays the same
    return (
        <div className="modal-overlay" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <button onClick={onClose} aria-label="Close">×</button>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
