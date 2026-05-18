export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Falta configurar OPENAI_API_KEY en Vercel" });
    }

    const body = req.body || {};

    const producto = body.name || body.nombreProducto || "Producto sin nombre";
    const problema = body.problem || body.problema || "No especificado";
    const beneficio = body.benefit || body.beneficio || "No especificado";
    const precio = body.price || body.precio || "No especificado";
    const categoria = body.category || body.categoria || "General";
    const pais = body.country || body.pais || "Latinoamérica";
    const tono = body.tone || body.tono || "persuasivo, profesional y vendedor";
    const enabledOutputs = body.enabled_outputs || body.enabledOutputs || "landing,whatsapp,social,email,objeciones,meta,images,extras,hooks";

    const prompt = `
Eres un estratega senior de marketing, copywriter de respuesta directa, experto en ecommerce, Meta Ads, WhatsApp Business, landing pages, contenido UGC y ventas digitales.

Tu tarea es crear una campaña completa, profesional, amplia, estratégica y lista para vender.
Debes pensar como un director de marketing de marcas multimillonarias.

La campaña debe:
- generar deseo inmediato
- aumentar percepción de valor
- sonar humana y emocional
- usar neuroventas
- incluir copywriting moderno
- crear urgencia real
- atacar dolores ocultos
- aumentar conversión
- sonar premium y profesional
- evitar textos genéricos
- evitar repetir palabras
- escribir como anuncios ganadores de Meta Ads

La landing debe verse como una página de ventas real.
Los copies deben parecer hechos por un experto senior.
Los WhatsApp deben cerrar ventas rápido.
Las redes sociales deben ser virales y emocionales.

Usa lenguaje natural latinoamericano.
DATOS DEL PRODUCTO:
Producto: ${producto}
Problema que resuelve: ${problema}
Beneficio principal: ${beneficio}
Precio: ${precio}
Categoría: ${categoria}
País objetivo: ${pais}
Tono: ${tono}

RESPONDE SOLO EN JSON VÁLIDO.
No uses markdown.
No uses explicación fuera del JSON.
SECCIONES ACTIVADAS POR EL USUARIO:
${enabledOutputs}
REGLA OBLIGATORIA:
Genera contenido SOLO para las secciones incluidas en SECCIONES ACTIVADAS.

Para cualquier sección NO incluida:
- devuelve "" en las claves correspondientes
- no generes texto
- no inventes contenido
- no rellenes campos automáticamente

Usa exactamente estas claves:

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
  "ugc_ideas": "",
"enabled_outputs": ""
}

INSTRUCCIONES:

landing_hero:
Crea un titular fuerte, subtítulo vendedor y texto de botón. Debe despertar deseo y urgencia.

landing_problem:
Explica el problema del cliente con lenguaje emocional, cercano y realista.

landing_solution:
Presenta la solución con mínimo 7 beneficios claros, enfocados en transformación, comodidad, ahorro, rapidez, confianza y deseo.

landing_testimonials:
Crea 3 testimonios sugeridos. Aclara que son ejemplos sugeridos, no testimonios reales.

landing_cta:
Cierre fuerte con urgencia moderada, confianza, precio, llamado a WhatsApp y razón para comprar hoy.

wa_cold:
Mensaje inicial de WhatsApp para responder a un cliente interesado.

wa_followup:
Mensaje de seguimiento para cliente que no respondió.

wa_close:
Mensaje para cerrar venta con seguridad y naturalidad.

social_post:
Copy largo para Facebook/Instagram con gancho, problema, solución, beneficios, prueba social sugerida y CTA.

social_tiktok:
Guion completo para video TikTok/Reels de 30 segundos con escenas, texto en pantalla y voz.

social_hashtags:
20 hashtags estratégicos.

extra_email:
Email completo con asunto, apertura, cuerpo vendedor y cierre.

extra_objeciones:
Lista de 8 objeciones comunes y respuestas persuasivas.

extra_desc:
Descripción profesional para tienda online, entre 180 y 250 palabras.

extra_seo:
Palabras clave SEO separadas por comas.

meta_campaign:
Estrategia completa para Meta Ads: objetivo, público, intereses, segmentación, presupuesto sugerido, estructura de campaña y consejo de optimización.

meta_ads:
5 anuncios completos para Meta Ads. Cada anuncio debe tener: texto principal, titular, descripción y CTA.

ad_hooks:
20 hooks potentes para anuncios.

image_prompts:
10 prompts profesionales para generar imágenes publicitarias con IA. Incluye estilo visual, fondo, iluminación, composición y emoción.

image_overlay:
15 frases cortas para poner encima de imágenes publicitarias.

ugc_ideas:
7 ideas de videos UGC con escena, gancho inicial, demostración, frase emocional y cierre.

REGLAS:
- Escribe como experto humano.
- No suenes genérico.
- No prometas curas ni resultados imposibles.
- No uses claims engañosos.
- Hazlo vendedor, estratégico y premium.
- Enfócate en conversión.
- Adapta el lenguaje al país objetivo.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Error al conectar con OpenAI"
      });
    }

    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Error interno del servidor"
    });
  }
}
