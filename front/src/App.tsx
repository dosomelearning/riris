import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import { useAuth } from 'react-oidc-context';
import './App.css';
import HomePublic from './pages/HomePublic';
import HomeAdmin from './pages/HomeAdmin';
import HomeUser from './pages/HomeUser';


function App() {
    const auth = useAuth();
    const userGroupsRaw = auth.user?.profile?.["cognito:groups"];
    const userGroups: string[] = Array.isArray(userGroupsRaw) ? userGroupsRaw : userGroupsRaw ? [userGroupsRaw] : [];
    const isAdmin = userGroups.some(g => String(g).toLowerCase() === 'admins');
    const [sidebarVisible, setSidebarVisible] = useState(() => {
        const stored = localStorage.getItem('sidebarVisible');
        return stored !== null ? stored === 'true' : true;
    });
    const handleSidebarToggle = () => {
        setSidebarVisible(prev => {
            const next = !prev;
            localStorage.setItem('sidebarVisible', String(next));
            return next;
        });
    };

    if (auth.isLoading) return null; // or a spinner

    return (
        <Router>
            <Header onSidebarToggle={handleSidebarToggle} />
            {auth.isAuthenticated ? (
            <div className="main-layout">
                {sidebarVisible && <Sidebar />}
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={isAdmin ? <HomeAdmin /> : <HomeUser />} />
                        <Route path="/logout" element={<div>You have been logged out.</div>} />
                    </Routes>
                </main>
            </div>
            ) : (
                // Not authenticated — show Home only
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<HomePublic />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            )}

            <Footer />
        </Router>
    );
}

export default App;
