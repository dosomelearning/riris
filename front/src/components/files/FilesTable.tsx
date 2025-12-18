import { useState } from 'react';

export type FileRow = {
    fileId: string;
    originalFileName?: string;
    contentType?: string;
    sizeBytes?: number | null;
    status?: string;
    createdAt?: string;
    expiresAt?: string | null;

    // new fields from backend
    passwordRequired: boolean;
    downloadCount: number;
    downloadedAt: string | null;
};

type Props = {
    items: FileRow[];
    loading: boolean;
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
};

export default function FilesTable({ items, loading, selectedIds, onSelectionChange }: Props) {
    function toggle(id: string) {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(x => x !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    }

    function fmtIsoToSeconds(v?: string | null): string {
        if (!v) return '';
        // 2025-12-16T20:25:29.727157Z -> 2025-12-16T20:25:29Z
        const [head] = v.split('.');
        return head.endsWith('Z') ? head : `${head}Z`;
    }

    function toggleAll() {
        if (selectedIds.length === items.length) onSelectionChange([]);
        else onSelectionChange(items.map(i => i.fileId));
    }

    const [hoveredId, setHoveredId] = useState<string | null>(null);

    function onRowClick(id: string) {
        toggle(id);
    }

    if (loading) {
        return <div className="placeholder">Nalagam...</div>;
    }

    if (!items.length) {
        return <div className="placeholder">Ni datotek.</div>;
    }

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
            <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={selectedIds.length === items.length}
                        onChange={toggleAll}
                    />
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Ime</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Velikost</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Ustvarjeno</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Poteče</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Geslo</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Prenosi</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Zadnji prenos</th>
            </tr>
            </thead>
            <tbody>
            {items.map((it) => {
                const checked = selectedIds.includes(it.fileId);
                const isHovered = hoveredId === it.fileId;
                const isSelected = checked;

                return (
                    <tr
                        key={it.fileId}
                        onClick={() => onRowClick(it.fileId)}
                        onMouseEnter={() => setHoveredId(it.fileId)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                            background: isSelected ? '#eef3ff' : isHovered ? '#f5f5f5' : 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggle(it.fileId)}
                            />
                        </td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                            {(it.status ?? '').toLowerCase() === 'ready' ? (
                                <a
                                    href={`/d/${encodeURIComponent(it.fileId)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {it.originalFileName ?? it.fileId}
                                </a>
                            ) : (
                                <span>{it.originalFileName ?? it.fileId}</span>
                            )}
                        </td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{it.status ?? ''}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{it.sizeBytes ?? ''}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{fmtIsoToSeconds(it.createdAt) ?? ''}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{fmtIsoToSeconds(it.expiresAt) ?? ''}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                            {it.passwordRequired ? 'da' : 'ne'}
                        </td>

                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                            {it.downloadCount}
                        </td>

                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                            {fmtIsoToSeconds(it.downloadedAt) ?? ''}
                        </td>
                    </tr>
                );
            })}
            </tbody>
        </table>
    );
}
