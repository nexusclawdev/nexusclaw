/**
 * Message bus events — typed event contracts between channels and agent.
 */

export interface InboundMessage {
    channel: string;        // telegram, discord, whatsapp, web, cli
    senderId: string;
    chatId: string;
    content: string;
    timestamp: Date;
    media: string[];
    metadata: Record<string, unknown>;
}

export interface OutboundMessage {
    channel: string;
    chatId: string;
    content: string;
    replyTo?: string;
    media: string[];
    metadata: Record<string, unknown>;
}

export function createInbound(
    channel: string,
    senderId: string,
    chatId: string,
    content: string,
    extra?: Partial<InboundMessage>,
): InboundMessage {
    return {
        channel,
        senderId,
        chatId,
        content,
        timestamp: new Date(),
        media: [],
        metadata: {},
        ...extra,
    };
}

export function createOutbound(
    channel: string,
    chatId: string,
    content: string,
    extra?: Partial<OutboundMessage>,
): OutboundMessage {
    return {
        channel,
        chatId,
        content,
        media: [],
        metadata: {},
        ...extra,
    };
}

/** Session key from a message */
export function sessionKey(msg: InboundMessage): string {
    return `${msg.channel}:${msg.chatId}`;
}
