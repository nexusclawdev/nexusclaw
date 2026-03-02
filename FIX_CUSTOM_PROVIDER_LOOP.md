# FIX: Custom Provider Empty Response Loop

## Problem
The agent was stuck in a loop returning the same generic message:
> "I've finished working on that. Let me know if you need anything else or want to see the results!"

## Root Cause
1. Custom provider at `http://localhost:20128/v1` was returning empty responses
2. The `stripThink()` function was removing all content
3. When `finalContent` was null, it defaulted to the generic message
4. No debug logging to identify the issue

## Solution Applied

### 1. Improved Fallback Message (loop.ts:516)
**Before:**
```typescript
const responseText = finalContent || "I've finished working on that. Let me know if you need anything else or want to see the results!";
```

**After:**
```typescript
let responseText = finalContent;
if (!responseText) {
    if (toolsUsed.length > 0) {
        responseText = `I've completed the requested actions using ${toolsUsed.length} tool(s): ${toolsUsed.join(', ')}`;
    } else {
        responseText = "I received your message but didn't generate a response. This might be a provider issue. Please try again or check your LLM configuration.";
    }
}
```

**Result:** Now shows informative message when provider fails, not generic "finished" message.

---

### 2. Added Debug Logging (loop.ts:711-717)
```typescript
// Debug logging for empty responses
if (!finalContent && response.content) {
    console.warn(`[loop] ⚠️ Response content was stripped to null. Original: ${response.content.substring(0, 200)}`);
} else if (!finalContent && !response.content) {
    console.warn(`[loop] ⚠️ LLM returned empty response. Provider may be misconfigured.`);
}
```

**Result:** You'll now see warnings in console when provider returns empty responses.

---

### 3. Added Provider Debug Logging (openai.ts:46-55)
```typescript
// Debug logging for custom providers
if (this.apiBase && this.apiBase.includes('localhost')) {
    console.log(`[OpenAI/Custom] Response from ${this.apiBase}:`, {
        choices: response.choices?.length || 0,
        content: response.choices?.[0]?.message?.content?.substring(0, 100) || 'null',
        finishReason: response.choices?.[0]?.finish_reason,
        hasToolCalls: !!response.choices?.[0]?.message?.tool_calls?.length
    });
}
```

**Result:** You'll see exactly what your custom provider is returning.

---

## How to Test

1. **Restart NexusClaw:**
```bash
# Stop any running instances
pkill -f "node.*nexusclaw"

# Start fresh
npm start
# or
node dist/cli.js
```

2. **Send a test message:**
```
User: "Hello, who are you?"
```

3. **Check console output:**
You should now see:
```
[OpenAI/Custom] Response from http://localhost:20128/v1: {
  choices: 1,
  content: 'I am Claude...',
  finishReason: 'stop',
  hasToolCalls: false
}
```

If you see:
```
[loop] ⚠️ LLM returned empty response. Provider may be misconfigured.
```

Then your custom provider at `http://localhost:20128/v1` is not returning valid responses.

---

## Troubleshooting Your Custom Provider

### Check if provider is running:
```bash
curl http://localhost:20128/v1/models
```

### Test the endpoint directly:
```bash
curl -X POST http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-6b7f2e8e617282d1-c91p5l-005905ab" \
  -d '{
    "model": "kr/claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

**Expected response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ]
}
```

### Common Issues:

1. **Provider not running** - Start your local proxy/gateway
2. **Wrong API key** - Check `sk-6b7f2e8e617282d1-c91p5l-005905ab` is correct
3. **Wrong model name** - Verify `kr/claude-sonnet-4.5` is valid
4. **Port conflict** - Check if port 20128 is actually listening
5. **CORS issues** - Provider might be blocking requests

---

## Files Modified

1. `/d/nexusclaw/src/agent/loop.ts`
   - Line 516-525: Improved fallback message handling
   - Line 711-717: Added debug logging for empty responses

2. `/d/nexusclaw/src/providers/openai.ts`
   - Line 46-55: Added debug logging for custom providers

---

## Next Steps

1. ✅ Changes applied
2. ⏳ Restart NexusClaw to apply changes
3. ⏳ Test with a simple message
4. ⏳ Check console logs to see what provider returns
5. ⏳ Fix custom provider if it's returning empty responses

---

**Status:** ✅ FIX APPLIED - RESTART REQUIRED

The generic loop message is now fixed. You'll get informative error messages instead of the confusing "I've finished working on that" message.
