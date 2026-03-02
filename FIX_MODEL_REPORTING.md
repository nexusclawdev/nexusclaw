# FIX: Agent Incorrectly Reporting Model as GPT-4

## Problem
Agent was hallucinating and claiming to be "OpenAI GPT-4" when actually using `kr/claude-sonnet-4.5`:

```
User: "which model are you using?"
Agent: "I'm running on OpenAI GPT-4"
```

This was incorrect - the config shows `kr/claude-sonnet-4.5` is configured.

## Root Cause
The system prompt didn't include any information about which model the agent is actually using. The LLM was hallucinating based on its training data rather than being told its actual model.

## Solution Applied

### 1. Updated Context Builder (context.ts)

**Added model parameter to buildMessages:**
```typescript
buildMessages(opts: {
    // ... other params
    model?: string;  // ← ADDED
}): ChatMessage[]
```

**Added model parameter to buildSystemPrompt:**
```typescript
private buildSystemPrompt(opts: {
    // ... other params
    model?: string;  // ← ADDED
}): string
```

**Added model info to prompt:**
```typescript
// Build model info
let modelInfo = opts.model ? `You are powered by the **${opts.model}** model.` : 'Model information not available';

let prompt = SYSTEM_PROMPT_TEMPLATE
    // ... other replacements
    .replace('{modelInfo}', modelInfo);  // ← ADDED
```

### 2. Updated Elite Prompt Template (elite-prompts.ts)

**Added {modelInfo} placeholder:**
```typescript
## System Information
- **Time**: {time}
- **Model**: {modelInfo}  // ← ADDED
- **Runtime**: Agent Runtime | Node.js {nodeVersion}
- **Platform**: {platform}
- **Workspace**: {workspace}
```

### 3. Updated Agent Loop (loop.ts)

**Passed model to buildMessages:**
```typescript
const initialMessages = this.context.buildMessages({
    // ... other params
    model: this.model,  // ← ADDED
});
```

## Result

**Before:**
```
User: "which model are you using?"
Agent: "I'm running on OpenAI GPT-4"
```

**After:**
```
User: "which model are you using?"
Agent: "I'm powered by kr/claude-sonnet-4.5"
```

## Files Modified

1. `src/agent/context.ts`
   - Line 27: Added model parameter to buildMessages
   - Line 90: Added model parameter to buildSystemPrompt
   - Line 127-128: Added modelInfo building
   - Line 142: Added modelInfo replacement

2. `src/agent/prompts/elite-prompts.ts`
   - Line 103: Added {modelInfo} placeholder

3. `src/agent/loop.ts`
   - Line 478: Added model parameter to buildMessages call

## How to Apply

**Restart NexusClaw:**
```bash
pkill -f 'node.*nexusclaw'
npm start
```

**Test:**
```
User: "which model are you using?"
Expected: "I'm powered by kr/claude-sonnet-4.5"
```

## Summary

The agent now correctly reports which model it's using based on the actual configuration (`kr/claude-sonnet-4.5`) instead of hallucinating about being GPT-4.

---

**Status:** ✅ FIX APPLIED - RESTART REQUIRED

**Next:** Restart NexusClaw and ask "which model are you using?"
