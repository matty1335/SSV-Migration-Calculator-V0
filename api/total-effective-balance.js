module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const network = req.query.network || "mainnet";
  const clusterHash = req.query.clusterHash;
  const owner = req.query.owner;

  if (!clusterHash && !owner) {
    return res.status(400).json({
      error: "Provide clusterHash or owner"
    });
  }

  const url = clusterHash
    ? `https://api.ssv.network/api/v4/${network}/clusters/${encodeURIComponent(clusterHash)}/totalEffectiveBalance`
    : `https://api.ssv.network/api/v4/${network}/accounts/${encodeURIComponent(owner)}/totalEffectiveBalance`;

  try {
    const r = await fetch(url, {
      headers: { accept: "application/json" }
    });

    const text = await r.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(r.status).json({
      ok: r.ok,
      sourceUrl: url,
      data
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: String(err),
      sourceUrl: url
    });
  }
};
