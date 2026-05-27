export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, destino, image } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  const sizeMap = {
    instagram: '1024x1792',
    facebook:  '1024x1024',
    tiktok:    '1024x1792',
    landing:   '1792x1024',
    whatsapp:  '1024x1024'
  };
  const size = sizeMap[destino] || '1024x1024';
  const apiKey = process.env.OPENAI_API_KEY;

  try {
    let base64;

    if (image) {
      const imageBuffer = Buffer.from(image.split(',')[1], 'base64');
      const { FormData, Blob } = globalThis;
      const form = new FormData();
      form.append('model', 'gpt-image-2');
      form.append('prompt', `Reproduce the exact product shown in the reference image. Place it in this scene: ${prompt}. Keep the product identical — same colors, same shape, same design. Do not change the product.`);
      form.append('n', '1');
      form.append('size', size);
      form.append('image[]', new Blob([imageBuffer], { type: 'image/png' }), 'product.png');

      const editResp = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: form
      });

      const editData = await editResp.json();
      if (!editResp.ok) return res.status(500).json({ error: editData.error?.message || 'Error edición' });
      base64 = editData.data?.[0]?.b64_json;

    } else {
      const genResp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt: prompt,
          n: 1,
          size: size
        })
      });

      const genData = await genResp.json();
      if (!genResp.ok) return res.status(500).json({ error: genData.error?.message || 'Error generación' });
      base64 = genData.data?.[0]?.b64_json;
    }

    if (!base64) return res.status(500).json({ error: 'No se generó imagen' });
    return res.status(200).json({ url: `data:image/png;base64,${base64}` });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
