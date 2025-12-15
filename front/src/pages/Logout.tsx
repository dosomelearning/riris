import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Logout() {
    const navigate = useNavigate();
    const [seconds, setSeconds] = useState(5);

    useEffect(() => {
        const t1 = window.setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
        const t2 = window.setTimeout(() => navigate('/', { replace: true }), 5000);
        return () => {
            window.clearInterval(t1);
            window.clearTimeout(t2);
        };
    }, [navigate]);

    return (
        <div style={{ maxWidth: 720, margin: '2rem auto' }}>
            <h2>Odjava uspešna</h2>
            <p>Uspešno ste se odjavili.</p>
            <p className="placeholder">
                Preusmeritev na domačo stran čez {seconds}s …
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Link to="/">Domov</Link>
                <span style={{ color: '#aaa' }}>|</span>
                <Link to="/">Prijava</Link>
            </div>
        </div>
    );
}
