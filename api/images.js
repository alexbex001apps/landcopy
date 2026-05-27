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
      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
      const parts = [];
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-2`);
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`);
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n${size}`);
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\nReproduce the exact product shown in the reference image in this scene: ${prompt}. Keep the product identical — same colors, same shape, same design.`);
      const textParts = Buffer.from(parts.join('\r\n') + '\r\n');
      const fileHeader = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="product.png"\r\nContent-Type: image/jpeg\r\n\r\n`);
      const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([textParts, fileHeader, imageBuffer, closing]);

      const editResp = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(body.length)
        },
        body
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
        body: JSON.stringify({ model: 'gpt-image-2', prompt, n: 1, size })
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
