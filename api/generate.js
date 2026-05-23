
import https from 'https';

const countryData = {
  colombia:  { name:'Colombia',      pay:'pago contra entrega', currency:'pesos colombianos (COP)', slang:'Usa expresiones colombianas naturales: "parcero/a", "bacano", "chimba", "listo", "uy". Adapta precios a COP.' },
  costarica: { name:'Costa Rica',    pay:'pago contra entrega', currency:'colones (CRC)',            slang:'Usa expresiones costarricenses: "mae", "tuanis", "pura vida", "diay". Adapta precios a CRC.' },
  mexico:    { name:'México',        pay:'pago contra entrega', currency:'pesos mexicanos (MXN)',    slang:'Usa expresiones mexicanas: "wey", "chido", "órale", "chingón", "¿qué onda?". Adapta precios a MXN.' },
  venezuela: { name:'Venezuela',     pay:'pago contra entrega', currency:'dólares (USD)',            slang:'Usa expresiones venezolanas: "chamo/a", "chévere", "pana", "arrecho", "verga". Adapta precios a USD.' },
  ecuador:   { name:'Ecuador',       pay:'pago contra entrega', currency:'dólares (USD)',            slang:'Usa expresiones ecuatorianas: "ñaño/a", "bacán", "causa", "chévere". Adapta precios a USD.' },
  general:   { name:'Latinoamérica', pay:'pago contra entrega', currency:'dólares (USD)',            slang:'Usa español neutro latinoamericano, sin regionalismos.' },
};

const toneInstructions = {
  urgente:   'TONO URGENTE: Crea escasez real. Usa frases como "Solo hoy", "Últimas unidades", "La oferta termina pronto", "No esperes más". Genera FOMO (miedo a perderse algo). Frases cortas y directas. Muchos signos de exclamación. El cliente debe sentir que si no compra ahora pierde la oportunidad.',
  emocional: 'TONO EMOCIONAL: Conecta con el dolor profundo del cliente. Cuenta historias reales de personas que sufrieron y encontraron la solución. Usa empatía total: "Sabemos lo que sientes", "No estás solo/a", "Mereces sentirte mejor". Apela a sueños, familia, calidad de vida. El cliente debe sentir que lo entiendes.',
  racional:  'TONO RACIONAL: Usa datos, estadísticas y hechos concretos. Incluye porcentajes, estudios, comparaciones con la competencia. Ejemplo: "El 87% de nuestros clientes reportó mejora en 7 días". Explica el mecanismo de acción. El cliente escéptico debe quedar convencido con evidencia.',
  casual:    'TONO CASUAL: Habla como un amigo que da un consejo. Informal, cercano, sin presión. Usa humor ligero cuando aplique. Evita palabras de vendedor. Ejemplo: "Mira, esto me funcionó a mí y creo que a ti también te va a ir bien". El cliente debe sentir que le estás hablando de corazón.',
  confianza: 'TONO CONFIANZA: Construye credibilidad con prueba social masiva. Menciona número de clientes, años en el mercado, garantías sólidas, certificaciones. Usa testimonios específicos con nombres y ciudades. El cliente desconfiado debe sentir que es seguro comprar.',
  premium:   'TONO PREMIUM: Posiciona el producto como exclusivo y de alta calidad. Evita hablar de precio bajo — habla de valor e inversión. Usa palabras como "selecto", "exclusivo", "para quienes exigen lo mejor", "formulación avanzada". El cliente debe sentir que está comprando lo mejor del mercado.',
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

  const { name, problem, benefit, price, priceOld, clients, chars, category, country, tone, image, imageMime, outputs } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const co = countryData[country] || countryData.general;
  const toneDesc = toneInstructions[tone] || toneInstructions.urgente;
  const hasImage = !!image;
  const hasChars = !!(chars && chars.trim());
  const o = outputs || {};

  // Build JSON fields dynamically based on selected outputs
  const fields = {};

  if(o.landing) {
    fields.landing_trust_bar = `🚚 ENVIOS A TODO ${co.name} | ⭐ +CLIENTES SATISFECHOS | 💳 PAGAS AL RECIBIR | ✅ GARANTIA`;
    fields.landing_hero = `titular potente atacando el dolor\\n\\nsubtitular con beneficio\\n\\nbeneficio rapido`;
    fields.landing_problem = `titular empatico\\n\\n❌ sintoma 1\\n\\n❌ sintoma 2\\n\\n❌ sintoma 3\\n\\n❌ sintoma 4\\n\\n❌ sintoma 5\\n\\n❌ sintoma 6`;
    fields.landing_solution = `storytelling completo minimo 120 palabras con empatia solucion y resultado`;
    fields.landing_benefits = `✅ beneficio emocional 1\\n\\n✅ beneficio emocional 2\\n\\n✅ beneficio emocional 3\\n\\n✅ beneficio emocional 4\\n\\n✅ beneficio emocional 5\\n\\n✅ beneficio emocional 6`;
    fields.landing_testimonials = `⭐⭐⭐⭐⭐\\n"testimonio completo 1 con historia real"\\n— Nombre, Ciudad\\n\\n⭐⭐⭐⭐⭐\\n"testimonio completo 2"\\n— Nombre, Ciudad\\n\\n⭐⭐⭐⭐⭐\\n"testimonio completo 3"\\n— Nombre, Ciudad`;
    fields.landing_uses = `Titulo introductorio\\n\\n✅ perfil ideal 1\\n\\n✅ perfil ideal 2\\n\\n✅ perfil ideal 3\\n\\n✅ perfil ideal 4\\n\\n✅ perfil ideal 5\\n\\n✅ perfil ideal 6`;
    fields.landing_whats_included = `✅ item 1\\n\\n✅ item 2\\n\\n✅ item 3\\n\\n✅ item 4\\n\\n✅ item 5`;
    fields.landing_faq = `¿Pregunta 1?\\nRespuesta completa 1.\\n\\n¿Pregunta 2?\\nRespuesta completa 2.\\n\\n¿Pregunta 3?\\nRespuesta completa 3.\\n\\n¿Pregunta 4?\\nRespuesta completa 4.\\n\\n¿Pregunta 5?\\nRespuesta completa 5.\\n\\n¿Pregunta 6?\\nRespuesta completa 6.`;
    fields.landing_cta = `CTA urgente con precio garantia metodo de pago y boton de accion`;
  }

  if(o.whatsapp) {
    fields.wa_cold = `mensaje contacto frio 6 lineas empaticas sin vender directo`;
    fields.wa_followup = `mensaje seguimiento con urgencia 8 lineas`;
    fields.wa_close = `mensaje cierre con escasez garantia e instruccion de compra`;
  }

  if(o.social) {
    fields.social_post = `post completo Instagram Facebook con emojis minimo 100 palabras`;
    fields.social_tiktok = `[0-3s] gancho\\n\\n[3-10s] problema\\n\\n[10-20s] solucion\\n\\n[20-30s] CTA`;
    fields.social_hashtags = `#hashtag1\\n\\n#hashtag2\\n\\n(25 hashtags en español para ${co.name})`;
  }

  if(o.meta) {
    fields.meta_campaign = `Objetivo:\\n\\nAudiencia detallada (edad intereses comportamientos):\\n\\nPresupuesto sugerido:\\n\\nEstructura de campana (fases):`;
    fields.meta_ads = `ANUNCIO 1 — Dolor\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 2 — Beneficio\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 3 — Testimonial\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 4 — Urgencia\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 5 — Precio\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...`;
    fields.ad_hooks = `1. hook\\n\\n2. hook\\n\\n3. hook\\n\\n4. hook\\n\\n5. hook\\n\\n6. hook\\n\\n7. hook\\n\\n8. hook\\n\\n9. hook\\n\\n10. hook`;
  }

  if(o.images) {
    fields.image_prompts = `1. descripcion escena imagen 1 en español\\n\\n2. descripcion escena imagen 2\\n\\n3. descripcion escena imagen 3\\n\\n4. descripcion escena imagen 4\\n\\n5. descripcion escena imagen 5`;
    fields.image_overlay = `Texto 1\\n\\nTexto 2\\n\\nTexto 3\\n\\nTexto 4\\n\\nTexto 5\\n\\nTexto 6\\n\\nTexto 7\\n\\nTexto 8\\n\\nTexto 9\\n\\nTexto 10`;
    fields.ugc_ideas = `IDEA 1\\nPerfil: ...\\nEscena: ...\\nGuion: ...\\n\\nIDEA 2\\nPerfil: ...\\nEscena: ...\\nGuion: ...\\n\\nIDEA 3\\nPerfil: ...\\nEscena: ...\\nGuion: ...\\n\\nIDEA 4\\nPerfil: ...\\nEscena: ...\\nGuion: ...\\n\\nIDEA 5\\nPerfil: ...\\nEscena: ...\\nGuion: ...`;
  }

  if(o.email) {
    fields.extra_email = `Asunto: ...\\n\\nCuerpo completo del email minimo 150 palabras con historia beneficios testimonial y CTA`;
  }

  if(o.objeciones) {
    fields.extra_objeciones = `Objecion: el precio es alto.\\nRespuesta: respuesta completa persuasiva.\\n\\nObjecion: no confio en el producto.\\nRespuesta: respuesta completa.\\n\\nObjecion: ya probe otras cosas.\\nRespuesta: respuesta completa.\\n\\nObjecion: no creo que me llegue.\\nRespuesta: respuesta completa.\\n\\nObjecion: mi caso es diferente.\\nRespuesta: respuesta completa.\\n\\nObjecion: lo voy a pensar.\\nRespuesta: respuesta completa.`;
  }

  if(o.extras) {
    fields.extra_desc = `descripcion SEO completa para tienda minimo 150 palabras`;
    fields.extra_seo = `keyword 1\\n\\nkeyword 2\\n\\nkeyword 3\\n\\n(20 keywords en español para ${co.name})`;
  }

  if(hasChars) {
    fields.benefit_transform = `[{"char":"caracteristica original","benefit":"beneficio emocional que recibe el cliente"}]`;
  }

  if(hasImage) {
    fields.vision_analysis = `descripcion detallada de lo que ves en la imagen del producto`;
    fields.vision_summary = `resumen en una sola oracion del producto segun la imagen`;
  }

  const jsonTemplate = JSON.stringify(fields, null, 0)
    .replace(/"benefit_transform":"(\[.*?\])"/g, '"benefit_transform":$1');

  const prompt = `Eres el mejor experto en copywriting persuasivo para ecommerce latinoamericano.

REGLA DE ORO: BENEFICIO siempre mayor que CARACTERISTICA. Habla de lo que el cliente GANA, EVITA o MEJORA.
IDIOMA: Todo en ESPAÑOL. Adapta al pais y tono indicados.
SEPARACION: Cada item separado por linea en blanco (\\n\\n).

${toneDesc}

PAIS: ${co.name}. ${co.slang}
METODO DE PAGO: ${co.pay}.

PRODUCTO:
- Nombre: ${name}
- Problema: ${problem}
- Beneficio principal: ${benefit}
- Precio: ${price}${priceOld ? ` (antes ${priceOld})` : ''}${clients ? `\n- Clientes actuales: ${clients}` : ''}${hasChars ? `\n- Caracteristicas: ${chars}` : ''}
${hasImage ? '\nANALIZA LA IMAGEN adjunta e integra lo que ves al copy.' : ''}

Responde SOLO con JSON valido sin markdown. Rellena cada campo con contenido real y completo siguiendo exactamente el formato indicado:

${jsonTemplate}`;

  try {
    const messages = hasImage
      ? [{ role:'user', content:[
          { type:'image_url', image_url:{ url:`data:${imageMime};base64,${image}`, detail:'low' }},
          { type:'text', text:prompt }
        ]}]
      : [{ role:'user', content:prompt }];

    const result = await callOpenAI(process.env.OPENAI_API_KEY, {
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      temperature: 0.8,
      messages
    });

    if(result.status !== 200) {
      return res.status(500).json({ error: result.body.error?.message || 'Error OpenAI' });
    }

    const raw = result.body.choices[0].message.content.trim();
    const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch(err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message || 'Error al generar' });
  }
}
