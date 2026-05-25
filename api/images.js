export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, destino } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  const sizeMap = {
    instagram: { width: 1024, height: 1792 },
    facebook:  { width: 1024, height: 1024 },
    tiktok:    { width: 1024, height: 1792 },
    landing:   { width: 1792, height: 1024 },
    whatsapp:  { width: 1024, height: 1024 }
  };

  const size = sizeMap[destino] || { width: 1024, height: 1024 };
  const apiKey = process.env.REPLICATE_API_TOKEN;

  try {
    const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          width: size.width,
          height: size.height,
          num_outputs: 1,
          output_format: 'webp'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) return res.status(500).json({ error: data.detail || 'Error Replicate' });

    const imageUrl = data.output?.[0];
    if (!imageUrl) return res.status(500).json({ error: 'No se generó imagen' });

    return res.status(200).json({ url: imageUrl });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
