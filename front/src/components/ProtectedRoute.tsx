import type { ReactNode } from 'react';
//import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

type ProtectedRouteProps = {
    allowedGroups?: string[]; // optional
    children: ReactNode;
    fallback?: ReactNode;
};

export default function ProtectedRoute({ allowedGroups, children, fallback }: ProtectedRouteProps) {
    const auth = useAuth();

    const rawGroups = auth.user?.profile["cognito:groups"];
    const roles: string[] = Array.isArray(rawGroups) ? rawGroups : [];
    const normalizedRoles = roles.map(r => r.toLowerCase());

    const isAuthorized =
        !allowedGroups?.length || // allow if no groups required
        allowedGroups.some(group =>
            normalizedRoles.includes(group.toLowerCase())
        );

    if (auth.isLoading) return null;

    if (!auth.isAuthenticated || !isAuthorized) {
//        return <Navigate to="/" replace />;
        return fallback ?? (
        <div style={{ padding: '1rem', background: '#fee', color: '#900' }}>
            ⚠️ You do not have access to view this page.
        </div>
        );
    }

    return <>{children}</>;
}
