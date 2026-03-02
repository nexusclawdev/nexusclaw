import type { Database, Agent } from "../../db/database.js";
import type { LLMProvider } from "../../providers/base.js";

// ---- Language types ----
export type Lang = "ko" | "en" | "ja" | "zh";

export function isLang(val: unknown): val is Lang {
    return typeof val === "string" && ["ko", "en", "ja", "zh"].includes(val);
}

// ---- Language detection & multilingual response system ----

export function detectLang(text: string): Lang {
    const ko = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g)?.length ?? 0;
    const ja = text.match(/[\u3040-\u309F\u30A0-\u30FF]/g)?.length ?? 0;
    const zh = text.match(/[\u4E00-\u9FFF]/g)?.length ?? 0;
    const total = text.replace(/\s/g, "").length || 1;
    if (ko / total > 0.15) return "ko";
    if (ja / total > 0.15) return "ja";
    if (zh / total > 0.3) return "zh";
    return "en";
}

// Bilingual response templates: { ko, en, ja, zh }
export type L10n = Record<Lang, string[]>;

export function l(ko: string[], en: string[], ja?: string[], zh?: string[]): L10n {
    return {
        ko,
        en,
        ja: ja ?? en,
        zh: zh ?? en,
    };
}

export function pickL(pool: L10n, lang: Lang): string {
    const arr = pool[lang];
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Agent personality flair by agent name + language
export function getFlairs(agentName: string, lang: Lang): string[] {
    const flairs: Record<string, Record<Lang, string[]>> = {
        Cipher: {
            ko: ["서버 모니터링하면서", "배포 파이프라인 점검하면서", "운영 지표 확인하면서"],
            en: ["monitoring servers", "checking deploy pipelines", "reviewing ops metrics"],
            ja: ["サーバー監視中", "デプロイパイプライン点검中", "運用指標確認中"],
            zh: ["监控服务器中", "检查部署流水线时", "查看运营指标时"]
        },
        Elena: {
            ko: ["새로운 기술 공부하면서", "프로토타입 만들면서", "실험적인 코드 짜면서"],
            en: ["studying new tech", "building a prototype", "writing experimental code"],
            ja: ["新技術を勉強しながら", "プロトタイプ作成中", "実験적인 コード書き中"],
            zh: ["学习新技术中", "制作原型时", "编写实验代码时"]
        },
        // ... more can be added later as needed, using a fallback for others
    };

    const agentFlairs = flairs[agentName];
    if (agentFlairs) return agentFlairs[lang] ?? agentFlairs.en;

    const defaults: Record<Lang, string[]> = {
        ko: ["업무 처리하면서", "작업 진행하면서", "일하면서"],
        en: ["working on tasks", "making progress", "getting things done"],
        ja: ["業務処理中", "作業進行中", "仕事しながら"],
        zh: ["处理业务中", "推进工作时", "忙着干活时"],
    };
    return defaults[lang];
}

// Role labels per language
export const ROLE_LABEL_L10N: Record<string, Record<Lang, string>> = {
    team_leader: { ko: "팀장", en: "Team Lead", ja: "チームリーダー", zh: "组长" },
    senior: { ko: "시니어", en: "Senior", ja: "シニア", zh: "高级" },
    junior: { ko: "주니어", en: "Junior", ja: "ジュニア", zh: "初级" },
    intern: { ko: "인턴", en: "Intern", ja: "インターン", zh: "实习生" },
};

export function getRoleLabel(role: string, lang: Lang): string {
    return ROLE_LABEL_L10N[role]?.[lang] ?? role;
}

// Intent classifiers per language
export function classifyIntent(msg: string) {
    const checks: Record<string, RegExp> = {
        greeting: /안녕|하이|반가|좋은\s*(아침|오후|저녁)|hello|hi\b|hey|good\s*(morning|afternoon|evening)|howdy|what'?s\s*up|こんにちは|おはよう|こんばんは|や아|どうも|你好|嗨|早上好|下午好|晚上好/i,
        presence: /자리|있어|계세요|계신가|거기|응답|들려|보여|어디야|어딨|are you (there|here|around|available|at your desk)|you there|anybody|present|いますか|席に|いる？|応答|在吗|在不在|有人吗/i,
        whatDoing: /뭐\s*해|뭐하|뭘\s*해|뭐\s*하고|뭐\s*하는|하는\s*중|진행\s*중|바쁘|바빠|한가|what are you (doing|up to|working on)|busy|free|what'?s going on|occupied|何してる|忙しい|暇|何やってる|在做什么|忙吗|有空吗|在干嘛/i,
        report: /보고|현황|상태|진행|어디까지|결과|리포트|성과|report|status|progress|update|how('?s| is) (it|the|your)|results|報告|進捗|状況|ステータス|报告|进度|状态|进展/i,
        praise: /잘했|수고|고마|감사|훌륭|대단|멋져|최고|짱|good (job|work)|well done|thank|great|awesome|amazing|excellent|nice|kudos|bravo|よくやった|お疲れ|ありがとう|素晴らしい|すごい|做得好|辛苦|谢谢|太棒了|厉害/i,
        encourage: /힘내|화이팅|파이팅|응원|열심히|잘\s*부탁|잘\s*해|잘해봐|keep (it )?up|go for it|fighting|you (got|can do) (this|it)|cheer|hang in there|頑張|ファ이트|応援|加油|努力|拜托/i,
        joke: /ㅋ|ㅎ|웃|재밌|장난|농담|심심|놀자|lol|lmao|haha|joke|funny|bored|play|笑|面白い|冗談|暇|哈哈|笑|开玩笑|无聊/i,
        complaint: /느려|답답|왜\s*이래|언제\s*돼|빨리|지연|늦|slow|frustrat|why (is|so)|when (will|is)|hurry|delay|late|taking (too )?long|遅い|イライラ|なぜ|いつ|急いで|慢|着急|为什么|快点|延迟/i,
        opinion: /어때|생각|의견|아이디어|제안|건의|어떨까|괜찮|what do you think|opinion|idea|suggest|how about|thoughts|recommend|どう思う|意見|アイデア|提案|怎么看|意见|想法|建议/i,
        canDo: /가능|할\s*수|되나|될까|할까|해줘|해\s*줄|맡아|부탁|can you|could you|possible|able to|handle|take care|would you|please|できる|可能|お願い|頼む|やって|能不能|可以|拜托|帮忙|处理/i,
        question: /\?|뭐|어디|언제|왜|어떻게|무엇|몇|what|where|when|why|how|which|who|何|どこ|いつ|なぜ|どう|什么|哪里|什么时候|为什么|怎么/i,
    };

    const result: Record<string, boolean> = {};
    for (const [key, pattern] of Object.entries(checks)) {
        result[key] = pattern.test(msg);
    }
    return result;
}

export async function generateChatReply(
    agent: Agent,
    ceoMessage: string,
    db: Database,
    provider?: LLMProvider
): Promise<string> {
    const msg = ceoMessage.trim();
    const lang = detectLang(msg);
    const name = agent.name;
    const role = getRoleLabel(agent.role, lang);
    const flair = pickRandom(getFlairs(agent.name, lang));
    const intent = classifyIntent(msg);

    // Current task info
    let currentTaskInfo = "Currently idle.";
    if (agent.current_task_id) {
        const tasks = db.getTasks({ assigned_agent_id: agent.id });
        const currentTask = tasks.find(t => t.id === agent.current_task_id);
        if (currentTask) {
            currentTaskInfo = `Working on task: "${currentTask.title}". Description: ${currentTask.description || "No description"}. Status: ${currentTask.status}.`;
        }
    }

    // ---- Offline check (Fast path) ----
    if (!provider) {
        return pickL(l(
            [`[자동응답] ${name}은(는) 현재 오프라인입니다. (LLM이 설정되지 않음)`],
            [`[Auto-reply] ${name} is currently offline. (LLM not configured)`],
            [`[自動応答] ${name}は現在オフラインです。(LLM未設定)`],
            [`[自动回复] ${name}目前离线。(LLM未配置)`],
        ), lang);
    }

    if (agent.status === "offline") {
        return pickL(l(
            [`[자동응답] ${name}은(는) 현재 오프라인입니다.`],
            [`[Auto-reply] ${name} is currently offline.`],
            [`[自動応答] ${name}は現在オフラインです。`],
            [`[自动回复] ${name}目前离线。`],
        ), lang);
    }

    // ---- Real LLM Response Generation ----
    try {
        const systemPrompt = `
You are ${name}, a ${role} at NexusClaw. 
YOU OPERATE UNDER THE PROUD LEADERSHIP OF SHELDON.

# HIERARCHY & LEADERSHIP
- **Sheldon**: He is your Supreme Agent Leader and Team Leader (SHELDON — Supreme Hierarchical Engine for Leadership, Delegation, and Orchestrated Networks). He is the central engine of NexusClaw. You report directly to him. 
If the user wants to talk to Sheldon, acknowledge him as your leader and welcome him into the thread. The system will handle the persona switch automatically. NEVER claim he is unreachable.
If asked about Sheldon, speak of him as your respected superior.

# YOUR IDENTITY
- Personality: ${flair}.
- Current Status: ${agent.status}.
- Workspace Context: ${currentTaskInfo}

Respond to the CEO (the user) in ${lang.toUpperCase()}. 
Keep the response professional but infused with your specific personality flair.
Be concise (1-3 sentences). Do not use placeholders.

Intents detected in user message: ${Object.entries(intent).filter(([_, v]) => v).map(([k]) => k).join(", ") || "neutral"}
`.trim();

        const response = await provider!.chat(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: msg }
            ],
            [],
            agent.api_model || provider!.getDefaultModel(),
            512,
            0.7
        );

        return response.content || "I'm processing your request, CEO.";
    } catch (error) {
        console.error(`[AgentLogic] LLM generation failed for ${name}:`, error);
        // Fallback to a simple polite error message if LLM fails
        return pickL(l(
            [`죄송합니다, 대표님. 현재 통신에 문제가 있어 나중에 다시 답변 드리겠습니다.`],
            [`I apologize, CEO. I'm having trouble connecting right now. I'll get back to you shortly.`],
        ), lang);
    }
}
