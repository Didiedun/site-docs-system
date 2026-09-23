import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../infrastructure/supabase/client";
import { hasUtmAccess, UTM_ACCESS_MESSAGE } from "./utmAccess";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string;
  retry: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthCtx | null>(null);

function callbackError(): string {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const params = hash.has("error") ? hash : query;
  if (!params.has("error")) return "";
  const denied = params
    .get("error_description")
    ?.includes("UTM_ACCOUNT_REQUIRED");
  // Do not display arbitrary callback text or leave it in the address bar.
  for (const key of ["error", "error_code", "error_description"])
    query.delete(key);
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (query.size ? `?${query}` : ""),
  );
  return denied
    ? UTM_ACCESS_MESSAGE
    : "Log masuk tidak selesai. Sila cuba semula dan pilih akaun Google UTM anda.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const callbackFailure = callbackError();
    if (callbackFailure) setError(callbackFailure);
    let active = true;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const validate = async (candidate: Session | null, ticket: number) => {
      const current = () => active && ticket === revision;
      if (!current()) return;
      if (!candidate) {
        setSession(null);
        setLoading(false);
        return;
      }
      try {
        const { data, error: failure } = await supabase.auth.getUser(
          candidate.access_token,
        );
        if (!current()) return;
        if (failure || !data.user) throw failure || new Error("Missing user");
        if (!hasUtmAccess(data.user)) {
          setSession(null);
          setError(UTM_ACCESS_MESSAGE);
          setLoading(false);
          await supabase.auth.signOut({ scope: "local" });
          return;
        }
        setSession({ ...candidate, user: data.user });
        setError("");
        setLoading(false);
      } catch {
        if (!current()) return;
        setSession(null);
        setError(
          "Sesi tidak dapat disahkan. Semak sambungan dan cuba lagi, atau log masuk semula.",
        );
        setLoading(false);
      }
    };
    const schedule = (candidate: Session | null) => {
      const ticket = ++revision;
      clearTimeout(timer);
      // Supabase auth callbacks hold a lock: validate outside the callback.
      timer = setTimeout(() => void validate(candidate, ticket), 0);
    };
    setLoading(true);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, candidate) => {
      setSession((previous) =>
        previous && candidate && previous.user.id === candidate.user.id
          ? previous
          : null,
      );
      schedule(candidate);
    });
    const initialRevision = revision;
    supabase.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!active || revision !== initialRevision) return;
        if (failure) {
          setError("Sesi tidak dapat dimuatkan. Sila log masuk semula.");
          setLoading(false);
        } else schedule(data.session);
      })
      .catch(() => {
        if (active && revision === initialRevision) {
          setError("Sambungan log masuk tidak tersedia. Sila cuba lagi.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
      revision++;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [attempt]);

  async function signIn() {
    setError("");
    const { error: failure } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "openid email profile",
        redirectTo: window.location.origin,
        queryParams: { hd: "utm.my", prompt: "select_account" },
      },
    });
    if (failure) throw failure;
  }
  async function signOut() {
    const { error: failure } = await supabase.auth.signOut({ scope: "local" });
    if (failure) {
      setError("Log keluar tidak berjaya. Sila cuba lagi.");
      return;
    }
    setSession(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        error,
        retry: () => setAttempt((n) => n + 1),
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
