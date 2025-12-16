import { useParams } from 'react-router-dom';

export default function PublicDownload() {
    const { fileId } = useParams<{ fileId: string }>();

    return (
        <div className="page page--segment">
            <section className="segment">
                <h2>Prenos datoteke</h2>
                <p>
                    Javni prenos (demo). ID datoteke: <strong>{fileId}</strong>
                </p>
                <p className="placeholder">
                    Tukaj bo prikaz metapodatkov (ime, velikost, rok veljavnosti) in nato avtomatski prenos.
                    Kasneje dodamo tudi možnost gesla.
                </p>
            </section>
        </div>
    );
}
