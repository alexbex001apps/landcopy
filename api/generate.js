
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const countryData = {
  colombia:  { name:'Colombia',     currency:'COP', symbol:'$',  pay:'pago contra entrega', ship:'Colombia' },
  costarica: { name:'Costa Rica',   currency:'CRC', symbol:'₡',  pay:'pago contra entrega', ship:'Costa Rica' },
  mexico:    { name:'México',       currency:'MXN', symbol:'$',  pay:'pago contra entrega', ship:'México' },
  venezuela: { name:'Venezuela',    currency:'USD', symbol:'$',  pay:'pago contra entrega', ship:'Venezuela' },
  ecuador:   { name:'Ecuador',      currency:'USD', symbol:'$',  pay:'pago contra entrega', ship:'Ecuador' },
  general:   { name:'Latinoamérica',currency:'USD', symbol:'$',  pay:'pago contra entrega', ship:'tu país' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, problem, benefit, price, priceOld, clients, chars, category, country, tone, image, imageMime, outputs } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre del producto requerido' });

  const co = countryData[country] || countryData.general;
  const hasImage = !!image;
  const hasChars = !!(chars && chars.trim());
  const model = hasImage ? 'gpt-4o' : 'gpt-4o-mini';

  const charsText = hasChars ? `\nCaracterísticas: ${chars}` : '';
  const priceText = priceOld ? `Precio: ${price} (antes ${priceOld})` : `Precio: ${price}`;
  const clientsText = clients ? `\nClientes: ${clients}` : '';

  const prompt = `Eres un experto en copywriting para ecommerce latinoamericano. Regla clave: BENEFICIO > CARACTERÍSTICA. Habla de lo que el cliente GANA, no de especificaciones.

Producto: ${name}
Problema: ${problem}
Beneficio: ${benefit}
${priceText}${clientsText}${charsText}
País: ${co.name} | Tono: ${tone} | Pago: ${co.pay}
${hasImage ? '\nANALIZA LA IMAGEN adjunta: describe qué ves (tipo de producto, colores, presentación) e incorpóralo al copy.' : ''}

Responde SOLO con este JSON sin markdown ni explicaciones:
{
  "landing_trust_bar": "4 badges de confianza: envío, clientes, pago, garantía con emojis",
  "landing_hero": "Titular hero atacando el dolor del cliente. Fórmula: ¿Todavía sufres de [problema]?",
  "landing_problem": "Storytelling del problema con empatía + lista de síntomas con ❌",
  "landing_solution": "Solución con storytelling: Sabemos lo frustrante... Por eso creamos... Ahora puedes...",
  "landing_benefits": "6 beneficios emocionales con ✅ — lo que gana, evita o mejora el cliente",
  "landing_testimonials": "3 testimonios ⭐⭐⭐⭐⭐ con nombre, ciudad, historia (problema→resultado)",
  "landing_uses": "Ideal para: distintos perfiles y situaciones de uso con ✅",
  "landing_whats_included": "¿Qué incluye el pedido? Lista con ✅",
  "landing_faq": "6 preguntas frecuentes respondidas: uso, seguridad, resultados, garantía, pago, envío",
  "landing_cta": "CTA final urgente con precio, garantía y método de pago",
  "wa_cold": "WhatsApp primer contacto — máx 5 líneas, empático",
  "wa_followup": "WhatsApp seguimiento — urgencia sin presionar",
  "wa_close": "WhatsApp cierre — escasez + garantía + instrucción de compra",
  "social_post": "Post Instagram con gancho + historia + CTA + emojis",
  "social_tiktok": "Guión TikTok 30 seg: gancho 3seg + problema + solución + CTA",
  "social_hashtags": "20 hashtags en español para ${co.name}",
  "meta_campaign": "Campaña Meta Ads: objetivo, audiencia, creatividades sugeridas",
  "meta_ads": "5 anuncios Meta: titular + descripción + CTA cada uno",
  "ad_hooks": "10 hooks de apertura para video — primeros 3 segundos",
  "image_prompts": "5 prompts en inglés para generar imágenes del producto con IA",
  "image_overlay": "10 textos cortos (máx 5 palabras) para superponer en videos",
  "ugc_ideas": "5 ideas de videos UGC con guión breve",
  "extra_desc": "Descripción SEO para tienda Shopify — 120 palabras",
  "extra_seo": "15 keywords SEO en español"${hasChars ? `,
  "benefit_transform": [{"char": "característica textual", "benefit": "beneficio emocional"}]` : ''}${hasImage ? `,
  "vision_analysis": "Lo que ves en la imagen: tipo, colores, presentación, percepción de marca",
  "vision_summary": "Resumen en 1 oración del producto según la imagen"` : ''}
}`;

  try {
    let messages;
    if (hasImage) {
      messages = [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${image}`, detail: 'low' } },
        { type: 'text', text: prompt }
      ]}];
    } else {
      messages = [{ role: 'user', content: prompt }];
    }

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 3500,
      temperature: 0.75,
      messages
    });

    const raw = completion.choices[0].message.content.trim();
    const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message || 'Error al generar' });
  }
};
