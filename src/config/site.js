export const CANONICAL_SITE_URL = (
  import.meta.env?.VITE_PUBLIC_SITE_URL || "https://callofdoodie.wtf/"
).replace(/\/?$/, "/");

export const CANONICAL_SITE_HOST = new URL(CANONICAL_SITE_URL).host;
