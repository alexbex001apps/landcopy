
const https = require('https');

const countryData = {
  colombia:  { name:'Colombia',      pay:'pago contra entrega' },
  costarica: { name:'Costa Rica',    pay:'pago contra entrega' },
  mexico:    { name:'México',        pay:'pago contra entrega' },
  venezuela: { name:'Venezuela',     pay:'pago contra entrega' },
  ecuador:   { name:'Ecuador',       pay:'pago contra entrega' },
  general:   { name:'Latinoamérica', pay:'pago contra entrega' },
};

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
        catch(e) { reject(new Error('Invalid JSON from OpenAI')); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, problem, benefit, price, priceOld, clients, chars, category, country, tone, image, imageMime, outputs } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const co = countryData[country] || countryData.general;
  const hasImage = !!image;
  const hasChars = !!(chars && chars.trim());
  const model = hasImage ? 'gpt-4o' : 'gpt-4o-mini';

  const prompt = `Eres experto en copywriting para ecommerce latinoamericano. Regla: BENEFICIO mayor que CARACTERÍSTICA.

Producto: ${name}
Problema: ${problem}
Beneficio: ${benefit}
Precio: ${price}${priceOld ? ` (antes ${priceOld})` : ''}${clients ? `\nClientes: ${clients}` : ''}${hasChars ? `\nCaracteristicas: ${chars}` : ''}
Pais: ${co.name} | Tono: ${tone} | Pago: ${co.pay}
${hasImage ? 'ANALIZA LA IMAGEN adjunta e incorpora lo que ves al copy.' : ''}

Responde SOLO con JSON valido sin markdown ni texto adicional:
{"landing_trust_bar":"4 badges de confianza con emojis","landing_hero":"titular hero atacando el dolor","landing_problem":"storytelling del problema con lista de sintomas con emoji X","landing_solution":"solucion con storytelling empático","landing_benefits":"6 beneficios emocionales con emoji check","landing_testimonials":"3 testimonios con 5 estrellas nombre y ciudad","landing_uses":"ideal para diferentes perfiles con emoji check","landing_whats_included":"que incluye el pedido con emoji check","landing_faq":"6 preguntas frecuentes respondidas","landing_cta":"CTA final urgente con precio y garantia","wa_cold":"WhatsApp contacto frio maximo 5 lineas","wa_followup":"WhatsApp seguimiento con urgencia","wa_close":"WhatsApp cierre con escasez y garantia","social_post":"post Instagram con emojis y CTA","social_tiktok":"guion TikTok 30 segundos","social_hashtags":"20 hashtags en espanol","meta_campaign":"campaña Meta Ads completa","meta_ads":"5 anuncios Meta con titular descripcion y CTA","ad_hooks":"10 hooks de apertura para video","image_prompts":"5 prompts en ingles para imagenes IA","image_overlay":"10 textos cortos maximo 5 palabras para videos","ugc_ideas":"5 ideas de videos UGC","extra_desc":"descripcion SEO 120 palabras","extra_seo":"15 keywords SEO"${hasChars ? `,"benefit_transform":[{"char":"caracteristica original","benefit":"beneficio emocional"}]` : ''}${hasImage ? `,"vision_analysis":"descripcion de lo que ves en la imagen","vision_summary":"resumen en 1 oracion del producto segun imagen"` : ''}}`;

  try {
    const messages = hasImage ? [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${image}`, detail: 'low' } },
        { type: 'text', text: prompt }
      ]
    }] : [{ role: 'user', content: prompt }];

    const result = await callOpenAI(process.env.OPENAI_API_KEY, {
      model,
      max_tokens: 3000,
      temperature: 0.75,
      messages
    });

    if (result.status !== 200) {
      return res.status(500).json({ error: result.body.error?.message || 'Error OpenAI' });
    }

    const raw = result.body.choices[0].message.content.trim();
    const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message || 'Error al generar' });
  }
};
