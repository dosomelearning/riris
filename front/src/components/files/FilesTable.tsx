export type FileRow = {
    fileId: string;
    originalFileName?: string;
    contentType?: string;
    sizeBytes?: number | string | null;
    status?: string;
    createdAt?: string;
    expiresAt?: string | null;
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

    function toggleAll() {
        if (selectedIds.length === items.length) onSelectionChange([]);
        else onSelectionChange(items.map(i => i.fileId));
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
            </tr>
            </thead>
            <tbody>
            {items.map((it) => {
                const checked = selectedIds.includes(it.fileId);
                return (
                    <tr key={it.fileId}>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggle(it.fileId)} />
                        </td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                            {it.originalFileName ?? it.fileId}
                        </td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{it.status ?? ''}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{it.sizeBytes ?? ''}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{it.createdAt ?? ''}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{it.expiresAt ?? ''}</td>
                    </tr>
                );
            })}
            </tbody>
        </table>
    );
}
