import { createRemoteJWKSet, jwtVerify } from "jose";

const keySets = new Map();
export async function authenticate(request, env) {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    local &&
    env.APP_ENV === "development" &&
    env.LOCAL_AUTH_BYPASS === "true"
  )
    return { email: "yerel-gelistirme", local: true };
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN))
    return null;
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(issuer, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "aud", "iss", "sub"],
    });
    return payload;
  } catch {
    return null;
  }
}
