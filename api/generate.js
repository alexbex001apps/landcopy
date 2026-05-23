
import https from 'https';

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

  const { name, problem, benefit, price, priceOld, clients, chars, category, country, tone, image, imageMime } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const co = countryData[country] || countryData.general;
  const hasImage = !!image;
  const hasChars = !!(chars && chars.trim());

  const prompt = `Eres experto en copywriting para ecommerce latinoamericano. REGLAS: Todo en ESPAÑOL. Beneficio siempre mayor que caracteristica. Cada item separado por linea en blanco.${hasImage ? ' ANALIZA LA IMAGEN adjunta e integra lo que ves.' : ''}

Producto: ${name} | Problema: ${problem} | Beneficio: ${benefit} | Precio: ${price}${priceOld ? ` (antes ${priceOld})` : ''}${clients ? ` | Clientes: ${clients}` : ''}${hasChars ? ` | Caracteristicas: ${chars}` : ''} | Pais: ${co.name} | Tono: ${tone} | Pago: ${co.pay}

Responde SOLO con JSON valido sin markdown. Usa \\n\\n para separar cada item dentro de los campos:

{"landing_trust_bar":"🚚 ENVIOS A TODO ${co.name} | ⭐ +CLIENTES SATISFECHOS | 💳 PAGAS AL RECIBIR | ✅ GARANTIA","landing_hero":"titular potente\\n\\nsubtitular\\n\\nbeneficio rapido","landing_problem":"titular empatico\\n\\n❌ sintoma 1\\n\\n❌ sintoma 2\\n\\n❌ sintoma 3\\n\\n❌ sintoma 4\\n\\n❌ sintoma 5\\n\\n❌ sintoma 6","landing_solution":"storytelling completo minimo 120 palabras","landing_benefits":"✅ beneficio 1\\n\\n✅ beneficio 2\\n\\n✅ beneficio 3\\n\\n✅ beneficio 4\\n\\n✅ beneficio 5\\n\\n✅ beneficio 6","landing_testimonials":"⭐⭐⭐⭐⭐\\n\\"testimonio 1 completo con historia\\"\\n— Nombre, Ciudad\\n\\n⭐⭐⭐⭐⭐\\n\\"testimonio 2 completo\\"\\n— Nombre, Ciudad\\n\\n⭐⭐⭐⭐⭐\\n\\"testimonio 3 completo\\"\\n— Nombre, Ciudad","landing_uses":"✅ uso ideal 1\\n\\n✅ uso ideal 2\\n\\n✅ uso ideal 3\\n\\n✅ uso ideal 4\\n\\n✅ uso ideal 5\\n\\n✅ uso ideal 6","landing_whats_included":"✅ item 1\\n\\n✅ item 2\\n\\n✅ item 3\\n\\n✅ item 4\\n\\n✅ item 5","landing_faq":"¿Pregunta 1?\\nRespuesta completa 1.\\n\\n¿Pregunta 2?\\nRespuesta completa 2.\\n\\n¿Pregunta 3?\\nRespuesta completa 3.\\n\\n¿Pregunta 4?\\nRespuesta completa 4.\\n\\n¿Pregunta 5?\\nRespuesta completa 5.\\n\\n¿Pregunta 6?\\nRespuesta completa 6.","landing_cta":"CTA urgente con precio garantia y boton de accion","wa_cold":"mensaje contacto frio 6 lineas empaticas","wa_followup":"seguimiento con urgencia 8 lineas","wa_close":"cierre con escasez y garantia 8 lineas","social_post":"post completo Instagram con emojis minimo 100 palabras","social_tiktok":"[0-3s] gancho\\n\\n[3-10s] problema\\n\\n[10-20s] solucion\\n\\n[20-30s] CTA","social_hashtags":"#hashtag1\\n\\n#hashtag2\\n\\n#hashtag3\\n\\n#hashtag4\\n\\n#hashtag5\\n\\n(25 hashtags en español)","meta_campaign":"Objetivo:\\n\\nAudiencia detallada:\\n\\nPresupuesto sugerido:\\n\\nEstructura de campana:","meta_ads":"ANUNCIO 1 — Dolor\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 2 — Beneficio\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 3 — Testimonial\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 4 — Urgencia\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...\\n\\nANUNCIO 5 — Precio\\nTITULAR: ...\\nDESCRIPCION: ...\\nCTA: ...","ad_hooks":"1. hook\\n\\n2. hook\\n\\n3. hook\\n\\n4. hook\\n\\n5. hook\\n\\n6. hook\\n\\n7. hook\\n\\n8. hook\\n\\n9. hook\\n\\n10. hook","image_prompts":"1. escena 1\\n\\n2. escena 2\\n\\n3. escena 3\\n\\n4. escena 4\\n\\n5. escena 5","image_overlay":"Texto 1\\n\\nTexto 2\\n\\nTexto 3\\n\\nTexto 4\\n\\nTexto 5\\n\\nTexto 6\\n\\nTexto 7\\n\\nTexto 8\\n\\nTexto 9\\n\\nTexto 10","ugc_ideas":"IDEA 1\\nPerfil: ...\\nGuion: ...\\n\\nIDEA 2\\nPerfil: ...\\nGuion: ...\\n\\nIDEA 3\\nPerfil: ...\\nGuion: ...\\n\\nIDEA 4\\nPerfil: ...\\nGuion: ...\\n\\nIDEA 5\\nPerfil: ...\\nGuion: ...","extra_email":"Asunto: ...\\n\\nCuerpo completo minimo 150 palabras con historia beneficios y CTA","extra_objeciones":"Objecion: el precio es alto.\\nRespuesta: respuesta completa.\\n\\nObjecion: no confio en el producto.\\nRespuesta: respuesta completa.\\n\\nObjecion: ya probe otras cosas.\\nRespuesta: respuesta completa.\\n\\nObjecion: no creo que me llegue.\\nRespuesta: respuesta completa.\\n\\nObjecion: mi caso es diferente.\\nRespuesta: respuesta completa.\\n\\nObjecion: lo voy a pensar.\\nRespuesta: respuesta completa.","extra_desc":"descripcion SEO completa minimo 150 palabras","extra_seo":"keyword 1\\n\\nkeyword 2\\n\\nkeyword 3\\n\\n(20 keywords en español)"${hasChars ? `,"benefit_transform":[{"char":"caracteristica","benefit":"beneficio emocional"}]` : ''}${hasImage ? `,"vision_analysis":"descripcion detallada de la imagen del producto","vision_summary":"resumen en una oracion"` : ''}}`;

  try {
    const messages = hasImage
      ? [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${imageMime};base64,${image}`, detail: 'low' } },
          { type: 'text', text: prompt }
        ]}]
      : [{ role: 'user', content: prompt }];

    const result = await callOpenAI(process.env.OPENAI_API_KEY, {
      model: 'gpt-4o-mini',
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
