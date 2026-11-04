---
name: diffbot-ask
description: "Ask Diffbot LLM a question using the Diffbot Ask API, optionally constrained to a JSON Schema for structured output. Use when the user wants to query Diffbot's LLM directly. Triggers on: ask diffbot, diffbot llm, diffbot ask, chat with diffbot, structured answer."
---

# Diffbot Ask

Call Diffbot LLM via `diffbot_ask` (TypeScript SDK). Do not use the Python CLI.

## Tool

| Param | Description |
|-------|-------------|
| `prompt` | One-shot user prompt |
| `messages` | Chat messages `[{ role, content }]` (alternative to `prompt`) |
| `schema` | Optional JSON Schema object. When set, the answer is returned as JSON constrained to that shape by a decoding grammar |

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

Structured output:

```
diffbot_ask({
  prompt: "What's the capital of France?",
  schema: {
    type: "object",
    properties: { country: { type: "string" }, capital: { type: "string" } },
    required: ["country", "capital"],
  },
})
```

Relay the returned answer text to the user. With `schema`, the result is the parsed JSON
object; the model is held to the schema during decoding, so it parses reliably even
though the answer is retrieved live.
