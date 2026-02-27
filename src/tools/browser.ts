/**
 * Browser automation tool — NexusClaw exclusive feature (not in nanobot).
 * Playwright-powered browser control with DOM cleaning and screenshot capture.
 * This is the killer feature that makes NexusClaw > nanobot.
 */

import { Tool, ToolParameters } from './base.js';

export class BrowseTool extends Tool {
    private browser: any = null;
    private page: any = null;
    private idleTimer: NodeJS.Timeout | null = null;
    private readonly IDLE_TIMEOUT_MS = 60000; // 60s idle timeout to free RAM

    constructor(
        private headless: boolean = true,
        private timeout: number = 30000,
    ) { super(); }

    get name() { return 'browse'; }
    get description() { return 'Navigate to a URL, interact with web pages, extract content, take screenshots. Use for web automation tasks.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Browser action to perform',
                    enum: ['navigate', 'click', 'type', 'screenshot', 'extract', 'scroll', 'wait', 'close'],
                },
                url: { type: 'string', description: 'URL to navigate to (for navigate action)' },
                selector: { type: 'string', description: 'CSS selector for the target element' },
                text: { type: 'string', description: 'Text to type (for type action)' },
                extract_type: { type: 'string', description: 'What to extract: text, html, links, structured', enum: ['text', 'html', 'links', 'structured'] },
            },
            required: ['action'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        this.resetIdleTimer();
        const action = String(params.action);

        try {
            switch (action) {
                case 'navigate':
                    return await this.navigate(String(params.url ?? ''));
                case 'click':
                    return await this.click(String(params.selector ?? ''));
                case 'type':
                    return await this.typeText(String(params.selector ?? ''), String(params.text ?? ''));
                case 'screenshot':
                    return await this.screenshot();
                case 'extract':
                    return await this.extract(String(params.extract_type ?? 'text'));
                case 'scroll':
                    return await this.scroll(String(params.selector ?? ''));
                case 'wait':
                    return await this.waitFor(String(params.selector ?? ''));
                case 'close':
                    return await this.closeBrowser();
                default:
                    return `Error: Unknown action '${action}'`;
            }
        } catch (e) {
            return `Error: ${e instanceof Error ? e.message : String(e)}`;
        }
    }

    private async ensureBrowser(): Promise<void> {
        if (this.browser && this.page) return;

        console.log(`\n🌐 [BrowseTool] Launching Chrome instance...`);
        const { chromium } = await import('playwright');

        // Use 'chrome' channel to get proprietary media codecs (H.264, AAC) so YouTube plays correctly
        this.browser = await chromium.launch({
            headless: this.headless,
            channel: 'chrome'
        });

        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
        });
        this.page = await context.newPage();
        this.page.setDefaultTimeout(this.timeout);
    }

    private async navigate(url: string): Promise<string> {
        if (!url) return 'Error: URL required for navigate action';
        await this.ensureBrowser();

        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        const title = await this.page.title();

        // Clean DOM extract
        const text = await this.page.evaluate(() => {
            const scripts = document.querySelectorAll('script, style, noscript, iframe');
            scripts.forEach(el => el.remove());
            return document.body?.innerText?.slice(0, 5000) || '';
        });

        return `✅ Navigated to: ${url}\nTitle: ${title}\n\nContent preview:\n${text}`;
    }

    private async click(selector: string): Promise<string> {
        if (!selector) return 'Error: selector required';
        await this.ensureBrowser();
        await this.page.click(selector);
        return `✅ Clicked: ${selector}`;
    }

    private async typeText(selector: string, text: string): Promise<string> {
        if (!selector || !text) return 'Error: selector and text required';
        await this.ensureBrowser();
        await this.page.fill(selector, text);
        return `✅ Typed "${text}" into ${selector}`;
    }

    private async screenshot(): Promise<string> {
        await this.ensureBrowser();
        const buffer = await this.page.screenshot({ type: 'png', fullPage: false });
        const base64 = buffer.toString('base64');
        return `✅ Screenshot captured (${Math.round(buffer.length / 1024)}KB)\n[base64 data available]`;
    }

    private async extract(extractType: string): Promise<string> {
        await this.ensureBrowser();

        switch (extractType) {
            case 'text':
                return await this.page.evaluate(() => {
                    const scripts = document.querySelectorAll('script, style, noscript');
                    scripts.forEach((el: Element) => el.remove());
                    return document.body?.innerText?.slice(0, 10000) || '(empty)';
                });

            case 'html':
                const html = await this.page.content();
                return html.slice(0, 10000);

            case 'links':
                return await this.page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a[href]'));
                    return links
                        .slice(0, 50)
                        .map((a: Element) => `${(a as HTMLAnchorElement).textContent?.trim()} → ${(a as HTMLAnchorElement).href}`)
                        .join('\n');
                });

            case 'structured':
                return await this.page.evaluate(() => {
                    const data: Record<string, string> = {};
                    data.title = document.title;
                    data.url = window.location.href;
                    const meta = document.querySelector('meta[name="description"]');
                    if (meta) data.description = meta.getAttribute('content') || '';
                    const h1 = document.querySelector('h1');
                    if (h1) data.heading = h1.textContent || '';
                    return JSON.stringify(data, null, 2);
                });

            default:
                return 'Error: extract_type must be text, html, links, or structured';
        }
    }

    private async scroll(selector: string): Promise<string> {
        await this.ensureBrowser();
        if (selector) {
            await this.page.evaluate((sel: string) => {
                document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' });
            }, selector);
            return `✅ Scrolled to ${selector}`;
        }
        await this.page.evaluate(() => window.scrollBy(0, 500));
        return '✅ Scrolled down 500px';
    }

    private async waitFor(selector: string): Promise<string> {
        if (!selector) return 'Error: selector required';
        await this.ensureBrowser();
        await this.page.waitForSelector(selector, { timeout: this.timeout });
        return `✅ Element found: ${selector}`;
    }

    private async closeBrowser(): Promise<string> {
        if (this.idleTimer) clearTimeout(this.idleTimer);

        if (this.browser) {
            console.log(`\n💤 [BrowseTool] Idle timeout reached. Closing Chrome to free RAM...`);
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
        return '✅ Browser closed';
    }

    private resetIdleTimer() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            if (this.browser) {
                this.closeBrowser().catch(() => { });
            }
        }, this.IDLE_TIMEOUT_MS);
        // Unref so the timer doesn't keep the Node.js event loop alive preventing shutdown
        if (this.idleTimer.unref) this.idleTimer.unref();
    }
}
