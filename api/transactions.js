const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

function safeMsg(err, fallback) {
  if (!err || !err.message) return fallback;
  const msg = String(err.message);
  return DATABASE_URL ? msg.replaceAll(DATABASE_URL, '[REDACTED]') : msg;
}

function parseBody(body) {
  let parsed = typeof body === 'string' ? (() => { try { return JSON.parse(body); } catch { return null; } })() : body;
  const list = parsed && parsed.transactions;
  return Array.isArray(list) ? list : null;
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS money_counter_state (
      id         INTEGER PRIMARY KEY,
      data       JSONB       NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.' });
  }

  const sql = neon(DATABASE_URL);

  // ── GET ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      await ensureTable(sql);
      const rows = await sql`SELECT data FROM money_counter_state WHERE id = 1`;
      let transactions = [];
      if (rows.length) {
        const val = rows[0].data;
        transactions = Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val) : []);
      }
      return res.status(200).json({ transactions });
    } catch (err) {
      return res.status(500).json({ error: `Failed to load: ${safeMsg(err, 'database error')}` });
    }
  }

  // ── POST ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const transactions = parseBody(req.body);
      if (!transactions) {
        return res.status(400).json({ error: 'Request body must be { transactions: [] }' });
      }

      await ensureTable(sql);
      await sql`
        INSERT INTO money_counter_state (id, data, updated_at)
        VALUES (1, ${JSON.stringify(transactions)}::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: `Failed to save: ${safeMsg(err, 'database error')}` });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};


function safeErrorMessage(error, fallback) {
  const raw = error && error.message ? String(error.message) : '';
  if (!raw) return fallback;

  // Prevent leaking secrets if a driver includes connection details.
  const redacted = DATABASE_URL ? raw.replaceAll(DATABASE_URL, '[REDACTED_DATABASE_URL]') : raw;
  return redacted;
}

function ensureConfig(res) {
  if (!DATABASE_URL) {
    res.status(500).json({
      error: 'Server not configured. Set DATABASE_URL.'
    });
    return false;
  }
  return true;
}

function parseTransactionsFromBody(body) {
  let parsed = body;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  const list = parsed && parsed.transactions;
  return Array.isArray(list) ? list : null;
}

function normalizeTransactions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS money_counter_state (
      id INTEGER PRIMARY KEY,
      transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

module.exports = async (req, res) => {
  if (!ensureConfig(res)) return;
  const sql = neon(DATABASE_URL);

  if (req.method === 'GET') {
    try {
      await ensureTable(sql);
      const rows = await sql`
        SELECT transactions
        FROM money_counter_state
        WHERE id = 1
      `;
      const transactions = rows.length
        ? normalizeTransactions(rows[0].transactions)
        : [];

      return res.status(200).json({ transactions });
    } catch (error) {
      return res.status(500).json({
        error: `Failed to load transactions from database. ${safeErrorMessage(error, 'Unknown database error.')}`
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const transactions = parseTransactionsFromBody(req.body);
      if (!transactions) {
        return res.status(400).json({ error: 'transactions must be an array.' });
      }

      await ensureTable(sql);
      await sql`
        INSERT INTO money_counter_state (id, transactions, updated_at)
        VALUES (1, ${JSON.stringify(transactions)}::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          transactions = EXCLUDED.transactions,
          updated_at = NOW()
      `;

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error: `Failed to save transactions to database. ${safeErrorMessage(error, 'Unknown database error.')}`
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};
