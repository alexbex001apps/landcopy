export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Falta configurar OPENAI_API_KEY en Vercel"
      });
    }

    const {
      nombreProducto,
      problema,
      beneficio,
      precio,
      categoria,
      pais
    } = req.body;

    const prompt = `
Genera una landing page corta para este producto:

Producto: ${nombreProducto}
Problema: ${problema}
Beneficio: ${beneficio}
Precio: ${precio}
Categoría: ${categoria}
País: ${pais}

Devuelve:
- título atractivo
- descripción corta
- 3 beneficios
- llamado a la acción
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    return res.status(200).json({
      resultado: data.choices?.[0]?.message?.content || "Sin respuesta"
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
