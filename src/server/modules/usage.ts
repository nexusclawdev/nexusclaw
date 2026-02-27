/**
 * Usage Tracking - Real provider usage monitoring
 */

export interface UsageWindow {
    label: string;
    utilization: number;
    resetsAt: string | null;
}

export interface ProviderUsage {
    windows: UsageWindow[];
    error: string | null;
}

export interface AllUsage {
    [provider: string]: ProviderUsage;
}

export class UsageTracker {
    private usage: AllUsage = {};

    /** Get usage for all providers */
    getUsage(): AllUsage {
        return this.usage;
    }

    /** Update usage for a specific provider */
    updateProviderUsage(provider: string, windows: UsageWindow[], error: string | null = null): void {
        this.usage[provider] = { windows, error };
    }

    /** Track API call and update utilization */
    trackApiCall(provider: string, tokensUsed: number, tokenLimit: number, resetTime?: Date): void {
        const utilization = Math.min(tokensUsed / tokenLimit, 1.0);

        if (!this.usage[provider]) {
            this.usage[provider] = { windows: [], error: null };
        }

        // Update or add window
        const existingWindow = this.usage[provider].windows.find(w => w.label === 'Current');
        if (existingWindow) {
            existingWindow.utilization = utilization;
            existingWindow.resetsAt = resetTime ? resetTime.toISOString() : null;
        } else {
            this.usage[provider].windows.push({
                label: 'Current',
                utilization,
                resetsAt: resetTime ? resetTime.toISOString() : null
            });
        }
    }

    /** Set error for a provider */
    setProviderError(provider: string, error: string): void {
        if (!this.usage[provider]) {
            this.usage[provider] = { windows: [], error };
        } else {
            this.usage[provider].error = error;
        }
    }

    /** Clear error for a provider */
    clearProviderError(provider: string): void {
        if (this.usage[provider]) {
            this.usage[provider].error = null;
        }
    }

    /** Initialize default providers */
    initializeDefaults(): void {
        const providers = ['openai', 'anthropic', 'google', 'xai', 'openrouter'];

        for (const provider of providers) {
            if (!this.usage[provider]) {
                this.usage[provider] = {
                    windows: [{
                        label: 'Current',
                        utilization: 0.0,
                        resetsAt: null
                    }],
                    error: null
                };
            }
        }
    }

    /** Reset all usage data */
    reset(): void {
        this.usage = {};
        this.initializeDefaults();
    }
}

// Singleton instance
export const usageTracker = new UsageTracker();
usageTracker.initializeDefaults();
