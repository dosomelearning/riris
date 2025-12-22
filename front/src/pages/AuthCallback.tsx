import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

export default function AuthCallback() {
    const auth = useAuth();

    if (auth.error) {
        return (
            <div style={{ padding: '1rem' }}>
                <h2>Prijava ni uspela</h2>
                <div className="error-box" style={{ marginTop: '0.75rem' }}>
                    {auth.error.message}
                </div>
            </div>
        );
    }

    // While oidc-client processes the authorization code exchange
    if (auth.isLoading) {
        return <div className="placeholder">Prijavljam...</div>;
    }

    // Once authenticated, send user to the main app route (dashboard)
    if (auth.isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Fallback: if we somehow arrived here without an auth session
    return <Navigate to="/" replace />;
}
