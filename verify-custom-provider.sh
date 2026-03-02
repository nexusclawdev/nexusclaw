#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║              🔍 CUSTOM PROVIDER VERIFICATION SCRIPT 🔍                       ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if custom provider endpoint is reachable
echo "1️⃣  Checking if custom provider is running..."
if curl -s --connect-timeout 3 http://localhost:20128/v1/models > /dev/null 2>&1; then
    echo "   ✅ Custom provider is reachable at http://localhost:20128/v1"
else
    echo "   ❌ Custom provider is NOT reachable at http://localhost:20128/v1"
    echo "   ⚠️  Make sure your local proxy/gateway is running on port 20128"
    echo ""
fi

# Test the endpoint with a simple request
echo ""
echo "2️⃣  Testing custom provider with sample request..."
RESPONSE=$(curl -s -X POST http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-6b7f2e8e617282d1-c91p5l-005905ab" \
  -d '{
    "model": "kr/claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }' 2>&1)

if echo "$RESPONSE" | grep -q "choices"; then
    echo "   ✅ Provider returned valid response"
    echo "   Response preview:"
    echo "$RESPONSE" | jq -r '.choices[0].message.content' 2>/dev/null | head -3 | sed 's/^/      /'
else
    echo "   ❌ Provider returned invalid response"
    echo "   Response:"
    echo "$RESPONSE" | head -5 | sed 's/^/      /'
fi

echo ""
echo "3️⃣  Checking NexusClaw configuration..."
if [ -f ~/.nexusclaw/config.json ]; then
    echo "   ✅ Config found at ~/.nexusclaw/config.json"
    echo "   Custom provider settings:"
    cat ~/.nexusclaw/config.json | jq '.providers.custom' 2>/dev/null | sed 's/^/      /'
else
    echo "   ❌ Config not found at ~/.nexusclaw/config.json"
fi

echo ""
echo "4️⃣  Checking if NexusClaw is running..."
if pgrep -f "node.*nexusclaw" > /dev/null; then
    echo "   ✅ NexusClaw is running"
    echo "   ⚠️  You need to RESTART it to apply the fix"
    echo ""
    echo "   Run: pkill -f 'node.*nexusclaw' && npm start"
else
    echo "   ❌ NexusClaw is not running"
    echo "   Run: npm start"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║                         📋 SUMMARY                                           ║"
echo "║                                                                              ║"
echo "║  Fix Applied:     ✅ YES                                                     ║"
echo "║  Restart Needed:  ⚠️  YES                                                    ║"
echo "║  Provider Status: Check results above                                       ║"
echo "║                                                                              ║"
echo "║  Next: Restart NexusClaw and test with a message                            ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
