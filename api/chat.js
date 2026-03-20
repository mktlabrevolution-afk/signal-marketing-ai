// Signal — Gemini Proxy
const MODEL = 'gemini-2.5-flash';

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

  const { max_tokens, system, messages } = req.body;

  const contents = (messages || []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const geminiBody = {
    contents,
    ...(system && { systemInstruction: { parts: [{ text: system }] } }),
    generationConfig: {
      maxOutputTokens: Math.min(max_tokens || 2000, 3000), // cap en 3000 para no exceder timeout
      temperature: 0.7,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error(`[Signal] Gemini error ${upstream.status}:`, errText);
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
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const event = JSON.stringify({
              type: 'content_block_delta',
              delta: { type: 'text_delta', text }
            });
            res.write(`data: ${event}\n\n`);
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
