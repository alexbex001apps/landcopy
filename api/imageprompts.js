
import https from 'https';

function callOpenAI(apiKey, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, problem, benefit, category, country } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const prompt = `Eres un director de fotografia y arte publicitario de nivel mundial especializado en ecommerce. Tu tarea es crear 5 prompts ultra detallados y profesionales para generar imagenes con IA (Midjourney/DALL-E/Leonardo) para el producto "${name}".

Producto: ${name}
Problema que resuelve: ${problem}
Beneficio: ${benefit}
Categoria: ${category || 'general'}
Pais: ${country || 'Latinoamerica'}

INSTRUCCIONES CRITICAS:
- Cada prompt debe ser extremadamente detallado y especifico
- Incluir SIEMPRE: tipo de camara, lente, apertura, velocidad de obturacion
- Incluir SIEMPRE: tipo de iluminacion tecnica especifica
- Incluir SIEMPRE: angulo de camara exacto
- Incluir SIEMPRE: emocion dominante y tension narrativa
- Incluir SIEMPRE: movimiento o quietud
- Incluir SIEMPRE: ambiente y decoracion especifica
- Incluir SIEMPRE: proposito comercial de la imagen
- Incluir SIEMPRE: parametros Midjourney al final (--ar, --q 2, --style raw)
- Minimo 80 palabras por prompt
- En ESPAÑOL

Genera exactamente este JSON sin markdown:
{
  "prompt1": "prompt ultra detallado completo aqui",
  "prompt2": "prompt ultra detallado completo aqui",
  "prompt3": "prompt ultra detallado completo aqui",
  "prompt4": "prompt ultra detallado completo aqui",
  "prompt5": "prompt ultra detallado completo aqui"
}`;

  try {
    const result = await callOpenAI(process.env.OPENAI_API_KEY, {
      model: 'gpt-4o-mini',
      max_tokens: 3000,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }]
    });

    if (result.status !== 200) {
      return res.status(500).json({ error: result.body.error?.message || 'Error OpenAI' });
    }

    const raw = result.body.choices[0].message.content.trim();
    const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch(err) {
    console.error('Error imageprompts:', err.message);
    res.status(500).json({ error: err.message || 'Error al generar prompts' });
  }
}
