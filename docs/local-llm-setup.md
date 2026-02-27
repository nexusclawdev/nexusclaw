# 🐾 Local LLM Setup Guide

This guide shows you how to integrate local LLM models (via Ollama) with NexusClaw, allowing you to run the agent completely locally without API costs.

## Prerequisites

1. **Install Ollama**
   ```bash
   # Windows: Download from https://ollama.ai
   # Linux/Mac:
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Pull Your Preferred Model**
   ```bash
   # Example: Llama 3
   ollama pull llama3

   # Or Mistral
   ollama pull mistral

   # Or CodeLlama
   ollama pull codellama
   ```

3. **Start Ollama Server**
   ```bash
   ollama serve
   ```

## Quick Start

### 1. Configure Local LLM in NexusClaw

Edit your `~/.nexusclaw/config.json`:

```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434",
      "model": "llama3"
    }
  }
}
```

### 2. Test Connection

```bash
nexusclaw status
```

Expected output:
```
🐾 NexusClaw Status

────────────────────────────────────────────────────────────
Ollama:   ✅ Connected
Model:    llama3
Base URL: http://localhost:11434
────────────────────────────────────────────────────────────
```

### 3. Start Using Local LLM

```bash
nexusclaw agent
```

The agent will now use your local Ollama model instead of cloud APIs!

## Supported Models

| Model | Size | Best For |
|-------|------|----------|
| llama3 | 7B-70B | General purpose, chat |
| mistral | 7B | Fast, efficient |
| codellama | 7B-34B | Code generation |
| mixtral | 8x7B | Advanced reasoning |

## Configuration Options

```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434",
      "model": "llama3",
      "temperature": 0.7,
      "maxTokens": 4096
    }
  }
}
```

## Troubleshooting

### Ollama Not Running
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### Model Not Found
```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3
```

### Connection Refused
- Ensure Ollama is running on port 11434
- Check firewall settings
- Verify baseUrl in config.json

## Performance Tips

1. **Use Smaller Models** - 7B models are faster and use less RAM
2. **GPU Acceleration** - Ollama automatically uses GPU if available
3. **Adjust Context Length** - Reduce maxTokens for faster responses
4. **Model Quantization** - Use quantized models (Q4, Q5) for better performance

## Benefits of Local LLM

✅ **No API Costs** - Run completely free
✅ **Privacy** - Data never leaves your machine
✅ **Offline** - Works without internet
✅ **Customizable** - Use any Ollama-compatible model
✅ **Fast** - No network latency

## Next Steps

- Try different models to find the best fit
- Adjust temperature and maxTokens for your use case
- Combine with cloud providers for fallback
- Use local LLM for development, cloud for production

---

**Note:** Local LLMs require significant RAM (8GB+ recommended) and work best with a GPU.
