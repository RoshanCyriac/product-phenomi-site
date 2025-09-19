import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(morgan('tiny'));
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false });

async function ensureSchema() {
  await pool.query(`
    create extension if not exists pgcrypto;
    create table if not exists orders (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      name text not null,
      email text not null,
      phone text not null,
      address1 text not null,
      address2 text,
      city text not null,
      state text not null,
      country text not null,
      pin text not null,
      qty integer not null,
      unit_price_cents integer not null,
      total_cents integer not null,
      user_agent text,
      ip text
    );
  `);
}

ensureSchema().catch((e) => {
  console.error('Schema init failed', e);
  process.exit(1);
});

function sanitizeString(v) { return String(v || '').trim(); }
function validateEmail(v) { return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v); }
function validatePhone(v) { return /^\+?[0-9 ()-]{7,15}$/.test(String(v).trim()); }
function validatePin(pin, country) {
  const p = String(pin || '').trim();
  switch (country) {
    case 'IN': return /^\d{6}$/.test(p);
    case 'US': return /^\d{5}(-\d{4})?$/.test(p);
    case 'GB': return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(p);
    case 'CA': return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(p);
    case 'AU': return /^\d{4}$/.test(p);
    case 'SG': return /^\d{6}$/.test(p);
    default: return p.length >= 3;
  }
}

app.post('/api/orders', async (req, res) => {
  try {
    const PRICE_CENTS = Number(process.env.PRICE_CENTS || 14900);
    const {
      name, email, phone, address1, address2 = '', city, state, country, pin, qty
    } = req.body || {};

    const clean = {
      name: sanitizeString(name),
      email: sanitizeString(email).toLowerCase(),
      phone: sanitizeString(phone),
      address1: sanitizeString(address1),
      address2: sanitizeString(address2),
      city: sanitizeString(city),
      state: sanitizeString(state),
      country: sanitizeString(country),
      pin: sanitizeString(pin),
      qty: Number(qty || 1)
    };

    const errors = {};
    if (!clean.name) errors.name = 'Name is required';
    if (!validateEmail(clean.email)) errors.email = 'Invalid email';
    if (!validatePhone(clean.phone)) errors.phone = 'Invalid phone';
    if (clean.address1.length < 4) errors.address1 = 'Address line 1 required';
    if (!clean.city) errors.city = 'City required';
    if (!clean.state) errors.state = 'State required';
    if (!clean.country) errors.country = 'Country required';
    if (!validatePin(clean.pin, clean.country)) errors.pin = 'Invalid postal code';
    if (!(clean.qty >= 1 && clean.qty <= 10)) errors.qty = 'Quantity 1–10';

    if (Object.keys(errors).length) {
      return res.status(422).json({ ok: false, errors });
    }

    const totalCents = PRICE_CENTS * clean.qty;
    const ua = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || '';

    const sql = `insert into orders (name,email,phone,address1,address2,city,state,country,pin,qty,unit_price_cents,total_cents,user_agent,ip)
                 values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                 returning id, created_at`;
    const vals = [clean.name, clean.email, clean.phone, clean.address1, clean.address2, clean.city, clean.state, clean.country, clean.pin, clean.qty, PRICE_CENTS, totalCents, ua, ip];
    const { rows } = await pool.query(sql, vals);

    return res.json({ ok: true, id: rows[0].id, created_at: rows[0].created_at, total_cents: totalCents });
  } catch (err) {
    console.error('Order insert failed', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// DB health check
app.get('/api/health/db', async (req, res) => {
  try {
    const { rows } = await pool.query('select now() as now, version() as version');
    res.json({ ok: true, now: rows[0].now, version: rows[0].version });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Serve static files (landing) from current directory
app.use(express.static(__dirname));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});


