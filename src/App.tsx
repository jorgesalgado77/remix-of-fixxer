import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { Toaster } from "sonner";

// Placeholder para o dashboard enquanto não migramos as outras telas
const DashboardPlaceholder = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6">
      <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Dashboard Operacional</h1>
      <p className="text-sm text-gray-400 leading-relaxed">Sua conta está ativa. O painel completo está sendo carregado...</p>
      <button 
        onClick={() => {
          localStorage.clear();
          window.location.href = '/';
        }}
        className="w-full bg-red-500/20 text-red-500 font-bold py-4 rounded-xl transition-all hover:bg-red-500/30 active:scale-95"
      >
        Sair do Sistema
      </button>
    </div>
  </div>
);

const AdminPlaceholder = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6">
      <h1 className="text-2xl font-black text-[#00FF87] uppercase italic tracking-tighter">Admin Master Panel</h1>
      <p className="text-sm text-gray-400 leading-relaxed">Bem-vindo, Administrador. Acesso total liberado.</p>
      <button 
        onClick={() => {
          localStorage.clear();
          window.location.href = '/';
        }}
        className="w-full bg-red-500/20 text-red-500 font-bold py-4 rounded-xl transition-all hover:bg-red-500/30 active:scale-95"
      >
        Sair do Sistema
      </button>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        
        {/* Rotas Protegidas (Simulação inicial) */}
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
        <Route path="/admin" element={<AdminPlaceholder />} />
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}
