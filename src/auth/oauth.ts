/**
 * OAuth 2.0 Flow Handler
 * Secure authentication flow for external service providers
 */

import { createServer, type Server } from 'node:http';
import { parse } from 'node:url';
import { AuthManager } from './manager.js';
import { Database } from '../db/database.js';

export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    redirectUri: string;
    scope: string[];
}

export class OAuthHandler {
    private authManager: AuthManager;
    private server?: Server;

    constructor(db: Database) {
        this.authManager = new AuthManager(db);
    }

    /** Start OAuth flow for a provider */
    async startFlow(provider: string, config: OAuthConfig): Promise<string> {
        const state = Math.random().toString(36).substring(7);

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: config.scope.join(' '),
            state,
        });

        const authUrl = `${config.authUrl}?${params.toString()}`;

        // Start local server to receive callback
        await this.startCallbackServer(provider, config, state);

        return authUrl;
    }

    /** Start local server to receive OAuth callback */
    private async startCallbackServer(
        provider: string,
        config: OAuthConfig,
        expectedState: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = createServer(async (req, res) => {
                const url = parse(req.url || '', true);

                if (url.pathname === '/callback') {
                    const { code, state } = url.query;

                    if (state !== expectedState) {
                        res.writeHead(400);
                        res.end('Invalid state parameter');
                        reject(new Error('Invalid state'));
                        return;
                    }

                    try {
                        // Exchange code for token
                        const token = await this.exchangeCode(
                            code as string,
                            config
                        );

                        this.authManager.setToken(provider, {
                            provider,
                            access_token: token.access_token,
                            refresh_token: token.refresh_token,
                            expires_at: token.expires_in
                                ? Date.now() + token.expires_in * 1000
                                : undefined,
                            scope: config.scope.join(' '),
                        });

                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');

                        this.server?.close();
                        resolve();
                    } catch (err) {
                        res.writeHead(500);
                        res.end('Authentication failed');
                        reject(err);
                    }
                }
            });

            this.server.listen(3000);
        });
    }

    /** Exchange authorization code for access token */
    private async exchangeCode(
        code: string,
        config: OAuthConfig
    ): Promise<any> {
        const params = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
        });

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.statusText}`);
        }

        return response.json();
    }

    /** Refresh an access token */
    async refreshToken(provider: string, config: OAuthConfig): Promise<boolean> {
        const token = this.authManager.getToken(provider);
        if (!token?.refresh_token) {
            return false;
        }

        try {
            const params = new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: token.refresh_token,
                grant_type: 'refresh_token',
            });

            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                return false;
            }

            const newToken = await response.json();

            this.authManager.setToken(provider, {
                provider,
                access_token: newToken.access_token,
                refresh_token: newToken.refresh_token || token.refresh_token,
                expires_at: newToken.expires_in
                    ? Date.now() + newToken.expires_in * 1000
                    : undefined,
                scope: token.scope,
            });

            return true;
        } catch {
            return false;
        }
    }
}
