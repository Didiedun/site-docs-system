import type { User } from "@supabase/supabase-js";

export const UTM_ACCESS_MESSAGE =
  "Akses terhad kepada akaun Google UTM @utm.my. Sila pilih akaun UTM anda.";

// UI guard only. Auth hooks, RLS and the backend enforce the same rule.
// Identity data comes from Google; user_metadata is editable and is not trusted.
export function hasUtmAccess(user: User): boolean {
  const email = user.email?.toLowerCase();
  return (
    !!email &&
    /^[^@\s]+@utm\.my$/.test(email) &&
    !!user.email_confirmed_at &&
    !user.is_anonymous &&
    !!user.identities?.some((identity) => {
      const data = identity.identity_data;
      return (
        identity.provider === "google" &&
        data?.email?.toLowerCase() === email &&
        data?.email_verified === true &&
        data?.custom_claims?.hd === "utm.my"
      );
    })
  );
}
