export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  const targetPath = url.pathname.replace(/^\/api-blichat/, '') || '/';
  const targetUrl = new URL(targetPath + url.search, 'https://app.blichat.com');

  const debugHeaders = {
    "X-Diagnostic-Proxy": "Cloudflare-Function-Active",
    "X-Diagnostic-Target": targetUrl.toString(),
    "X-Diagnostic-Method": request.method,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: debugHeaders,
    });
  }

  const newHeaders = new Headers(request.headers);
  newHeaders.delete("host");
  newHeaders.delete("origin");
  newHeaders.delete("referer");

  try {
    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: (request.method !== "GET" && request.method !== "HEAD") ? await request.arrayBuffer() : null,
      redirect: "follow"
    });

    const response = await fetch(modifiedRequest);

    const responseHeaders = new Headers(response.headers);
    Object.keys(debugHeaders).forEach(k => {
        responseHeaders.set(k, debugHeaders[k]);
    });
    responseHeaders.set("X-Target-Status", response.status.toString());

    const responseBody = await response.arrayBuffer();

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Proxy Error", message: error.message }), {
      status: 500,
      headers: debugHeaders
    });
  }
}
