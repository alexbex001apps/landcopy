export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, destino } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  const sizeMap = {
    instagram: '1024x1792',
    facebook:  '1024x1024',
    tiktok:    '1024x1792',
    landing:   '1792x1024',
    whatsapp:  '1024x1024'
  };
  const size = sizeMap[destino] || '1024x1024';
  const apiKey = process.env.CLAVE_API_DE_OPENAI;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt: prompt,
        n: 1,
        size: size,
        response_format: 'b64_json'
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Error GPT Image 2' });
    const base64 = data.data?.[0]?.b64_json;
    if (!base64) return res.status(500).json({ error: 'No se generó imagen' });
    return res.status(200).json({ url: `data:image/png;base64,${base64}` });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
