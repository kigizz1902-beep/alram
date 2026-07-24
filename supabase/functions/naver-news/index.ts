import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let keyword: unknown;
  let count: unknown;
  try {
    const body = await req.json();
    keyword = body?.keyword;
    count = body?.count;
  } catch {
    return jsonResponse({ error: "keyword is required" }, 400);
  }

  if (typeof keyword !== "string" || keyword.trim() === "") {
    return jsonResponse({ error: "keyword is required" }, 400);
  }

  const display =
    typeof count === "number" && Number.isInteger(count) && count > 0 && count <= 100
      ? count
      : 5;

  const clientId = Deno.env.get("NAVER_CLIENT_ID");
  const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return jsonResponse({ error: "Naver API request failed" }, 500);
  }

  const naverUrl = new URL("https://openapi.naver.com/v1/search/news.json");
  naverUrl.searchParams.set("query", keyword);
  naverUrl.searchParams.set("display", String(display));
  naverUrl.searchParams.set("sort", "date");

  try {
    const naverRes = await fetch(naverUrl, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!naverRes.ok) {
      return jsonResponse({ error: "Naver API request failed" }, 500);
    }

    const data = await naverRes.json();
    return jsonResponse(data, 200);
  } catch {
    return jsonResponse({ error: "Naver API request failed" }, 500);
  }
});
