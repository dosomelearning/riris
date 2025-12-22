import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { cognitoAuthConfig, cognitoDomain } from '../auth/config';

const MIN_SHOW_LOGGING_OUT_MS = 600;

export default function Logout() {
    const auth = useAuth();
    const navigate = useNavigate();

    const [seconds, setSeconds] = useState(5);

    // Prevent double initiation (StrictMode dev can mount/effect twice)
    const initiatedRef = useRef(false);

    // Phase 1: If authenticated, initiate Cognito hosted logout once.
    useEffect(() => {
        if (auth.isLoading) return;
        if (!auth.isAuthenticated) return;
        if (initiatedRef.current) return;

        initiatedRef.current = true;

        // Clear any local session state if needed
        sessionStorage.removeItem('formData');

        void (async () => {
            // Clear local OIDC user first so app state flips cleanly
            await auth.removeUser();

            const logoutUrl =
                `${cognitoDomain}/logout` +
                `?client_id=${encodeURIComponent(cognitoAuthConfig.client_id)}` +
                `&logout_uri=${encodeURIComponent(cognitoAuthConfig.post_logout_redirect_uri)}`;

            // Give the user a moment to see "Odjavljam..."
            window.setTimeout(() => {
                window.location.href = logoutUrl;
            }, MIN_SHOW_LOGGING_OUT_MS);
        })();
    }, [auth]);

    // Phase 2: If unauthenticated, show success + countdown, then go home.
    useEffect(() => {
        if (auth.isLoading) return;
        if (auth.isAuthenticated) return;

        setSeconds(5);

        const t1 = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
        const t2 = window.setTimeout(() => navigate('/', { replace: true }), 5000);

        return () => {
            window.clearInterval(t1);
            window.clearTimeout(t2);
        };
    }, [auth.isAuthenticated, auth.isLoading, navigate]);

    if (auth.isLoading) {
        return <div className="placeholder">Nalagam...</div>;
    }

    // While authenticated (or immediately after initiating), show the "logging out" screen.
    if (auth.isAuthenticated || initiatedRef.current) {
        return (
            <div style={{ maxWidth: 720, margin: '2rem auto' }}>
                <h2>Odjava</h2>
                <p className="placeholder">Odjavljam...</p>
            </div>
        );
    }

    // After returning from Cognito (unauthenticated), show success + countdown.
    return (
        <div style={{ maxWidth: 720, margin: '2rem auto' }}>
            <h2>Odjava uspešna</h2>
            <p>Uspešno ste se odjavili.</p>
            <p className="placeholder">Preusmeritev na domačo stran čez {seconds}s …</p>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Link to="/">Domov</Link>
                <span style={{ color: '#aaa' }}>|</span>
                <Link to="/">Prijava</Link>
            </div>
        </div>
    );
}
