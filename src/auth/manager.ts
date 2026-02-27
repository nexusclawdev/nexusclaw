import { Database, type AuthToken } from '../db/database.js';

export class AuthManager {
    constructor(private db: Database) { }

    /** Store an auth token */
    setToken(provider: string, token: AuthToken): void {
        this.db.saveAuthToken(token);
    }

    /** Get an auth token */
    getToken(provider: string): AuthToken | undefined {
        const tokens = this.db.getAuthTokens();
        const token = tokens.find(t => t.provider === provider);

        // Check if token is expired
        if (token?.expires_at && token.expires_at < Date.now()) {
            this.db.deleteAuthToken(provider);
            return undefined;
        }

        return token;
    }

    /** Remove an auth token */
    removeToken(provider: string): boolean {
        this.db.deleteAuthToken(provider);
        return true;
    }

    /** Check if authenticated for a provider */
    isAuthenticated(provider: string): boolean {
        return this.getToken(provider) !== undefined;
    }

    /** List all authenticated providers */
    listProviders(): string[] {
        return this.db.getAuthTokens().map(t => t.provider);
    }

    /** Clear all tokens */
    clearAll(): void {
        const tokens = this.db.getAuthTokens();
        for (const token of tokens) {
            this.db.deleteAuthToken(token.provider);
        }
    }
}
