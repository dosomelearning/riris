import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from 'react-oidc-context';
import './App.css';

import HomePublic from './pages/HomePublic';
import FilesDashboard from './pages/FilesDashboard';
import HomeAdmin from './pages/HomeAdmin';
import Settings from './pages/Settings';
import PublicDownload from './pages/PublicDownload';
import NotFound from './pages/NotFound';
import Logout from './pages/Logout';

function App() {
    const auth = useAuth();

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

    if (auth.isLoading) return null;

    return (
        <Router>
            <Header onSidebarToggle={handleSidebarToggle} />

            {/* MAIN LAYOUT AREA (ensures footer placement is stable) */}
            <div className="main-layout">
                {auth.isAuthenticated && sidebarVisible && <Sidebar />}

                <main className="main-content">
                    {auth.isAuthenticated ? (
                        <Routes>
                            <Route path="/d/:fileId" element={<PublicDownload />} />
                            <Route path="/" element={<FilesDashboard />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute allowedGroups={['Admins']}>
                                        <HomeAdmin />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/logout" element={<Logout />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    ) : (
                        <Routes>
                            <Route path="/" element={<HomePublic />} />
                            <Route path="/logout" element={<Logout />} />
                            <Route path="/d/:fileId" element={<PublicDownload />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    )}
                </main>
            </div>

            <Footer />
        </Router>
    );
}

export default App;
