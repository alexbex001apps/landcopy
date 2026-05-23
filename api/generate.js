
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
  const model = hasImage ? 'gpt-4o' : 'gpt-4o-mini';

  const prompt = `Eres el mejor experto en copywriting persuasivo para ecommerce latinoamericano. 
REGLA DE ORO: BENEFICIO siempre mayor que CARACTERISTICA. Habla de lo que el cliente GANA, EVITA o MEJORA — nunca de especificaciones tecnicas frias.
IDIOMA: Todo el contenido debe estar en ESPAÑOL. Los prompts de imagenes tambien en ESPAÑOL.
TONO: ${tone}. Adapta el lenguaje coloquial al pais: ${co.name}.
METODO DE PAGO disponible: ${co.pay}.

DATOS DEL PRODUCTO:
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
