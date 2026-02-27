/**
 * PlaywrightController
 * A robust wrapper over Playwright for enterprise-level browser automation.
 * Supports stealth, memory management, and connection to BrowserVault.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserVault } from './BrowserVault.js';

export class PlaywrightController {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private activePages = new Map<string, Page>();

    constructor(
        private vault: BrowserVault,
        private headless: boolean = true,
    ) { }

    public async initialize(profileName: string): Promise<void> {
        if (this.browser) return;

        this.browser = await chromium.launch({
            headless: this.headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            timezoneId: 'America/New_York'
        });

        // Load cookies from Vault if they exist
        const savedCookies = this.vault.loadSession(profileName);
        if (savedCookies && Array.isArray(savedCookies)) {
            await this.context.addCookies(savedCookies);
            console.log(`[PlaywrightController] Restored ${savedCookies.length} cookies from Vault.`);
        }
    }

    public async createPage(pageId: string): Promise<Page> {
        if (!this.context) throw new Error('Browser context not initialized');
        const page = await this.context.newPage();

        // Anti-detection strips
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        this.activePages.set(pageId, page);
        return page;
    }

    public async saveState(profileName: string): Promise<void> {
        if (!this.context) return;
        const cookies = await this.context.cookies();
        this.vault.saveSession(profileName, cookies);
        console.log(`[PlaywrightController] Saved ${cookies.length} cookies to Vault.`);
    }

    public async closePage(pageId: string): Promise<void> {
        const page = this.activePages.get(pageId);
        if (page) {
            await page.close();
            this.activePages.delete(pageId);
        }
    }

    public async shutdown(profileName: string): Promise<void> {
        await this.saveState(profileName);
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.activePages.clear();
        }
    }
}
