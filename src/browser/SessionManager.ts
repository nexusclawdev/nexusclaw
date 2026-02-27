/**
 * SessionManager
 * Orchestrates the full lifecycle of a Browser Action Session.
 * Bridges DockerIsolation, PlaywrightController, and BrowserVault.
 */

import { PlaywrightController } from './PlaywrightController.js';
import { DockerIsolation } from './DockerIsolation.js';
import { BrowserVault } from './BrowserVault.js';

export class BrowserSessionManager {
    private docker = new DockerIsolation();
    private vault: BrowserVault;
    private controllers = new Map<string, PlaywrightController>();

    constructor(encryptionKey?: string) {
        this.vault = new BrowserVault(encryptionKey);
    }

    public async startSession(
        sessionId: string,
        profileName: string,
        useDocker: boolean = false
    ): Promise<PlaywrightController> {
        if (this.controllers.has(sessionId)) {
            return this.controllers.get(sessionId)!;
        }

        if (useDocker) {
            // In a production scenario, DockerIsolation would launch the browser 
            // and Playwright would connect to it via CDP (Chrome DevTools Protocol).
            // For this abstraction, we log the isolation boundary.
            console.log(`[SessionManager] Starting Docker isolation for ${sessionId}...`);
            this.docker.startEphemeralBrowser(sessionId);
        }

        const controller = new PlaywrightController(this.vault, true);
        await controller.initialize(profileName);
        this.controllers.set(sessionId, controller);

        console.log(`[SessionManager] Session ${sessionId} started for profile ${profileName}`);
        return controller;
    }

    public async endSession(
        sessionId: string,
        profileName: string,
        useDocker: boolean = false
    ): Promise<void> {
        const controller = this.controllers.get(sessionId);
        if (controller) {
            await controller.shutdown(profileName);
            this.controllers.delete(sessionId);
            console.log(`[SessionManager] Session ${sessionId} ended.`);
        }

        if (useDocker) {
            this.docker.stopEphemeralBrowser(sessionId);
        }
    }

    public getController(sessionId: string): PlaywrightController | undefined {
        return this.controllers.get(sessionId);
    }
}
