/**
 * DockerIsolation
 * Safely spins up ephemeral containers for untrusted web navigation.
 */

import { execSync } from 'node:child_process';

export class DockerIsolation {
    private containerPrefix = 'nexusclaw-browser-';

    public isDockerAvailable(): boolean {
        try {
            execSync('docker --version', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    public startEphemeralBrowser(sessionId: string): string {
        const containerName = `${this.containerPrefix}${sessionId}`;

        // Example command to run a headless Chromium container (needs playwright image)
        // For production, a custom Dockerfile is usually built.
        const cmd = `docker run -d --rm --name ${containerName} --shm-size=1g mcr.microsoft.com/playwright:v1.45.0-jammy sleep infinity`;

        try {
            const out = execSync(cmd, { encoding: 'utf8' });
            return out.trim();
        } catch (e) {
            throw new Error(`Failed to start Docker container ${containerName}`);
        }
    }

    public stopEphemeralBrowser(sessionId: string): void {
        const containerName = `${this.containerPrefix}${sessionId}`;
        try {
            execSync(`docker stop ${containerName}`, { stdio: 'ignore' });
        } catch (e) {
            // Probably already stopped
        }
    }

    public executeIsolatedScript(sessionId: string, scriptContent: string): string {
        const containerName = `${this.containerPrefix}${sessionId}`;

        // This is a naive example; in reality, you'd volume mount or pass via stdin
        const cmd = `docker exec -i ${containerName} node -e "${scriptContent.replace(/"/g, '\\"')}"`;

        try {
            return execSync(cmd, { encoding: 'utf8' });
        } catch (e) {
            console.error(`Isolation execution failed in ${containerName}`);
            return '';
        }
    }
}
