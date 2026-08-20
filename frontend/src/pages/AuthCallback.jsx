import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { navigate("/login", { replace: true }); return; }
    const session_id = decodeURIComponent(match[1]);

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id });
        setUser(r.data.user);
        window.history.replaceState({}, "", "/app");
        navigate("/app", { replace: true, state: { user: r.data.user } });
      } catch (e) {
        console.error("auth exchange failed", e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08090A]">
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-[#5E6AD2] to-[#8B5CF6] pulse-ring" />
        Autenticando…
      </div>
    </div>
  );
}
