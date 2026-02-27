/**
 * Browser Agent Node
 * Specialized in fulfilling web exploration and interaction tasks.
 */
import { BaseMessage, AIMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { BrowseTool } from '../tools/browser.js';

export async function browserAgentNode(state: { messages: BaseMessage[] }): Promise<{ messages: BaseMessage[] }> {
    console.log('[BrowserAgent] Processing browser task...');

    const lastMessage = state.messages[state.messages.length - 1];
    const browse = new BrowseTool(true);

    try {
        // Parse the message to extract browser action
        const content = lastMessage.content.toString();

        // Detect action type from message
        let action: 'navigate' | 'click' | 'type' | 'extract' | 'screenshot' = 'navigate';
        let target = '';
        let value = '';

        // Simple action detection
        if (content.includes('click') || content.includes('Click')) {
            action = 'click';
            // Extract selector or text after "click"
            const match = content.match(/click\s+(?:on\s+)?["']?([^"'\n]+)["']?/i);
            target = match ? match[1].trim() : '';
        } else if (content.includes('type') || content.includes('enter') || content.includes('input')) {
            action = 'type';
            const match = content.match(/type\s+["']([^"']+)["']\s+(?:in|into)\s+["']?([^"'\n]+)["']?/i);
            if (match) {
                value = match[1];
                target = match[2];
            }
        } else if (content.includes('screenshot') || content.includes('capture')) {
            action = 'screenshot';
        } else if (content.includes('extract') || content.includes('get text') || content.includes('scrape')) {
            action = 'extract';
            const match = content.match(/extract\s+(?:from\s+)?["']?([^"'\n]+)["']?/i);
            target = match ? match[1].trim() : 'body';
        } else if (content.includes('http') || content.includes('www.')) {
            action = 'navigate';
            const urlMatch = content.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
            target = urlMatch ? urlMatch[1] : '';
        }

        // Execute browser action
        let result: string;

        switch (action) {
            case 'navigate':
                if (!target) {
                    result = 'Error: No URL specified for navigation';
                } else {
                    const navResult = await browse.execute({
                        action: 'navigate',
                        url: target.startsWith('http') ? target : `https://${target}`,
                    });
                    result = `Navigated to ${target}. ${navResult}`;
                }
                break;

            case 'click':
                if (!target) {
                    result = 'Error: No element specified for clicking';
                } else {
                    const clickResult = await browse.execute({
                        action: 'click',
                        selector: target,
                    });
                    result = `Clicked on "${target}". ${clickResult}`;
                }
                break;

            case 'type':
                if (!target || !value) {
                    result = 'Error: Missing input field or value';
                } else {
                    const typeResult = await browse.execute({
                        action: 'type',
                        selector: target,
                        text: value,
                    });
                    result = `Typed "${value}" into "${target}". ${typeResult}`;
                }
                break;

            case 'extract':
                const extractResult = await browse.execute({
                    action: 'extract',
                    selector: target || 'body',
                });
                result = `Extracted content: ${extractResult}`;
                break;

            case 'screenshot':
                const screenshotResult = await browse.execute({
                    action: 'screenshot',
                });
                result = `Screenshot captured: ${screenshotResult}`;
                break;

            default:
                result = `Processed browser task: ${content}`;
        }

        const response = new AIMessage({
            content: result
        });

        return { messages: [response] };

    } catch (error) {
        console.error('[BrowserAgent] Error:', error);

        const errorResponse = new AIMessage({
            content: `Browser task failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });

        return { messages: [errorResponse] };
    }
}
