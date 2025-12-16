import type { ReactNode } from 'react';

type ModalProps = {
    open: boolean;
    title?: string;
    children: ReactNode;
    onClose: () => void;
};

export default function Modal({ open, title, children, onClose }: ModalProps) {
    if (!open) return null;

    return (
        <div className="modal-overlay" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
                {children}
            </div>
        </div>
    );
}
