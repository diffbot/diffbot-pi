---
name: diffbot-ask
description: "Ask Diffbot LLM a question using the Diffbot Ask API. Use when the user wants to query Diffbot's LLM directly. Triggers on: ask diffbot, diffbot llm, diffbot ask, chat with diffbot."
---

# Diffbot Ask

Call Diffbot LLM via `diffbot_ask` (TypeScript SDK). Do not use the Python CLI.

## Tool

| Param | Description |
|-------|-------------|
| `prompt` | One-shot user prompt |
| `messages` | Chat messages `[{ role, content }]` (alternative to `prompt`) |

Provide either `prompt` or `messages`.

## Workflow

```
diffbot_ask({ prompt: "What's the capital of France?" })

diffbot_ask({
  messages: [
    { role: "system", content: "Be concise." },
    { role: "user", content: "Summarize Diffbot Extract in one sentence." },
  ],
})
```

Relay the returned answer text to the user.
