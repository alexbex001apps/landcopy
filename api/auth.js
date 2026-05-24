import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, password } = req.body;

  try {
    // REGISTRO
    if (action === 'register') {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) return res.status(400).json({ error: error.message });

      // Crear registro en tabla users
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        plan: 'basico',
        generaciones_usadas: 0,
        generaciones_limite: 30
      });

      return res.status(200).json({ success: true, user: data.user });
    }

    // LOGIN
    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) return res.status(400).json({ error: error.message });

      // Traer datos del plan
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return res.status(200).json({
        success: true,
        session: data.session,
        user: userData
      });
    }

    // VERIFICAR sesión activa
    if (action === 'verify') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token' });

      const { data, error } = await supabase.auth.getUser(token);
      if (error) return res.status(401).json({ error: 'Invalid token' });

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return res.status(200).json({ success: true, user: userData });
    }

    return res.status(400).json({ error: 'Action not recognized' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
