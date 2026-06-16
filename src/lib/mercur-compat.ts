/**
 * Mercur 2.1.6 backend compatibility layer.
 *
 * This file is the COMPLETE divergence of this vendor-panel from upstream
 * `mercurjs/vendor-panel`, required to run against the WRDO Mercur 2.1.6 backend
 * (wrdo-api.medusajs.app). Four mismatches are handled here:
 *
 *   1. Auth actor — vendor routes authorize the "member" actor; the backend's
 *      "seller" auth provider issues empty-actor_id tokens. Log in as "member".
 *   2. x-seller-id — ensureSellerMiddleware requires an active seller on every
 *      /vendor/* route. The bearer-based fetch client carries no session cookie,
 *      so the seller id must travel as the x-seller-id header.
 *   3. Route drift — some routes the panel calls were renamed (e.g. /vendor/me →
 *      /vendor/members/me). Rewrite + reshape centrally.
 *   4. Missing routes — routes this backend doesn't serve return HTML 404s.
 *      Degrade a GET 404 to an empty list-shaped result so widgets render blank
 *      instead of crashing React.
 *
 * REVERSIBILITY: when the backend's "seller" auth provider is wired AND the
 * missing/renamed /vendor/* routes are added, DELETE this file and revert the
 * thin call-sites in client.ts, auth.tsx, users.tsx back to upstream.
 *
 * SMOKE CHECKLIST (run after any `git merge upstream/main` or deploy):
 *   1. Log in (vendor@wrdo.co.za) → reaches dashboard, no "Session expired".
 *   2. Sidebar renders fully (no white-screen crash).
 *   3. Notification bell opens → empty state, no crash.
 *   4. Bottom-of-sidebar footer resolves to the account (not stuck loading).
 *   5. Open a real /vendor/* page (Products / Orders) → loads.
 */

// (1) Auth actor used by all sdk.auth.* calls in this panel.
export const VENDOR_AUTH_ACTOR = "member" as const;

// (2) Active-seller storage + x-seller-id header source.
export const ACTIVE_SELLER_KEY = "wrdo_active_seller_id";

export const getActiveSellerId = (): string =>
  (typeof window !== "undefined" &&
    window.localStorage.getItem(ACTIVE_SELLER_KEY)) ||
  "";

export const setActiveSellerId = (sellerId: string): void => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_SELLER_KEY, sellerId);
  }
};

export const clearActiveSellerId = (): void => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACTIVE_SELLER_KEY);
  }
};

// (3) Route rewrites: panel path -> backend path. Path-only (no query string).
const ROUTE_REWRITES: Record<string, string> = {
  "/vendor/me": "/vendor/members/me",
};

export const rewriteVendorRoute = (url: string): string => {
  const [path, ...rest] = url.split("?");
  const rewritten = ROUTE_REWRITES[path];
  if (!rewritten) {
    return url;
  }
  return rest.length ? `${rewritten}?${rest.join("?")}` : rewritten;
};

// (3b) Reshape /vendor/members/me ({ seller_member: { member, seller } }) into
// the { member, ...member } shape useUserMe / the user-menu footer expect.
export const reshapeMe = (res: any): any => {
  const member = res?.seller_member?.member ?? res?.member ?? res;
  return { ...member, member };
};

// (4) Empty list-shaped fallback for a GET 404. InfiniteList flatMaps over
// response[<key>] and reads count/offset/limit; Medusa convention is the last
// path segment IS the response key (/vendor/notifications -> "notifications").
export const emptyListFor = (url: string): Record<string, unknown> => {
  const key =
    url.split("?")[0].split("/").filter(Boolean).pop() || "data";
  return { [key]: [], count: 0, offset: 0, limit: 0 };
};
