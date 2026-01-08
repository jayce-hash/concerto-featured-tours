// netlify/functions/tm-events.js
exports.handler = async (event) => {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing TICKETMASTER_API_KEY env var" }) };
    }

    const qs = event.queryStringParameters || {};
    const attractionId = qs.attractionId;
    const keyword = qs.keyword; // optional fallback
    const size = 200;

    if (!attractionId && !keyword) {
      return { statusCode: 400, body: JSON.stringify({ error: "Provide attractionId or keyword" }) };
    }

    // Pull ALL pages
    let page = 0;
    let totalPages = 1;
    const all = [];

    while (page < totalPages) {
      const params = new URLSearchParams();
      params.set("apikey", apiKey);
      params.set("size", String(size));
      params.set("page", String(page));

      if (attractionId) params.set("attractionId", attractionId);
      if (keyword) params.set("keyword", keyword);

      // NOTE: Not setting countryCode so it can return US/CA/etc when available
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;

      const res = await fetch(url);
      const json = await res.json();

      const events = json?._embedded?.events || [];
      all.push(...events);

      totalPages = Number(json?.page?.totalPages || 1);
      page += 1;

      // safety break
      if (page > 50) break;
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      },
      body: JSON.stringify({ events: all })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
