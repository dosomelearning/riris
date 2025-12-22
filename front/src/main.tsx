import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from 'react-oidc-context';
import { cognitoAuthConfig } from './auth/config';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider
            {...cognitoAuthConfig}
            onSigninCallback={() => {
                // Clean up ?code=...&state=... from the callback URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }}
        >
            <App />
        </AuthProvider>
    </StrictMode>,
);
