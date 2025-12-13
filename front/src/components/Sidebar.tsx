import { NavLink } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

export default function Sidebar() {
    const auth = useAuth();

    const rawGroups = auth.user?.profile["cognito:groups"];
    const groups: string[] = Array.isArray(rawGroups) /* coerces rawGroups into string array, for safety sake */
        ? rawGroups
        : rawGroups
            ? [String(rawGroups)]
            : [];
    const lowerGroups = groups.map(g => g.toLowerCase());

    const isAdmin = lowerGroups.includes("admins");

    return (
        <aside className="sidebar">
            <nav>
                <ul>
                    {/* Common links for all authenticated users */}
                    <li><NavLink to="/">Home</NavLink></li>

                    {/* Admin-only links */}
                    {isAdmin && (
                        <>
                            <li><NavLink to="/admin">Admin stuff</NavLink></li>
                        </>
                    )}
                </ul>
            </nav>
        </aside>
    );
}
