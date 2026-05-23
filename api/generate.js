
import https from 'https';

const countryData = {
  colombia:  { name:'Colombia',      pay:'pago contra entrega', slang:'Usa expresiones colombianas: "parcero/a", "bacano", "chimba", "listo". Precios en COP.' },
  costarica: { name:'Costa Rica',    pay:'pago contra entrega', slang:'Usa expresiones costarricenses: "mae", "tuanis", "pura vida", "diay". Precios en CRC.' },
  mexico:    { name:'México',        pay:'pago contra entrega', slang:'Usa expresiones mexicanas: "wey", "chido", "órale", "chingón". Precios en MXN.' },
  venezuela: { name:'Venezuela',     pay:'pago contra entrega', slang:'Usa expresiones venezolanas: "chamo/a", "chévere", "pana". Precios en USD.' },
  ecuador:   { name:'Ecuador',       pay:'pago contra entrega', slang:'Usa expresiones ecuatorianas: "ñaño/a", "bacán", "causa". Precios en USD.' },
  general:   { name:'Latinoamérica', pay:'pago contra entrega', slang:'Usa español neutro latinoamericano.' },
};

const toneInstructions = {
  urgente:   'TONO URGENTE: Crea escasez. Usa "Solo hoy", "Últimas unidades", "No esperes más". Frases cortas. Mucho signo de exclamación. El cliente debe sentir que si no compra ahora pierde la oportunidad.',
  emocional: 'TONO EMOCIONAL: Conecta con el dolor profundo. Cuenta historias reales. Usa "Sabemos lo que sientes", "No estás solo/a". Apela a familia y calidad de vida.',
  racional:  'TONO RACIONAL: Usa datos y estadísticas concretas. Incluye porcentajes y comparaciones. Ejemplo: "El 87% reportó mejora en 7 días". El escéptico debe quedar convencido.',
  casual:    'TONO CASUAL: Habla como amigo dando un consejo. Informal, sin presión. Evita palabras de vendedor. El cliente debe sentir que le hablas de corazón.',
  confianza: 'TONO CONFIANZA: Construye credibilidad con prueba social. Menciona número de clientes, garantías, certificaciones. El desconfiado debe sentir que es seguro comprar.',
  premium:   'TONO PREMIUM: Posiciona como exclusivo y de alta calidad. Usa "selecto", "exclusivo", "para quienes exigen lo mejor". Habla de valor, no de precio.',
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

  // ── MODO IMPROVE ONLY ──────────────────────
  if(req.body.improveOnly) {
    const { originalText, sectionName } = req.body;
    const improvePrompt = `Eres el mejor experto en copywriting persuasivo para ecommerce latinoamericano.

Tu tarea: tomar este texto de marketing y hacerlo MAS VENDEDOR, MAS EMOCIONAL y MAS PERSUASIVO.

Seccion: ${sectionName || 'copy de marketing'}
Pais: ${(countryData[country] || countryData.general).name}

TEXTO ORIGINAL:
${originalText}

INSTRUCCIONES:
- Mantén la misma estructura y longitud aproximada
- Usa palabras más poderosas y emocionales
- Agrega más urgencia donde aplique
- Frases más directas y con más impacto
- Mantén el mismo idioma y tono base pero intensifícalo
- NO cambies los datos (precios, nombres, ciudades)
- Responde SOLO con el texto mejorado, sin explicaciones ni JSON`;

    const result = await callOpenAI(process.env.OPENAI_API_KEY, {
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0.85,
      messages: [{ role: 'user', content: improvePrompt }]
    });

    if(result.status !== 200) return res.status(500).json({ error: result.body.error?.message || 'Error OpenAI' });
    const improved = result.body.choices[0].message.content.trim();
    return res.status(200).json({ improved });
  }

  // ── MODO HERO ONLY ──────────────────────
  if(req.body.heroOnly) {
    const heroPrompt = `Eres experto en copywriting persuasivo para ecommerce latinoamericano.

Producto: ${name} | Problema: ${problem} | Beneficio: ${benefit} | Precio: ${price} | Pais: ${co.name}

Genera 3 titulares hero DIFERENTES para este producto. Cada uno con un angulo distinto. Maximo 4 lineas cada uno.

Responde SOLO con este JSON sin markdown:
{
  "hero_emocional": "titular hero con angulo emocional — conecta con el dolor y la esperanza",
  "hero_racional": "titular hero con angulo racional — usa datos, logica y resultados concretos",
  "hero_urgente": "titular hero con angulo urgente — escasez, tiempo limitado, accion inmediata"
}`;

    const result = await callOpenAI(process.env.OPENAI_API_KEY, {
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.9,
      messages: [{ role: 'user', content: heroPrompt }]
    });

    if(result.status !== 200) return res.status(500).json({ error: result.body.error?.message || 'Error OpenAI' });
    const raw = result.body.choices[0].message.content.trim();
    const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
    return res.status(200).json(JSON.parse(clean));
  }

  // Build JSON fields as string — avoids double-escaping
  const jsonFields = [];

  if(o.landing) {
    jsonFields.push(`"landing_trust_bar":"🚚 ENVIOS A TODO ${co.name} | ⭐ +[N] CLIENTES SATISFECHOS | 💳 PAGAS AL RECIBIR | ✅ GARANTIA DE ENTREGA"`);
    jsonFields.push(`"landing_hero":"[TITULAR POTENTE QUE ATACA EL DOLOR]\\n\\n[SUBTITULAR CON BENEFICIO PRINCIPAL]\\n\\n[BENEFICIO RAPIDO EN 1 LINEA]"`);
    jsonFields.push(`"landing_problem":"[TITULAR EMPATICO]\\n\\n❌ [sintoma o frustracion 1]\\n\\n❌ [sintoma 2]\\n\\n❌ [sintoma 3]\\n\\n❌ [sintoma 4]\\n\\n❌ [sintoma 5]\\n\\n❌ [sintoma 6]"`);
    jsonFields.push(`"landing_solution":"Parrafo introductorio empatico de 2 oraciones que conecta con el dolor del cliente.\\n\\n✅ [Solucion 1 — beneficio concreto en 1 oracion]\\n\\n✅ [Solucion 2 — beneficio concreto en 1 oracion]\\n\\n✅ [Solucion 3 — beneficio concreto en 1 oracion]\\n\\n✅ [Solucion 4 — beneficio concreto en 1 oracion]\\n\\nParrafo final de cierre que invita a la accion."`);
    jsonFields.push(`"landing_benefits":"✅ [beneficio emocional 1 — lo que el cliente GANA]\\n\\n✅ [beneficio 2]\\n\\n✅ [beneficio 3]\\n\\n✅ [beneficio 4]\\n\\n✅ [beneficio 5]\\n\\n✅ [beneficio 6]"`);
    jsonFields.push(`"landing_testimonials":"⭐⭐⭐⭐⭐\\n\\"[Historia real: problema que tenia, experiencia con el producto, resultado obtenido — minimo 3 oraciones].\\"\\n— [Nombre comun], [Ciudad]\\n\\n⭐⭐⭐⭐⭐\\n\\"[Testimonio 2 completo].\\n— [Nombre], [Ciudad]\\n\\n⭐⭐⭐⭐⭐\\n\\"[Testimonio 3 completo].\\"\\n— [Nombre], [Ciudad]"`);
    jsonFields.push(`"landing_uses":"[Titulo introductorio]\\n\\n✅ [perfil o uso ideal 1]\\n\\n✅ [perfil 2]\\n\\n✅ [perfil 3]\\n\\n✅ [perfil 4]\\n\\n✅ [perfil 5]\\n\\n✅ [perfil 6]"`);
    jsonFields.push(`"landing_whats_included":"✅ [producto principal]\\n\\n✅ [accesorio o complemento]\\n\\n✅ [garantia]\\n\\n✅ [soporte]\\n\\n🎁 [bonus]"`);
    jsonFields.push(`"landing_faq":"¿[Pregunta 1 sobre uso]?\\n[Respuesta completa y tranquilizadora.]\\n\\n¿[Pregunta 2 sobre seguridad]?\\n[Respuesta.]\\n\\n¿[Pregunta 3 sobre resultados]?\\n[Respuesta.]\\n\\n¿[Pregunta 4 sobre garantia]?\\n[Respuesta.]\\n\\n¿[Pregunta 5 sobre pago]?\\n[Respuesta.]\\n\\n¿[Pregunta 6 sobre envio]?\\n[Respuesta.]"`);
    jsonFields.push(`"landing_cta":"[CTA URGENTE con precio oferta${priceOld ? ', precio anterior tachado' : ''}, metodo de pago (${co.pay}), garantia y boton de accion]"`);
  }

  if(o.whatsapp) {
    jsonFields.push(`"wa_cold":"[Mensaje WhatsApp contacto frio — maximo 6 lineas, empatico, NO vende directo, despierta curiosidad]"`);
    jsonFields.push(`"wa_followup":"[Mensaje WhatsApp seguimiento — crea urgencia sin presionar, menciona testimonios, maximo 8 lineas]"`);
    jsonFields.push(`"wa_close":"[Mensaje WhatsApp cierre — escasez, garantia, instruccion clara de como pedir, maximo 8 lineas]"`);
  }

  if(o.social) {
    jsonFields.push(`"social_post":"[Post completo Instagram/Facebook con gancho + historia + beneficios + CTA + emojis, minimo 100 palabras]"`);
    jsonFields.push(`"social_tiktok":"[0-3s] [gancho visual que para el scroll]\\n\\n[3-10s] [presentar el problema]\\n\\n[10-20s] [mostrar solucion y resultado]\\n\\n[20-30s] [CTA claro]"`);
    jsonFields.push(`"social_hashtags":"#[hashtag1]\\n\\n#[hashtag2]\\n\\n#[hashtag3]\\n\\n(continua hasta 25 hashtags en español para ${co.name})"`);
  }

  if(o.meta) {
    jsonFields.push(`"meta_campaign":"Objetivo: [objetivo recomendado]\\n\\nAudiencia: [edad, intereses, comportamientos detallados]\\n\\nPresupuesto sugerido: [monto y estructura]\\n\\nEstructura: [fases trafico frio, retargeting, lookalike]"`);
    jsonFields.push(`"meta_ads":"ANUNCIO 1 — Angulo dolor\\nTITULAR: [maximo 40 caracteres]\\nDESCRIPCION: [maximo 125 caracteres]\\nCTA: [boton]\\n\\nANUNCIO 2 — Angulo beneficio\\nTITULAR: [...]\\nDESCRIPCION: [...]\\nCTA: [...]\\n\\nANUNCIO 3 — Angulo testimonial\\nTITULAR: [...]\\nDESCRIPCION: [...]\\nCTA: [...]\\n\\nANUNCIO 4 — Angulo urgencia\\nTITULAR: [...]\\nDESCRIPCION: [...]\\nCTA: [...]\\n\\nANUNCIO 5 — Angulo precio\\nTITULAR: [...]\\nDESCRIPCION: [...]\\nCTA: [...]"`);
    jsonFields.push(`"ad_hooks":"1. [hook de pregunta]\\n\\n2. [hook de dato sorprendente]\\n\\n3. [hook de situacion cotidiana]\\n\\n4. [hook de dolor]\\n\\n5. [hook de resultado]\\n\\n6. [hook de urgencia]\\n\\n7. [hook de testimonio]\\n\\n8. [hook de comparacion]\\n\\n9. [hook de transformacion]\\n\\n10. [hook de curiosidad]"`);
  }

  if(o.images) {
    jsonFields.push(`"image_prompts":"1. [Prompt ultra detallado estilo Midjourney: escena de persona real usando el producto en su vida cotidiana | descripcion exacta de la persona: edad aproximada, expresion facial de alivio y satisfaccion, postura corporal relajada | ambiente: sala de estar acogedora con luz natural entrando por ventana lateral en hora dorada 17h | tipo de luz: luz suave difusa de atardecer con tonos calidos ambar | angulo de camara: eye level, plano americano | lente: Sony A7III con lente 85mm f/1.4 | profundidad de campo: fondo completamente desenfocado bokeh cremoso | velocidad de obturacion: congelada 1/500s capturando un momento de quietud | emocion dominante: gratitud y bienestar | proposito: testimonial lifestyle para anuncio Meta | composicion: regla de tercios con producto en primer plano izquierdo | colores: tonos tierra calidos, crema y dorado | ultra realista, 8k, hiperdetallado, fotografia de revista --ar 4:5 --q 2]\\n\\n2. [Prompt ultra detallado: fotografia de producto puro sobre superficie | producto centrado con sombra suave simetrica debajo | fondo: degradado blanco a gris perla muy suave | iluminacion: tres puntos de luz de estudio, luz principal suave softbox 60x90cm lateral izquierda, relleno derecha al 50%, luz de separacion trasera | angulo: ligeramente elevado 15 grados sobre el producto | lente: macro 100mm para capturar texturas y materiales | enfoque: tack sharp en toda la superficie del producto | sin movimiento, imagen completamente estatica | proposito: imagen principal de ficha de producto ecommerce | quietud absoluta, tension entre el producto y el espacio negativo | colores exactos del producto con maxima fidelidad | commercial product photography, studio shot, white background, ultra HD, --ar 1:1 --q 2]\\n\\n3. [Prompt ultra detallado: momento antes-durante-despues implicito de transformacion | persona mostrando resultado positivo despues de usar el producto | expresion: sonrisa genuina de alivio, ojos que transmiten esperanza recuperada | postura: cuerpo abierto, expansivo, liberado de tension | ambiente: exterior parque o jardin, manana temprana luz suave | tipo de luz: luz natural suave de manana con niebla ligera, ambiente fresco y limpio | angulo: ligeramente contrapicado transmitiendo fortaleza y recuperacion | lente: 35mm f/2 para incluir ambiente contextual | movimiento: sutil movimiento del cabello o ropa con brisa ligera | emocion dominante: libertad, recuperacion, nueva oportunidad | tension narrativa: se intuye el sufrimiento pasado y el alivio presente | proposito: anuncio emocional para redes sociales | cinematic color grading, warm tones, lifestyle documentary photography --ar 4:5 --q 2]\\n\\n4. [Prompt ultra detallado: composicion aspiracional grupal | dos o tres personas de distintas edades usando o compartiendo el producto | ambiente premium: cocina moderna, terraza con vista, sala de reuniones elegante | luz: luz de mediodia controlada con reflectores, ambiente luminoso y optimista | angulo: wide shot 24mm para incluir todo el ambiente aspiracional | movimiento: personas en accion natural, no posando | velocidad: 1/250s capturando movimiento natural fluido | emocion: alegria compartida, conexion humana, calidad de vida | tension: dinamismo entre las personas y el entorno premium | proposito: imagen de marca y estilo de vida para campana de branding | colores: paleta premium azul profundo, dorado y blanco | lifestyle brand photography, environmental portrait, aspirational, --ar 16:9 --q 2]\\n\\n5. [Prompt ultra detallado: flat lay cenital minimalista de alta moda editorial | producto como protagonista absoluto rodeado de objetos complementarios curados | disposicion: composicion geometrica perfecta, simetria con tension visual intencional | superficie: marmol blanco estatuario con venas grises sutiles | objetos complementarios: flores secas premium, tela de lino arrugada elegantemente, objetos metalicos dorados | iluminacion: luz natural difusa desde ventana norte, sin sombras duras, luz perfectamente plana | angulo: 90 grados cenital exacto | lente: tilt-shift para plano perfectamente paralelo | velocidad: estatico, quietud absoluta, sin movimiento | emocion: calma, lujo discreto, sofisticacion | proposito: contenido para feed Instagram premium y catalogo de producto | colores: neutros con unico acento de color del producto | overhead shot, editorial flat lay, luxury product photography, minimalist --ar 1:1 --q 2]"`);
    jsonFields.push(`"image_overlay":"[Texto corto 1 maximo 5 palabras]\\n\\n[Texto 2]\\n\\n[Texto 3]\\n\\n[Texto 4]\\n\\n[Texto 5]\\n\\n[Texto 6]\\n\\n[Texto 7]\\n\\n[Texto 8]\\n\\n[Texto 9]\\n\\n[Texto 10]"`);
    jsonFields.push(`"ugc_ideas":"IDEA 1\\nPerfil: [tipo de persona]\\nEscena: [descripcion]\\nGuion: [3 momentos clave]\\n\\nIDEA 2\\nPerfil: [...]\\nEscena: [...]\\nGuion: [...]\\n\\nIDEA 3\\nPerfil: [...]\\nEscena: [...]\\nGuion: [...]\\n\\nIDEA 4\\nPerfil: [...]\\nEscena: [...]\\nGuion: [...]\\n\\nIDEA 5\\nPerfil: [...]\\nEscena: [...]\\nGuion: [...]"`);
  }

  if(o.email) {
    jsonFields.push(`"extra_email":"Asunto: [linea de asunto persuasiva]\\n\\n[Cuerpo completo del email minimo 200 palabras: saludo, historia empatica, presentacion del producto, 3 beneficios clave, testimonial corto, CTA claro, firma]"`);
  }

  if(o.objeciones) {
    jsonFields.push(`"extra_objeciones":"Objecion: El precio es muy alto.\\nRespuesta: [respuesta completa y persuasiva que derriba esta objecion — minimo 3 oraciones].\\n\\nObjecion: No confio en este producto.\\nRespuesta: [respuesta completa].\\n\\nObjecion: Ya probe otras cosas y no funcionaron.\\nRespuesta: [respuesta completa].\\n\\nObjecion: No creo que me llegue el pedido.\\nRespuesta: [respuesta completa].\\n\\nObjecion: Mi caso es diferente, creo que no funcionara para mi.\\nRespuesta: [respuesta completa].\\n\\nObjecion: Lo voy a pensar.\\nRespuesta: [respuesta completa con urgencia]."`);
  }

  if(o.extras) {
    jsonFields.push(`"extra_desc":"[Descripcion SEO completa para tienda Shopify o ecommerce — minimo 200 palabras con beneficios, para quien es, que incluye, garantia, optimizada para busquedas en ${co.name}]"`);
    jsonFields.push(`"extra_seo":"[keyword corta 1]\\n\\n[keyword de cola larga 2]\\n\\n[pregunta que busca el cliente 3]\\n\\n(continua hasta 20 keywords en español para ${co.name})"`);
  }

  if(hasChars && (o.landing || o.images)) {
    jsonFields.push(`"benefit_transform":[{"char":"[caracteristica original del producto]","benefit":"[beneficio emocional que recibe el cliente]"}]`);
  }

  if(hasImage) {
    jsonFields.push(`"vision_analysis":"[Descripcion detallada de lo que ves en la imagen: tipo de producto, colores, presentacion, empaque, percepcion de marca]"`);
    jsonFields.push(`"vision_summary":"[Resumen en una sola oracion del producto segun la imagen]"`);
  }

  const prompt = `Eres el mejor experto en copywriting persuasivo para ecommerce latinoamericano.

REGLA DE ORO: BENEFICIO siempre mayor que CARACTERISTICA. Habla de lo que el cliente GANA, EVITA o MEJORA — nunca de especificaciones tecnicas.
IDIOMA: Todo en ESPAÑOL.
SEPARACION OBLIGATORIA: Cada item, beneficio, objecion, anuncio, hook o testimonio DEBE estar separado del siguiente con una linea en blanco.

${toneDesc}

PAIS: ${co.name}. ${co.slang}
METODO DE PAGO: ${co.pay}.

PRODUCTO:
- Nombre: ${name}
- Categoria: ${category || 'general'}
- Problema: ${problem}
- Beneficio principal: ${benefit}
- Precio: ${price}${priceOld ? ` (antes ${priceOld})` : ''}${clients ? `\n- Clientes: ${clients}` : ''}${hasChars ? `\n- Caracteristicas: ${chars}` : ''}
${hasImage ? '\nANALIZA LA IMAGEN adjunta e integra lo que ves al copy.' : ''}

INSTRUCCION CRITICA: Reemplaza cada [texto entre corchetes] con contenido REAL, COMPLETO y PERSUASIVO para este producto especifico. No uses corchetes en tu respuesta.

Responde SOLO con este JSON valido sin markdown ni texto adicional:

{${jsonFields.join(',')}}`;

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
