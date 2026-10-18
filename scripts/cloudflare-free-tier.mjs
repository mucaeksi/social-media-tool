import { cfApi, listAll } from "./cloudflare-api.mjs";

export const ZERO_TRUST_LIMITS = Object.freeze({
  activeSeats: 50,
  accessApps: 500,
  identityProviders: 50,
  serviceTokens: 50,
  policiesPerApp: 1000,
});

export function requireCapacity(count, limit, resource) {
  if (count >= limit)
    throw new Error(
      `${resource} sınırına (${limit}) ulaşıldı. Yeni kaynak oluşturulmadı; ücretli plana geçilmez.`,
    );
}

export async function verifyZeroTrustFree(base) {
  const subscriptions = await listAll(`${base}/subscriptions`);
  const candidates = subscriptions.filter((subscription) => {
    const plan = subscription.rate_plan ?? {};
    return (
      /zero[\s_-]*trust|cloudflare[\s_-]*one|access|teams|gateway/i.test(
        [plan.id, plan.public_name, plan.scope, ...(plan.sets ?? [])].join(" "),
      ) &&
      !["cancelled", "expired", "failed"].includes(
        String(subscription.state).toLowerCase(),
      )
    );
  });
  if (candidates.length !== 1)
    throw new Error(
      `Zero Trust Free aboneliği kesin olarak doğrulanamadı (${candidates.length} eşleşen plan). Cloudflare One planı Free olmalı. Dağıtım durduruldu; abonelik değiştirilmedi. Planlar: ${subscriptions
        .map((s) => s.rate_plan?.public_name || s.rate_plan?.id || "tanımsız")
        .join(", ")
        .slice(0, 300)}`,
    );
  const subscription = candidates[0],
    plan = subscription.rate_plan;
  const name = [plan.id, plan.public_name].join(" ");
  const components =
    subscription.component_values ?? subscription.components ?? [];
  if (
    !/(^|[^a-z])free([^a-z]|$)/i.test(name) ||
    /trial/i.test(name) ||
    typeof subscription.price !== "number" ||
    subscription.price !== 0 ||
    /trial|awaitingpayment/i.test(subscription.state ?? "") ||
    components.some(
      (component) => typeof component.price === "number" && component.price > 0,
    )
  )
    throw new Error(
      `Zero Trust planı ücretsiz olarak doğrulanamadı (${plan.public_name || plan.id}). Ücretli veya deneme planıyla dağıtım yapılmaz; abonelik değiştirilmedi.`,
    );
  const users = await listAll(`${base}/access/users`);
  const activeSeats = users.filter(
    (user) => user.access_seat === true || user.gateway_seat === true,
  ).length;
  if (activeSeats > ZERO_TRUST_LIMITS.activeSeats)
    throw new Error(
      `Zero Trust hesabında ${activeSeats} aktif koltuk var; ücretsiz sınır ${ZERO_TRUST_LIMITS.activeSeats}. Dağıtım durduruldu. Kullanıcılar otomatik silinmez.`,
    );
  return {
    plan: plan.public_name || plan.id,
    price: 0,
    activeSeats,
    limits: ZERO_TRUST_LIMITS,
    checkedAt: new Date().toISOString(),
    seatEnforcement: "Cloudflare Free planı girişte 50 aktif koltuğu uygular",
  };
}
