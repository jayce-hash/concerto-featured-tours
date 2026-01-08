export async function handler(event) {
  const attractionId = event.queryStringParameters?.attractionId;
  if (!attractionId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing attractionId" }) };
  }

  const apiKey = process.env.TM_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "TM_API_KEY missing in env" }) };
  }

  const base = "https://app.ticketmaster.com/discovery/v2/events.json";

  // We page until done, sorted soonest, pulling a large size per page
  const size = 200;
  let page = 0;
  let out = null;
  let all = [];

  try {
    while (true) {
      const url = new URL(base);
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("attractionId", attractionId);
      url.searchParams.set("sort", "date,asc");
      url.searchParams.set("size", String(size));
      url.searchParams.set("page", String(page));

      const res = await fetch(url.toString());
      const json = await res.json();

      // Keep first response shell so app.js can read _embedded.events consistently
      if (!out) out = json;

      const events = json?._embedded?.events || [];
      all.push(...events);

      const totalPages = json?.page?.totalPages ?? 0;
      if (page >= totalPages - 1) break;
      page += 1;
    }

    // Return a merged shape: {_embedded:{events:[...]}}
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ _embedded: { events: all } })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
