export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Falta configurar OPENAI_API_KEY en Vercel." });
    }

    const body = req.body || {};

    const countryData = {
      colombia: { code: "COL", currency: "COP", modismo: "colombiano" },
      costarica: { code: "CRC", currency: "CRC", modismo: "costarricense" },
      mexico: { code: "MEX", currency: "MXN", modismo: "mexicano" },
      venezuela: { code: "VEN", currency: "USD", modismo: "venezolano" },
      ecuador: { code: "ECU", currency: "USD", modismo: "ecuatoriano" },
      general: { code: "LAT", currency: "USD", modismo: "latinoamericano neutro" }
    };

    const toneMap = {
      urgente: "urgente, directo y orientado a la acción",
      emocional: "emocional, empático y cercano",
      racional: "racional, claro y basado en beneficios concretos",
      casual: "casual, natural y conversacional",
      confianza: "confiable, seguro y profesional",
      premium: "premium, elegante y aspiracional"
    };

    const country = countryData[body.country] || countryData.general;
    const tone = toneMap[body.tone] || toneMap.urgente;

    const prompt = `
Eres un copywriter senior especializado en ecommerce, Meta Ads, WhatsApp Business y landing pages para Latinoamérica.

Crea contenido comercial de alta conversión con lenguaje humano, natural y listo para copiar.

DATOS DEL PRODUCTO:
Producto: ${body.name}
Problema que resuelve: ${body.problem || "Inferir según el producto"}
Beneficio principal: ${body.benefit || "Inferir según el producto"}
Precio: ${body.price ? body.price + " " + country.currency : "No especificado"}
Categoría: ${body.category || "General"}
País: ${body.country || "general"} / estilo ${country.modismo}
Tono: ${tone}

Responde SOLO con JSON válido. No uses markdown. No uses backticks. Usa exactamente estas claves:

{
  "landing_hero": "",
  "landing_problem": "",
  "landing_solution": "",
  "landing_testimonials": "",
  "landing_cta": "",
  "wa_cold": "",
  "wa_followup": "",
  "wa_close": "",
  "social_post": "",
  "social_tiktok": "",
  "social_hashtags": "",
  "extra_email": "",
  "extra_objeciones": "",
  "extra_desc": "",
  "extra_seo": "",
  "meta_campaign": "",
  "meta_ads": "",
  "ad_hooks": "",
  "image_prompts": "",
  "image_overlay": "",
  "ugc_ideas": ""
}

Instrucciones:
- landing_hero: titular poderoso, subtítulo corto y microcopy para botón.
- landing_problem: 2 o 3 párrafos cortos conectando con el dolor del cliente.
- landing_solution: 5 beneficios concretos con emojis.
- landing_testimonials: 3 testimonios sugeridos, marcados como ejemplos, con nombre y ciudad.
- landing_cta: cierre con precio, garantía, escasez moderada y llamado a comprar.
- wa_cold: primer mensaje de WhatsApp, máximo 5 líneas.
- wa_followup: seguimiento si no respondió, máximo 4 líneas.
- wa_close: cierre de venta, máximo 6 líneas.
- social_post: copy para Facebook/Instagram con gancho, dolor, solución y CTA.
- social_tiktok: guion de video de 30 segundos por bloques de tiempo.
- social_hashtags: 20 hashtags relevantes.
- extra_email: asunto y cuerpo completo.
- extra_objeciones: 5 objeciones frecuentes con respuesta.
- extra_desc: descripción de tienda online de 150 a 200 palabras.
- extra_seo: 15 palabras clave SEO.
- meta_campaign: estructura completa de campaña para Meta Ads: objetivo, audiencia, intereses, presupuesto sugerido, ubicación y estrategia.
- meta_ads: 5 anuncios completos para Facebook/Instagram con texto principal, titular y descripción.
- ad_hooks: 15 ganchos cortos para anuncios.
- image_prompts: 8 prompts detallados para generar imágenes publicitarias del producto.
- image_overlay: 10 textos cortos para poner encima de imágenes publicitarias.
- ugc_ideas: 5 ideas de videos UGC con escena, frase inicial, demostración y cierre.

Reglas:
- No prometas resultados imposibles.
- No inventes curas médicas.
- No afirmes testimonios reales; usa “testimonio sugerido” o “ejemplo”.
- Evita lenguaje engañoso.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Error de OpenAI"
      });
    }

    const text = data.choices?.[0]?.message?.content || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : clean);

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({ error: error.message || "Error interno" });
  }
}
