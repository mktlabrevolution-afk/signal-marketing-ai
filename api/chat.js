module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY no configurada. Ir a Vercel → Settings → Environment Variables.'
    });
  }

  // Translate Anthropic payload → Gemini format
  const { max_tokens, system, messages } = req.body;

  // Build Gemini contents array
  const contents = [];
  if (messages) {
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  const geminiBody = {
    contents,
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    generationConfig: {
      maxOutputTokens: max_tokens || 2000,
      temperature: 0.7,
    },
  };

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[Signal] Gemini error:', upstream.status, errText);
      return res.status(upstream.status).end(errText);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            // Emit in Anthropic streaming format so the frontend works unchanged
            const event = JSON.stringify({
              type: 'content_block_delta',
              delta: { type: 'text_delta', text }
            });
            res.write(`data: ${event}\n\n`);
          }
          // Detect finish
          const finishReason = parsed.candidates?.[0]?.finishReason;
          if (finishReason && finishReason !== 'STOP') {
            console.warn('[Signal] Gemini finish reason:', finishReason);
          }
        } catch (_) {}
      }
    }

    res.end();
  } catch (err) {
    console.error('[Signal] Proxy error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};
