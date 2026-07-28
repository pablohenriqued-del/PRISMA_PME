import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import AppShell from "@/layouts/AppShell";
import Dashboard from "@/pages/Dashboard";
import CRM from "@/pages/CRM";
import WhatsAppInbox from "@/pages/WhatsApp";
import Projetos from "@/pages/Projetos";
import Financeiro from "@/pages/Financeiro";
import Documentos from "@/pages/Documentos";
import Automacoes from "@/pages/Automacoes";
import Team from "@/pages/Team";

function AppRouter() {
  const location = useLocation();
  // Handle session_id in URL fragment synchronously (before ProtectedRoute)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="crm" element={<CRM />} />
        <Route path="whatsapp" element={<WhatsAppInbox />} />
        <Route path="projetos" element={<Projetos />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="automacoes" element={<Automacoes />} />
        <Route path="equipe" element={<Team />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
