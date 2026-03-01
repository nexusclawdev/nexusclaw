/**
 * AI Webhook Intelligence — Auto-classify and route ANY incoming webhook.
 *
 * Supports: GitHub, Stripe, Slack, Linear, PagerDuty, Jira, Vercel,
 * Render, Netlify, Twilio, SendGrid, Shopify, and completely unknown webhooks.
 *
 * Pipeline:
 *   1. Receive raw POST body (any JSON)
 *   2. Detect source platform by signature headers + payload structure
 *   3. Extract intent: what happened? (e.g., "PR opened", "payment failed")
 *   4. Determine urgency level (1-10)
 *   5. Route to appropriate department + agent
 *   6. Optionally trigger agent loop to respond
 */

import type { LLMProvider } from '../../providers/base.js';

export interface WebhookClassification {
    platform: string;             // GitHub, Stripe, Slack, etc.
    event: string;                // pull_request.opened, payment_intent.failed, etc.
    intent: string;               // Human-readable: "New PR opened: Fix auth bug"
    urgency: number;              // 1-10
    department: string;           // planning, development, qa, devsecops, operations
    suggestedAgent: string;       // agent name
    extractedData: Record<string, unknown>;  // key fields extracted
    shouldAutoAct: boolean;       // should the agent automatically respond?
    suggestedAction?: string;     // what action to take
}

// ── Platform detection rules ──────────────────────────────────────────────────

const PLATFORM_SIGNATURES: Array<{
    name: string;
    headers: RegExp[];
    bodyChecks: Array<(body: any) => boolean>;
}> = [
        {
            name: 'GitHub',
            headers: [/^x-github-event$/i, /^x-hub-signature-256$/i],
            bodyChecks: [b => !!b?.repository?.full_name, b => !!b?.sender?.login],
        },
        {
            name: 'Stripe',
            headers: [/^stripe-signature$/i],
            bodyChecks: [b => b?.type?.startsWith('payment') || b?.type?.startsWith('customer') || b?.object === 'event'],
        },
        {
            name: 'Slack',
            headers: [/^x-slack-signature$/i, /^x-slack-request-timestamp$/i],
            bodyChecks: [b => b?.type === 'url_verification' || !!b?.event?.type || b?.type === 'event_callback'],
        },
        {
            name: 'Linear',
            headers: [/^linear-signature$/i],
            bodyChecks: [b => b?.type?.includes('Issue') || b?.type?.includes('Cycle') || !!b?.data?.identifier],
        },
        {
            name: 'PagerDuty',
            headers: [/^x-pagerduty-signature$/i],
            bodyChecks: [b => !!b?.messages?.[0]?.event || !!b?.event?.data?.type],
        },
        {
            name: 'Vercel',
            headers: [/^x-vercel-signature$/i],
            bodyChecks: [b => !!b?.deployment?.id || !!b?.projectId],
        },
        {
            name: 'Jira',
            headers: [],
            bodyChecks: [b => !!b?.webhookEvent && b?.webhookEvent?.startsWith('jira:'), b => !!b?.issue?.key],
        },
        {
            name: 'Netlify',
            headers: [/^x-netlify-digest$/i],
            bodyChecks: [b => !!b?.site_id || (b?.branch && b?.deploy_id)],
        },
        {
            name: 'Shopify',
            headers: [/^x-shopify-topic$/i, /^x-shopify-shop-domain$/i],
            bodyChecks: [b => !!b?.order_id || !!b?.customer?.email],
        },
    ];

function detectPlatform(headers: Record<string, string>, body: any): string {
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());

    for (const platform of PLATFORM_SIGNATURES) {
        const headerMatch = platform.headers.length === 0 ||
            platform.headers.some(r => headerKeys.some(k => r.test(k)));
        const bodyMatch = platform.bodyChecks.some(fn => {
            try { return fn(body); } catch { return false; }
        });

        if (headerMatch && bodyMatch) return platform.name;
    }
    return 'Unknown';
}

function extractGitHubData(event: string, body: any): Partial<WebhookClassification> {
    switch (event) {
        case 'pull_request': {
            const pr = body.pull_request;
            const action = body.action;
            return {
                intent: `PR ${action}: "${pr?.title}" (#${pr?.number}) by @${pr?.user?.login}`,
                urgency: action === 'opened' ? 6 : action === 'closed' ? 4 : 3,
                department: 'development',
                suggestedAgent: 'Elena',
                shouldAutoAct: action === 'opened',
                suggestedAction: action === 'opened' ? `Review PR #${pr?.number}: ${pr?.html_url}` : undefined,
                extractedData: {
                    prNumber: pr?.number,
                    title: pr?.title,
                    author: pr?.user?.login,
                    branch: pr?.head?.ref,
                    url: pr?.html_url,
                    additions: pr?.additions,
                    deletions: pr?.deletions,
                },
            };
        }
        case 'push': {
            const commits = body.commits?.length || 0;
            const branch = body.ref?.replace('refs/heads/', '');
            return {
                intent: `${commits} commit(s) pushed to \`${branch}\` by @${body.pusher?.name}`,
                urgency: branch === 'main' || branch === 'master' ? 7 : 4,
                department: branch === 'main' ? 'devsecops' : 'development',
                suggestedAgent: branch === 'main' ? 'Zane' : 'Elena',
                shouldAutoAct: branch === 'main' || branch === 'master',
                extractedData: { branch, commits, pusher: body.pusher?.name, repo: body.repository?.full_name },
            };
        }
        case 'issues': {
            const issue = body.issue;
            return {
                intent: `Issue ${body.action}: "${issue?.title}" (#${issue?.number})`,
                urgency: body.action === 'opened' ? 5 : 3,
                department: 'planning',
                suggestedAgent: 'Cipher',
                shouldAutoAct: false,
                extractedData: { number: issue?.number, title: issue?.title, url: issue?.html_url },
            };
        }
        case 'workflow_run': {
            const status = body.workflow_run?.conclusion;
            return {
                intent: `CI workflow "${body.workflow_run?.name}" ${status || body.action}`,
                urgency: status === 'failure' ? 9 : status === 'success' ? 2 : 5,
                department: status === 'failure' ? 'qa' : 'devsecops',
                suggestedAgent: status === 'failure' ? 'Mia' : 'Zane',
                shouldAutoAct: status === 'failure',
                suggestedAction: status === 'failure' ? `CI failed: investigate ${body.workflow_run?.html_url}` : undefined,
                extractedData: { name: body.workflow_run?.name, status, url: body.workflow_run?.html_url },
            };
        }
        default:
            return {
                intent: `GitHub ${event} event`,
                urgency: 4,
                department: 'development',
                suggestedAgent: 'Elena',
                shouldAutoAct: false,
                extractedData: {},
            };
    }
}

function extractStripeData(body: any): Partial<WebhookClassification> {
    const type = body?.type || 'unknown';
    const obj = body?.data?.object;
    const isFailure = type.includes('failed') || type.includes('canceled') || type.includes('declined');
    const amount = obj?.amount ? `$${(obj.amount / 100).toFixed(2)} ${obj.currency?.toUpperCase()}` : '';

    return {
        intent: `Stripe ${type}${amount ? ': ' + amount : ''}`,
        urgency: isFailure ? 9 : type.includes('succeeded') ? 3 : 5,
        department: isFailure ? 'operations' : 'operations',
        suggestedAgent: 'Liam',
        shouldAutoAct: isFailure,
        suggestedAction: isFailure ? `Payment event requires attention: ${type}` : undefined,
        extractedData: {
            type,
            amount: obj?.amount,
            currency: obj?.currency,
            customerId: obj?.customer,
            status: obj?.status,
        },
    };
}

function extractSlackData(body: any): Partial<WebhookClassification> {
    if (body.type === 'url_verification') {
        return {
            intent: 'Slack URL verification challenge',
            urgency: 1,
            department: 'operations',
            suggestedAgent: 'Liam',
            shouldAutoAct: false,
            extractedData: { challenge: body.challenge },
        };
    }
    const event = body.event;
    return {
        intent: `Slack ${event?.type || 'event'} in ${event?.channel || 'channel'}`,
        urgency: event?.type === 'message' ? 3 : 5,
        department: 'operations',
        suggestedAgent: 'Liam',
        shouldAutoAct: false,
        extractedData: { eventType: event?.type, user: event?.user, text: event?.text?.slice(0, 100) },
    };
}

// ── Main classifier ───────────────────────────────────────────────────────────

export async function classifyWebhook(
    headers: Record<string, string>,
    body: any,
    provider?: LLMProvider,
    model?: string,
): Promise<WebhookClassification> {
    const platform = detectPlatform(headers, body);
    const githubEvent = headers['x-github-event'] || '';

    let partial: Partial<WebhookClassification> = {};

    // Rule-based fast classification
    if (platform === 'GitHub') {
        partial = extractGitHubData(githubEvent, body);
    } else if (platform === 'Stripe') {
        partial = extractStripeData(body);
    } else if (platform === 'Slack') {
        partial = extractSlackData(body);
    } else if (platform === 'Linear') {
        const issueId = body?.data?.identifier || body?.data?.id;
        partial = {
            intent: `Linear ${body?.type || 'event'}: ${body?.data?.title || issueId || ''}`,
            urgency: body?.type?.includes('Issue') ? 6 : 4,
            department: 'planning',
            suggestedAgent: 'Cipher',
            shouldAutoAct: false,
            extractedData: { type: body?.type, id: issueId },
        };
    } else if (platform === 'PagerDuty') {
        const pd = body?.messages?.[0] || body?.event;
        const isAlert = String(pd?.event || pd?.type || '').includes('alert') || String(pd?.event || '').includes('trigger');
        partial = {
            intent: `PagerDuty ${pd?.event || pd?.type || 'event'}: ${pd?.payload?.summary?.slice(0, 80) || ''}`,
            urgency: isAlert ? 10 : 6,
            department: 'devsecops',
            suggestedAgent: 'Zane',
            shouldAutoAct: isAlert,
            suggestedAction: isAlert ? `PagerDuty alert triggered — investigate immediately!` : undefined,
            extractedData: { event: pd?.event, severity: pd?.payload?.severity },
        };
    } else if (provider && model) {
        // Unknown platform: use LLM to classify
        try {
            const prompt = `You are a webhook classifier. Analyze this webhook payload and return a JSON object with these fields:
- platform (string): detected service name
- event (string): specific event type
- intent (string): human-readable description of what happened
- urgency (number 1-10): how urgent is this
- department (string): one of: planning, development, qa, devsecops, operations
- suggestedAgent (string): one of: Cipher, Elena, Alex, Mia, Zane, Liam
- shouldAutoAct (boolean): should the AI agent take immediate action?
- suggestedAction (string, optional): what action to take

Payload: ${JSON.stringify(body).slice(0, 3000)}

Return ONLY valid JSON, no markdown.`;

            const response = await provider.chat(
                [{ role: 'user', content: prompt }],
                [],
                model,
                512,
                0.1,
            );

            const jsonMatch = response.content?.match(/\{[\s\S]+\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                partial = {
                    intent: parsed.intent || 'Unknown webhook event',
                    urgency: Number(parsed.urgency) || 5,
                    department: parsed.department || 'operations',
                    suggestedAgent: parsed.suggestedAgent || 'Liam',
                    shouldAutoAct: !!parsed.shouldAutoAct,
                    suggestedAction: parsed.suggestedAction,
                    extractedData: {},
                };
            }
        } catch {
            // fallback below
        }
    }

    return {
        platform,
        event: githubEvent || body?.type || body?.webhookEvent || 'unknown',
        intent: partial.intent || `${platform} ${body?.type || body?.action || 'event'}`,
        urgency: partial.urgency ?? 5,
        department: partial.department ?? 'operations',
        suggestedAgent: partial.suggestedAgent ?? 'Liam',
        extractedData: partial.extractedData ?? {},
        shouldAutoAct: partial.shouldAutoAct ?? false,
        suggestedAction: partial.suggestedAction,
    };
}
