const { Octokit } = require("@octokit/rest");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const FILE_PATH    = "transactions.json";

function missingEnv() {
  if (!GITHUB_TOKEN) return "GITHUB_TOKEN not set in Vercel environment variables.";
  if (!GITHUB_OWNER) return "GITHUB_OWNER not set in Vercel environment variables.";
  if (!GITHUB_REPO)  return "GITHUB_REPO not set in Vercel environment variables.";
  return null;
}

function parseBody(body) {
  let parsed = typeof body === "string" ? JSON.parse(body) : body;
  const list = parsed && parsed.transactions;
  return Array.isArray(list) ? list : null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const envErr = missingEnv();
  if (envErr) return res.status(500).json({ error: envErr });

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // ── GET ──
  if (req.method === "GET") {
    try {
      const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: FILE_PATH });
      const transactions = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
      return res.status(200).json({ transactions });
    } catch (err) {
      if (err.status === 404) return res.status(200).json({ transactions: [] });
      return res.status(500).json({ error: `Failed to load. ${err.message}` });
    }
  }

  // ── POST ──
  if (req.method === "POST") {
    try {
      const transactions = parseBody(req.body);
      if (!transactions) return res.status(400).json({ error: "Body must be { transactions: [] }" });

      // Get current SHA for update (if file exists)
      let sha;
      try {
        const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: FILE_PATH });
        sha = data.sha;
      } catch { /* file doesn't exist yet — sha stays undefined */ }

      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
        message: "Auto-save: updated transactions",
        content: Buffer.from(JSON.stringify(transactions, null, 2)).toString("base64"),
        ...(sha && { sha }),
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: `Failed to save. ${err.message}` });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
};
