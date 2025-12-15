type Props = {
    loading: boolean;
    selectedCount: number;
    onUploadNew: () => void;
    onDetails: () => void;
    onDelete: () => void;
};

export default function FilesToolbar({
                                         loading,
                                         selectedCount,
                                         onUploadNew,
                                         onDetails,
                                         onDelete,
                                     }: Props) {
    const canDetails = selectedCount === 1 && !loading;
    const canDelete = selectedCount >= 1 && !loading;

    return (
        <div className="button-row" style={{ alignItems: 'center' }}>
            <button onClick={onUploadNew} disabled={loading}>
                Naloži novo
            </button>
            <button onClick={onDetails} disabled={!canDetails}>
                Podrobnosti
            </button>
            <button onClick={onDelete} disabled={!canDelete}>
                Briši
            </button>
        </div>
    );
}
