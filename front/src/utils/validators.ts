// Basic email pattern (conforms to most RFC-valid emails)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
    return emailRegex.test(email.trim());
}

// Later you can add more validators here:
export function isNonEmpty(input: string): boolean {
    return input.trim().length > 0;
}

export function isValidUsername(username: string): boolean {
    // Add your own logic for usernames if needed
    return /^[a-zA-Z0-9_.-]{3,30}$/.test(username);
}
