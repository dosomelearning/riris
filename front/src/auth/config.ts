import { WebStorageStateStore } from 'oidc-client-ts';

const baseUrl = window.location.origin;

export const cognitoAuthConfig = {
    authority: "https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_SA3OzWXIm",
    client_id: '6cr3rn5iso5rolgj6levllbbrs',

    // IMPORTANT: dedicated callback route
    redirect_uri: `${baseUrl}/auth/callback`,

    post_logout_redirect_uri: `${baseUrl}/logout`,
    response_type: 'code',
    scope: 'openid profile email',

    // Persist user/session across hard refresh
    userStore: new WebStorageStateStore({ store: window.localStorage }),

    // Keeps OIDC transient state in a stable store as well
    stateStore: new WebStorageStateStore({ store: window.localStorage }),
};

export const cognitoDomain = 'https://riris-auth.auth.eu-central-1.amazoncognito.com';

export const apiConfig = {
    baseUrl: 'https://haj8b7ppl8.execute-api.eu-central-1.amazonaws.com/Prod',
};
