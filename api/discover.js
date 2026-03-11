module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const network = req.query.network || "mainnet";
  const owner = req.query.owner;

  if (!owner) {
    return res.status(400).json({ error: "Missing owner query param" });
  }

  async function fetchPage(url) {
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

    return {
      ok: r.ok,
      status: r.status,
      statusText: r.statusText,
      data
    };
  }

  function extractClusters(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.clusters)) return payload.clusters;
    if (Array.isArray(payload?.data?.clusters)) return payload.data.clusters;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }

  function extractNextPage(payload) {
    return (
      payload?.pagination?.next ||
      payload?.pagination?.nextPage ||
      payload?.next ||
      payload?.nextPage ||
      payload?.links?.next ||
      null
    );
  }

  try {
    const pageSize = 100;
    let page = 1;
    let hasMore = true;

    const allClusters = [];
    const debug = [];

    while (hasMore) {
      const url = `https://api.ssv.network/api/v4/${network}/clusters/owner/${encodeURIComponent(owner)}?page=${page}&perPage=${pageSize}`;
      const result = await fetchPage(url);

      debug.push({
        page,
        url,
        ok: result.ok,
        status: result.status
      });

      if (!result.ok) {
        return res.status(result.status).json({
          ok: false,
          sourceUrl: url,
          data: result.data,
          debug
        });
      }

      const pageClusters = extractClusters(result.data);
      allClusters.push(...pageClusters);

      const nextPage = extractNextPage(result.data);

      if (nextPage) {
        page += 1;
        continue;
      }

      if (pageClusters.length === pageSize) {
        page += 1;
      } else {
        hasMore = false;
      }
    }

    return res.status(200).json({
      ok: true,
      sourceUrl: `https://api.ssv.network/api/v4/${network}/clusters/owner/${encodeURIComponent(owner)}`,
      data: {
        clusters: allClusters
      },
      debug
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: String(err)
    });
  }
};
