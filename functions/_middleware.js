const CANONICAL_HOST = "callofdoodie.wtf";
const REDIRECT_HOSTS = new Set([
  "www.callofdoodie.wtf",
  "playcallofdoodie.com",
  "www.playcallofdoodie.com",
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
