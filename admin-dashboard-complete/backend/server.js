require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const PORT = process.env.PORT || 4000;

if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
  console.warn('Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate JWT for admin user
 */
function signJwt(payload){
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function verifyJwt(token){
  try{
    return jwt.verify(token, JWT_SECRET);
  }catch(e){
    return null;
  }
}

/**
 * Middleware to protect routes
 */
function requireAdmin(req, res, next){
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  const decoded = verifyJwt(token);
  if(!decoded || !decoded.email || decoded.email !== ADMIN_EMAIL) return res.status(401).json({ error: 'Unauthorized' });
  req.admin = decoded;
  next();
}

/**
 * Admin login - checks email and password (bcrypt hash)
 * Returns JWT on success.
 */
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({ error: 'Email and password required' });

  if(email !== ADMIN_EMAIL){
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if(!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signJwt({ email });
  res.json({ token, expiresIn: 8 * 60 * 60 });
});

/**
 * GET /api/admin/stats - example stats
 */
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try{
    // count leads by status
    const { data: openCount } = await supabase.rpc('count_leads_by_status', { status_input: 'open' }).catch(()=>({data:null}));
    // fallback simple query
    const { count } = await supabase.from('leads').select('id', { count: 'exact' });
    res.json({ totalLeads: count || 0 });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/admin/leads - returns latest leads
 */
app.get('/api/admin/leads', requireAdmin, async (req, res) => {
  try{
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100);
    if(error) throw error;
    res.json({ leads: data });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/admin/assign - assign lead to contractor
 * body: { leadId, contractorId, contractorName }
 */
app.post('/api/admin/assign', requireAdmin, async (req, res) => {
  const { leadId, contractorId, contractorName } = req.body;
  if(!leadId || !contractorId) return res.status(400).json({ error: 'leadId and contractorId required' });
  try{
    const { data, error } = await supabase.from('leads').update({
      assigned_to: contractorId,
      status: 'assigned'
    }).eq('id', leadId).select().single();
    if(error) throw error;
    res.json({ ok: true, lead: data });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Admin backend running on port ${PORT}`);
});
