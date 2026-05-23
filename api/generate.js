
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const countryData = {
  colombia:   { name:'Colombia',    currency:'COP', symbol:'$',  slang:'parcero/a, chimba, bacano', pay:'pago contra entrega', ship:'Colombia' },
  costarica:  { name:'Costa Rica',  currency:'CRC', symbol:'₡',  slang:'mae, tuanis, pura vida',    pay:'pago contra entrega', ship:'Costa Rica' },
  mexico:     { name:'México',      currency:'MXN', symbol:'$',  slang:'wey, chido, órale',         pay:'pago contra entrega', ship:'México' },
  venezuela:  { name:'Venezuela',   currency:'USD', symbol:'$',  slang:'chamo/a, chévere, pana',    pay:'pago contra entrega', ship:'Venezuela' },
  ecuador:    { name:'Ecuador',     currency:'USD', symbol:'$',  slang:'causa, bacán, ñaño',        pay:'pago contra entrega', ship:'Ecuador' },
  general:    { name:'Latinoamérica', currency:'USD', symbol:'$', slang:'',                         pay:'pago contra entrega', ship:'tu país' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, problem, benefit, price, priceOld, clients, chars,
    category, country, tone, image, imageMime, outputs
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Nombre del producto requerido' });

  const co = countryData[country] || countryData.general;
  const hasImage = !!image;
  const hasChars = !!(chars && chars.trim());
  const model = hasImage ? 'gpt-4o' : 'gpt-4o-mini';

  // ── BUILD PROMPT ─────────────────────────────
  const systemPrompt = `Eres LandCopy, un experto en copywriting persuasivo para ecommerce latinoamericano. 
Conoces a fondo la psicología de compra: emoción primero, lógica después.
Regla de oro: BENEFICIO > CARACTERÍSTICA. Nunca hables solo de especificaciones — habla de lo que el cliente GANA, EVITA o MEJORA.
Orden psicológico de landing: Atención → Problema → Solución → Beneficios → Testimonios → FAQ → Confianza.
Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones, sin texto fuera del JSON.`;

  const charsSection = hasChars ? `\n\nCARACTERÍSTICAS DEL PRODUCTO (convierte cada una en beneficio emocional):\n${chars}` : '';
  const priceSection = priceOld ? `Precio oferta: ${price} (antes: ${priceOld})` : `Precio: ${price}`;
  const clientsSection = clients ? `Clientes actuales: ${clients}` : '';

  const userPromptText = `Genera copy de marketing para este producto en ${co.name}:

PRODUCTO: ${name}
PROBLEMA QUE RESUELVE: ${problem}
BENEFICIO PRINCIPAL: ${benefit}
${priceSection}
${clientsSection}
CATEGORÍA: ${category}
TONO: ${tone}
PAÍS: ${co.name} — jerga local: ${co.slang || 'neutral'}
MÉTODO DE PAGO: ${co.pay}${charsSection}${hasImage ? '\n\nANALIZA LA IMAGEN DEL PRODUCTO adjunta y extrae: tipo de producto, apariencia visual, colores, presentación, percepción. Usa esa información para hacer el copy más visual y específico.' : ''}

Genera el siguiente JSON con TODOS estos campos (no omitas ninguno):
{
  "landing_hero": "Titular hero — fórmula: ¿Todavía sufres de [problema]? [Nombre] — [beneficio en minutos]",
  "landing_problem": "Sección problema con storytelling — empieza con empatía, lista de síntomas con ❌, estadística de identificación",
  "landing_solution": "Solución con storytelling — Sabemos lo frustrante que es... Por eso creamos... Ahora puedes...",
  "landing_benefits": "6 beneficios reales en formato ✅ — beneficios emocionales NO características técnicas",
  "landing_testimonials": "3 testimonios completos con ⭐⭐⭐⭐⭐, nombre, ciudad, historia (problema→experiencia→resultado)",
  "landing_uses": "Sección ideal para — distintos perfiles y escenarios de uso con ✅",
  "landing_whats_included": "¿Qué incluye? — lista con ✅ de todo lo que viene en el pedido",
  "landing_faq": "6 preguntas frecuentes respondidas — seguridad, uso, resultados, garantía, pago, envío",
  "landing_cta": "CTA final urgente con precio, descuento, método de pago y garantía",
  "landing_trust_bar": "Top bar de confianza — 4 badges: envío, clientes, pago, garantía",
  "wa_cold": "WhatsApp primer contacto frío — máximo 5 líneas, empático, sin vender directo",
  "wa_followup": "WhatsApp seguimiento — crea urgencia, responde objeción de precio",
  "wa_close": "WhatsApp cierre de venta — escasez, garantía, instrucción de compra",
  "social_post": "Post Instagram/Facebook — gancho + historia + CTA + emojis",
  "social_tiktok": "Guión TikTok 30 segundos — gancho 3 seg + problema + solución + CTA",
  "social_hashtags": "20 hashtags relevantes en español para ${co.name}",
  "meta_campaign": "Campaña Meta Ads completa — objetivo, audiencia, presupuesto sugerido, creatividades",
  "meta_ads": "5 anuncios Meta diferentes — cada uno con titular + descripción + CTA",
  "ad_hooks": "10 hooks de apertura para anuncios de video — primeros 3 segundos",
  "image_prompts": "5 prompts en inglés para generar imágenes del producto con IA",
  "image_overlay": "10 textos cortos (máx 5 palabras) para superponer en imágenes del producto",
  "ugc_ideas": "5 ideas de videos UGC para el producto — guión breve de cada uno",
  "extra_desc": "Descripción de tienda Shopify/web — SEO optimizada, 150 palabras",
  "extra_seo": "15 keywords SEO en español para ${co.name}"${hasChars ? `,
  "benefit_transform": [{"char": "característica original", "benefit": "beneficio emocional"}]` : ''}${hasImage ? `,
  "vision_analysis": "Descripción detallada de lo que ves en la imagen del producto — tipo, apariencia, colores, presentación, percepción de marca",
  "vision_summary": "Resumen en 1 oración de lo más relevante visual del producto para el copy"` : ''}
}`;

  try {
    // Build messages array — with or without image
    let messages;
    if (hasImage) {
      messages = [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${imageMime};base64,${image}`, detail: 'low' } },
          { type: 'text', text: userPromptText }
        ]
      }];
    } else {
      messages = [{ role: 'user', content: userPromptText }];
    }

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4000,
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });

    const raw = completion.choices[0].message.content.trim();
    // Clean potential markdown fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch (err) {
    console.error('LandCopy generate error:', err);
    res.status(500).json({ error: err.message || 'Error al generar contenido' });
  }
};
