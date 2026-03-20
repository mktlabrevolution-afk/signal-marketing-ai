// MktLab AI Suite — Gemini Proxy (non-streaming, JSON response)
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

  const { system, messages } = req.body;

  const contents = (messages || []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const geminiBody = {
    contents,
    ...(system && { systemInstruction: { parts: [{ text: system }] } }),
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  };

  // Use non-streaming endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('[MktLab] Gemini error:', upstream.status, JSON.stringify(data));
      return res.status(upstream.status).json({ error: data.error?.message || 'Gemini error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

    // Return in Anthropic-compatible format (what the frontend expects)
    return res.status(200).json({
      content: [{ type: 'text', text }],
      usage: { output_tokens: outputTokens },
      model: MODEL,
    });

  } catch (err) {
    console.error('[MktLab] Proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
