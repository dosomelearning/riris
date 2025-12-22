import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header({ onSidebarToggle }: { onSidebarToggle?: () => void }) {
    const auth = useAuth();
    const navigate = useNavigate();

    const rawGroups = auth.user?.profile['cognito:groups'];
    const roles: string[] = Array.isArray(rawGroups) ? rawGroups : [];
    let displayGroup: string | null = null;
    const rawGroup = roles[0]?.toLowerCase();
    if (rawGroup?.includes('admins')) {
        displayGroup = 'Admin';
    } else if (rawGroup?.includes('ops')) {
        displayGroup = 'Ops';
    }

    return (
        <header className="header">
            <div className="app-name-wrapper">
                <div className="app-name">riris</div>
                {auth.isAuthenticated && <div className="sidebar-buffer" />}
                {auth.isAuthenticated && (
                    <button onClick={onSidebarToggle} className="sidebar-toggle" title="Toggle sidebar">
                        ☰
                    </button>
                )}
            </div>

            <div className="user-actions">
                {auth.isAuthenticated && (
                    <span className="username">
            {displayGroup ? `${displayGroup}: ` : ''}
                        {auth.user?.profile?.email}
          </span>
                )}

                <button
                    onClick={() => {
                        if (auth.isAuthenticated) {
                            // Navigate to the canonical logout flow; the /logout page triggers sign-out.
                            navigate('/logout');
                        } else {
                            auth.signinRedirect();
                        }
                    }}
                >
                    {auth.isAuthenticated ? 'Logout' : 'Login'}
                </button>
            </div>
        </header>
    );
}
