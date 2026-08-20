import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback (session_id in hash), skip /me check.
    // AuthCallback will exchange the session_id and set the cookie first.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  const loginWithGoogle = useCallback(() => {
    // Emergent Managed Google Auth flow:
    // 1) redirect user to auth.emergentagent.com with our callback URL
    // 2) provider redirects back to /auth/callback#session_id=xxx
    // 3) AuthCallback.jsx exchanges session_id via POST /api/auth/session
    const redirect = `${window.location.origin}/auth/callback`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, checkAuth, logout, loginWithGoogle }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
