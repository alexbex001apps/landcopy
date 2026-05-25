import https from 'https';

function callOpenAI(apiKey, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try { resolve({ status: resp.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON invalido de OpenAI')); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const sizeMap = {
  instagram: '1024x1792',
  facebook:  '1024x1024',
  tiktok:    '1024x1792',
  landing:   '1792x1024',
  whatsapp:  '1024x1024'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, destino } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  const size = sizeMap[destino] || '1024x1024';
  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const result = await callOpenAI(apiKey, {
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'standard',
      
    });

    if (result.status !== 200) {
      return res.status(500).json({ error: result.body.error?.message || 'Error DALL-E' });
    }

    const imageUrl = result.body.data[0].url;
    return res.status(200).json({ url: imageUrl });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
