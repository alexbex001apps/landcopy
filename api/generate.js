
import https from 'https';

const countryData = {
  colombia:  { name:'Colombia',      pay:'pago contra entrega', ship:'Colombia' },
  costarica: { name:'Costa Rica',    pay:'pago contra entrega', ship:'Costa Rica' },
  mexico:    { name:'México',        pay:'pago contra entrega', ship:'México' },
  venezuela: { name:'Venezuela',     pay:'pago contra entrega', ship:'Venezuela' },
  ecuador:   { name:'Ecuador',       pay:'pago contra entrega', ship:'Ecuador' },
  general:   { name:'Latinoamérica', pay:'pago contra entrega', ship:'tu país' },
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
  const hasImage = !!image;
  const hasChars = !!(chars && chars.trim());
  const model = 'gpt-4o-mini';

  const prompt = `Eres el mejor experto en copywriting persuasivo para ecommerce latinoamericano. 
REGLA DE ORO: BENEFICIO siempre mayor que CARACTERISTICA. Habla de lo que el cliente GANA, EVITA o MEJORA — nunca de especificaciones tecnicas frias.
IDIOMA: Todo el contenido debe estar en ESPAÑOL. Los prompts de imagenes tambien en ESPAÑOL.
TONO: ${tone}. Adapta el lenguaje coloquial al pais: ${co.name}.
METODO DE PAGO disponible: ${co.pay}.
FORMATO OBLIGATORIO: Cada item, objecion, testimonio, anuncio, hook, beneficio o pregunta DEBE estar separado por una linea en blanco. Nunca juntes varios items en un mismo parrafo.

DATOS DEL PRODUCTO:
- Nombre: ${name}
- Problema que resuelve: ${problem}
- Beneficio principal: ${benefit}
- Precio oferta: ${price}${priceOld ? ` | Precio anterior: ${priceOld}` : ''}${clients ? ` | Clientes actuales: ${clients}` : ''}
- Categoria: ${category || 'general'}
- Pais objetivo: ${co.name}${hasChars ? `\n- Caracteristicas del producto: ${chars}` : ''}
${hasImage ? '\nANALIZA LA IMAGEN adjunta: describe el producto, colores, presentacion, empaque y usa esa informacion para enriquecer el copy.' : ''}

Responde UNICAMENTE con un objeto JSON valido. Sin markdown, sin bloques de codigo, sin texto antes o despues. Solo el JSON puro.
En cada campo que tenga multiples items, separalos con \n\n (doble salto de linea) para que queden visualmente separados.

{
  "landing_trust_bar": "4 badges separados por | con emojis: 🚚 ENVIOS A TODO ${co.name} | ⭐ +CLIENTES SATISFECHOS | 💳 PAGAS AL RECIBIR | ✅ GARANTIA DE ENTREGA",
  "landing_hero": "Titular hero potente en 3 lineas separadas por \n\n atacando el dolor",
  "landing_problem": "Titular empatico\n\n¿Sabias que el X% de personas sufren de...?\n\n❌ Sintoma 1\n\n❌ Sintoma 2\n\n❌ Sintoma 3\n\n❌ Sintoma 4\n\n❌ Sintoma 5\n\n❌ Sintoma 6",
  "landing_solution": "Storytelling completo de la solucion minimo 150 palabras. Empezar con empatia, explicar el problema, presentar el producto, mostrar el resultado.",
  "landing_benefits": "✅ Beneficio emocional 1\n\n✅ Beneficio emocional 2\n\n✅ Beneficio emocional 3\n\n✅ Beneficio emocional 4\n\n✅ Beneficio emocional 5\n\n✅ Beneficio emocional 6",
  "landing_testimonials": "⭐⭐⭐⭐⭐\n\"Historia completa del cliente 1 — problema, experiencia y resultado en 3 oraciones\"\n— Nombre, Ciudad\n\n⭐⭐⭐⭐⭐\n\"Historia completa del cliente 2\"\n— Nombre, Ciudad\n\n⭐⭐⭐⭐⭐\n\"Historia completa del cliente 3\"\n— Nombre, Ciudad",
  "landing_uses": "Titulo introductorio\n\n✅ Perfil de uso 1\n\n✅ Perfil de uso 2\n\n✅ Perfil de uso 3\n\n✅ Perfil de uso 4\n\n✅ Perfil de uso 5\n\n✅ Perfil de uso 6",
  "landing_whats_included": "¿Que incluye tu pedido?\n\n✅ Item 1\n\n✅ Item 2\n\n✅ Item 3\n\n✅ Item 4\n\n✅ Item 5",
  "landing_faq": "¿Pregunta 1?\nRespuesta completa y tranquilizadora.\n\n¿Pregunta 2?\nRespuesta completa.\n\n¿Pregunta 3?\nRespuesta completa.\n\n¿Pregunta 4?\nRespuesta completa.\n\n¿Pregunta 5?\nRespuesta completa.\n\n¿Pregunta 6?\nRespuesta completa.",
  "landing_cta": "CTA final urgente completo con precio, garantia y boton de accion",
  "wa_cold": "Mensaje WhatsApp contacto frio — maximo 6 lineas empaticas sin vender directo",
  "wa_followup": "Mensaje WhatsApp seguimiento con urgencia — maximo 8 lineas",
  "wa_close": "Mensaje WhatsApp cierre con escasez garantia e instruccion clara — maximo 8 lineas",
  "social_post": "Post completo Instagram y Facebook con gancho historia beneficios CTA y emojis — minimo 150 palabras",
  "social_tiktok": "[0-3 seg] Gancho visual\n\n[3-10 seg] Presentar el problema\n\n[10-20 seg] Mostrar solucion y resultado\n\n[20-30 seg] CTA claro",
  "social_hashtags": "#hashtag1\n\n#hashtag2\n\n#hashtag3\n\n(25 hashtags en español separados por \n\n)",
  "meta_campaign": "Objetivo: ...\n\nAudiencia: ...\n\nPresupuesto sugerido: ...\n\nEstructura: ...\n\nCreatividades recomendadas: ...",
  "meta_ads": "ANUNCIO 1 — Angulo dolor\nTITULAR: ...\nDESCRIPCION: ...\nCTA: ...\n\nANUNCIO 2 — Angulo beneficio\nTITULAR: ...\nDESCRIPCION: ...\nCTA: ...\n\nANUNCIO 3 — Angulo testimonial\nTITULAR: ...\nDESCRIPCION: ...\nCTA: ...\n\nANUNCIO 4 — Angulo urgencia\nTITULAR: ...\nDESCRIPCION: ...\nCTA: ...\n\nANUNCIO 5 — Angulo precio\nTITULAR: ...\nDESCRIPCION: ...\nCTA: ...",
  "ad_hooks": "1. Hook de pregunta\n\n2. Hook de afirmacion\n\n3. Hook de dato sorprendente\n\n4. Hook de situacion cotidiana\n\n5. Hook de dolor\n\n6. Hook de resultado\n\n7. Hook de urgencia\n\n8. Hook de testimonio\n\n9. Hook de comparacion\n\n10. Hook de transformacion",
  "image_prompts": "1. Descripcion escena imagen 1\n\n2. Descripcion escena imagen 2\n\n3. Descripcion escena imagen 3\n\n4. Descripcion escena imagen 4\n\n5. Descripcion escena imagen 5",
  "image_overlay": "Texto 1\n\nTexto 2\n\nTexto 3\n\nTexto 4\n\nTexto 5\n\nTexto 6\n\nTexto 7\n\nTexto 8\n\nTexto 9\n\nTexto 10",
  "ugc_ideas": "IDEA 1\nPerfil: ...\nEscena: ...\nGuion: ...\n\nIDEA 2\nPerfil: ...\nEscena: ...\nGuion: ...\n\nIDEA 3\nPerfil: ...\nEscena: ...\nGuion: ...\n\nIDEA 4\nPerfil: ...\nEscena: ...\nGuion: ...\n\nIDEA 5\nPerfil: ...\nEscena: ...\nGuion: ...",
  "extra_email": "Asunto: ...\n\nCuerpo completo del email minimo 200 palabras con saludo historia producto beneficios testimonial y CTA",
  "extra_objeciones": "Objecion: El precio es muy alto.\nRespuesta: Respuesta completa que derriba esta objecion.\n\nObjecion: No confio en el producto.\nRespuesta: Respuesta completa.\n\nObjecion: Ya probe otras cosas y no funcionaron.\nRespuesta: Respuesta completa.\n\nObjecion: No creo que me llegue el pedido.\nRespuesta: Respuesta completa.\n\nObjecion: Mi caso es diferente.\nRespuesta: Respuesta completa.\n\nObjecion: Lo voy a pensar.\nRespuesta: Respuesta completa.",
  "extra_desc": "Descripcion completa SEO para tienda minimo 200 palabras con beneficios caracteristicas para quien es y garantia",
  "extra_seo": "1. keyword corta\n\n2. keyword de cola larga\n\n3. pregunta que busca el cliente\n\n(20 keywords en español separadas por \n\n)"${hasChars ? `,
  "benefit_transform": [{"char": "caracteristica original", "benefit": "beneficio emocional que recibe el cliente"}]` : ''}${hasImage ? `,
  "vision_analysis": "Descripcion detallada: tipo de producto, forma, colores, empaque, materiales, percepcion de marca y calidad",
  "vision_summary": "En una sola oracion: que tipo de producto es y cual es su principal atributo visual"` : ''}
}`;
- Nombre: ${name}
- Problema que resuelve: ${problem}
- Beneficio principal: ${benefit}
- Precio oferta: ${price}${priceOld ? ` | Precio anterior: ${priceOld}` : ''}${clients ? ` | Clientes actuales: ${clients}` : ''}
- Categoria: ${category || 'general'}
- Pais objetivo: ${co.name}${hasChars ? `\n- Caracteristicas del producto: ${chars}` : ''}
${hasImage ? '\nANALIZA LA IMAGEN adjunta: describe el producto, colores, presentacion, empaque y usa esa informacion para enriquecer el copy.' : ''}

INSTRUCCIONES: Genera contenido EXTENSO y COMPLETO para cada campo. No seas breve. Cada seccion debe tener suficiente contenido para usarse directamente.

Responde UNICAMENTE con un objeto JSON valido. Sin markdown, sin bloques de codigo, sin texto antes o despues. Solo el JSON puro:

{
  "landing_trust_bar": "Barra superior con 4 badges de confianza usando emojis. Ejemplo: 🚚 ENVIOS A TODO ${co.name} | ⭐ +[N] CLIENTES SATISFECHOS | 💳 PAGAS AL RECIBIR | ✅ GARANTIA DE ENTREGA",
  "landing_hero": "Titular hero potente atacando el dolor. Formula: pregunta que identifica el problema + nombre del producto + beneficio principal. Maximo 3 lineas impactantes.",
  "landing_problem": "Seccion de identificacion del problema. Incluye: titular empatico (¿Sabias que el X% de personas sufren de...?), subtitulo de identificacion, y lista de 6 sintomas o frustraciones con emoji ❌ cada uno. Tono emocional y empatico.",
  "landing_solution": "Storytelling de la solucion. Estructura: 1) Empezar con empatia (Sabemos lo frustrante que es...), 2) Explicar por que ocurre el problema, 3) Presentar el producto como solucion natural, 4) Mostrar el resultado esperado. Minimo 150 palabras.",
  "landing_benefits": "6 beneficios emocionales reales con emoji ✅ cada uno. Cada beneficio debe ser una frase completa que explique lo que el cliente GANA o EVITA. No caracteristicas tecnicas.",
  "landing_testimonials": "3 testimonios completos y creibles. Cada uno con: ⭐⭐⭐⭐⭐, texto entre comillas (historia real: problema que tenia → experiencia con el producto → resultado obtenido, minimo 3 oraciones), nombre comun y ciudad. Que suenen naturales y emocionales.",
  "landing_uses": "Seccion ideal para. Titulo: Usalo donde mas lo necesites. Lista de 6 perfiles o situaciones de uso con emoji ✅. Incluye texto introductorio.",
  "landing_whats_included": "Seccion que incluye el pedido. Titulo: ¿Que incluye tu pedido? Lista de 4-6 items con emoji ✅. Incluye el producto principal, accesorios, garantia y algun bonus.",
  "landing_faq": "6 preguntas frecuentes completas con pregunta y respuesta. Temas: como se usa, es seguro, cuando veo resultados, tiene garantia, como pago, tiempo de envio a ${co.name}. Respuestas tranquilizadoras y claras.",
  "landing_cta": "CTA final urgente y persuasivo. Incluye: precio oferta destacado${priceOld ? ', precio anterior tachado' : ''}, porcentaje de descuento si aplica, metodo de pago (${co.pay}), garantia, boton de accion y frase de urgencia.",
  "wa_cold": "Mensaje WhatsApp para primer contacto frio. Maximo 6 lineas. Empatico, NO vende directo, despierta curiosidad. Empieza identificando el dolor, no el producto.",
  "wa_followup": "Mensaje WhatsApp de seguimiento para quien no respondio. Crea urgencia sin presionar. Menciona testimonios o resultados. Maximo 8 lineas.",
  "wa_close": "Mensaje WhatsApp para cerrar la venta. Menciona escasez o urgencia, garantia, instruccion clara de como pedir. Maximo 8 lineas.",
  "social_post": "Post completo para Instagram y Facebook. Incluye: gancho inicial potente, historia o contexto, beneficios del producto, CTA claro y emojis estrategicos. Minimo 150 palabras.",
  "social_tiktok": "Guion completo para TikTok de 30 segundos. Estructura: [0-3 seg] Gancho visual que para el scroll | [3-10 seg] Presentar el problema | [10-20 seg] Mostrar la solucion y resultado | [20-30 seg] CTA claro. Incluir indicaciones de toma o accion.",
  "social_hashtags": "25 hashtags en ESPAÑOL relevantes para ${co.name} y la categoria del producto. Mezcla hashtags grandes, medianos y de nicho.",
  "meta_campaign": "Campana Meta Ads completa. Incluye: objetivo recomendado, audiencia detallada (edad, intereses, comportamientos), presupuesto sugerido, estructura de campana (fases: trafico frio, retargeting, lookalike), creatividades recomendadas.",
  "meta_ads": "5 anuncios Meta Ads diferentes con estilos distintos. Cada uno con: TITULAR (maximo 40 caracteres), DESCRIPCION (maximo 125 caracteres), CTA y ANGULO (dolor/beneficio/testimonial/urgencia/precio). Separados claramente.",
  "ad_hooks": "10 hooks de apertura para videos de anuncios. Cada hook es la frase o situacion de los primeros 3 segundos que detiene el scroll. Variedad: pregunta, afirmacion, dato sorprendente, situacion cotidiana. En ESPAÑOL.",
  "image_prompts": "5 descripciones detalladas en ESPAÑOL para crear imagenes del producto con IA. Cada una describe: escena, persona, accion, ambiente, estilo fotografico. Que sean visuales y emocionales.",
  "image_overlay": "10 textos cortos en ESPAÑOL (maximo 5 palabras cada uno) para superponer en imagenes o videos del producto. Que generen urgencia, confianza o emocion.",
  "ugc_ideas": "5 ideas completas de videos UGC (contenido de usuario). Cada idea incluye: perfil del creador, escena, guion resumido de 3 momentos clave, y angulo emocional.",
  "extra_email": "Email de seguimiento completo. Incluye: asunto del email, saludo personalizado, historia empatica, presentacion del producto, 3 beneficios clave, testimonial corto, CTA claro y firma. Minimo 200 palabras.",
  "extra_objeciones": "Manejo de 6 objeciones comunes. Para cada objecion: la objecion exacta que dice el cliente y la respuesta persuasiva que la derriba. Objeciones: precio, desconfianza, ya probe otras cosas, no me llegara, mi caso es diferente, lo pensare.",
  "extra_desc": "Descripcion completa para tienda Shopify o ecommerce. Optimizada para SEO. Incluye: parrafo de beneficios, lista de caracteristicas convertidas en beneficios, para quien es ideal, que incluye y garantia. Minimo 200 palabras.",
  "extra_seo": "20 keywords y frases de busqueda en ESPAÑOL para ${co.name}. Mezcla: keywords cortas (1-2 palabras), keywords de cola larga (3-5 palabras) y preguntas que busca el cliente en Google."${hasChars ? `,
  "benefit_transform": [{"char": "caracteristica original del producto", "benefit": "beneficio emocional que recibe el cliente"}]` : ''}${hasImage ? `,
  "vision_analysis": "Descripcion detallada de lo que ves en la imagen: tipo de producto, forma, colores, empaque, materiales visibles, percepcion de marca y calidad",
  "vision_summary": "En una sola oracion: que tipo de producto es y cual es su principal atributo visual"` : ''}
}`;

  try {
    const messages = hasImage
      ? [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${imageMime};base64,${image}`, detail: 'low' } },
          { type: 'text', text: prompt }
        ]}]
      : [{ role: 'user', content: prompt }];

    const result = await callOpenAI(process.env.OPENAI_API_KEY, {
      model,
      max_tokens: 4096,
      temperature: 0.8,
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
}
