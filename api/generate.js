
const countryData = {
  colombia:  { name:'Colombia',      pay:'pago contra entrega' },
  costarica: { name:'Costa Rica',    pay:'pago contra entrega' },
  mexico:    { name:'México',        pay:'pago contra entrega' },
  venezuela: { name:'Venezuela',     pay:'pago contra entrega' },
  ecuador:   { name:'Ecuador',       pay:'pago contra entrega' },
  general:   { name:'Latinoamérica', pay:'pago contra entrega' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, problem, benefit, price, priceOld, clients, chars, category, country, tone, image, imageMime, outputs } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const co = countryData[country] || countryData.general;
  const hasImage = !!image;
  const hasChars = !!(chars && chars.trim());
  const model = hasImage ? 'gpt-4o' : 'gpt-4o-mini';

  const prompt = `Eres experto en copywriting para ecommerce latinoamericano. Regla: BENEFICIO > CARACTERÍSTICA.

Producto: ${name}
Problema: ${problem}
Beneficio: ${benefit}
Precio: ${price}${priceOld ? ` (antes ${priceOld})` : ''}${clients ? `\nClientes: ${clients}` : ''}${hasChars ? `\nCaracterísticas: ${chars}` : ''}
País: ${co.name} | Tono: ${tone} | Pago: ${co.pay}
${hasImage ? 'ANALIZA LA IMAGEN adjunta e incorpora lo que ves al copy.' : ''}

Responde SOLO con JSON válido sin markdown:
{"landing_trust_bar":"badges de confianza con emojis","landing_hero":"titular hero atacando el dolor","landing_problem":"storytelling del problema con lista ❌","landing_solution":"solución con storytelling","landing_benefits":"6 beneficios con ✅","landing_testimonials":"3 testimonios ⭐⭐⭐⭐⭐ con nombre y ciudad","landing_uses":"ideal para: perfiles con ✅","landing_whats_included":"qué incluye el pedido con ✅","landing_faq":"6 preguntas frecuentes respondidas","landing_cta":"CTA final urgente","wa_cold":"WhatsApp contacto frío 5 líneas","wa_followup":"WhatsApp seguimiento","wa_close":"WhatsApp cierre","social_post":"post Instagram con emojis","social_tiktok":"guión TikTok 30seg","social_hashtags":"20 hashtags","meta_campaign":"campaña Meta Ads","meta_ads":"5 anuncios Meta","ad_hooks":"10 hooks de video","image_prompts":"5 prompts en inglés para imágenes","image_overlay":"10 textos cortos para videos","ugc_ideas":"5 ideas UGC","extra_desc":"descripción SEO 120 palabras","extra_seo":"15 keywords SEO"${hasChars ? `,"benefit_transform":[{"char":"característica","benefit":"beneficio emocional"}]` : ''}${hasImage ? `,"vision_analysis":"descripción de la imagen del producto","vision_summary":"resumen en 1 oración"` : ''}}`;

  try {
    const body = {
      model,
      max_tokens: 3000,
      temperature: 0.75,
      messages: hasImage ? [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${imageMime};base64,${image}`, detail: 'low' } },
          { type: 'text', text: prompt }
        ]
      }] : [{ role: 'user', content: prompt }]
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Error OpenAI' });
    }

    const raw = data.choices[0].message.content.trim();
    const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message || 'Error al generar' });
  }
};
