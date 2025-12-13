import { useAuth } from 'react-oidc-context';
import { cognitoAuthConfig, cognitoDomain } from '../auth/config';
import './Header.css';

export default function Header({ onSidebarToggle }: { onSidebarToggle?: () => void }) {
    const auth = useAuth();
    const rawGroups = auth.user?.profile["cognito:groups"];
    const roles: string[] = Array.isArray(rawGroups) ? rawGroups : [];
    let displayGroup: string | null = null;
    const rawGroup = roles[0]?.toLowerCase();
    if (rawGroup?.includes("admins")) {
        displayGroup = "Admin";
    } else if (rawGroup?.includes("ops")) {
        displayGroup = "Ops";
    }

    const handleLogout = async () => {
        sessionStorage.removeItem("formData");
        await auth.removeUser();

        const logoutUrl = `${cognitoDomain}/logout` +
            `?client_id=${cognitoAuthConfig.client_id}` +
            `&logout_uri=${encodeURIComponent(cognitoAuthConfig.post_logout_redirect_uri)}`;

        window.location.href = logoutUrl;
    };

    return (
        <header className="header">
            <div className="app-name-wrapper">
                <div className="app-name">riris</div>
                {auth.isAuthenticated && (
                    <div className="sidebar-buffer" />
                )}
                {auth.isAuthenticated && (
                    <button
                        onClick={onSidebarToggle}
                        className="sidebar-toggle"
                        title="Toggle sidebar"
                    >
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
                <button onClick={() => {
                    if (auth.isAuthenticated) {
                        handleLogout();
                    } else {
                        auth.signinRedirect();
                    }
                }}>
                    {auth.isAuthenticated ? 'Logout' : 'Login'}
                </button>
            </div>
        </header>
    );
}
