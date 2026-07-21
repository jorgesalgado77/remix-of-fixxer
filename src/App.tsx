import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { Toaster } from "@/components/ui/sonner";

// Placeholder para o dashboard enquanto não migramos as outras telas
const DashboardPlaceholder = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Dashboard Operational</h1>
      <p className="text-gray-400">Em desenvolvimento...</p>
      <button 
        onClick={() => {
          localStorage.clear();
          window.location.href = '/';
        }}
        className="mt-6 px-4 py-2 bg-red-500 rounded-lg text-sm"
      >
        Sair
      </button>
    </div>
  </div>
);

const AdminPlaceholder = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4 text-[#00FF87]">Admin Master Panel</h1>
      <p className="text-gray-400">Em desenvolvimento...</p>
      <button 
        onClick={() => {
          localStorage.clear();
          window.location.href = '/';
        }}
        className="mt-6 px-4 py-2 bg-red-500 rounded-lg text-sm"
      >
        Sair
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
      <Toaster />
    </BrowserRouter>
  );
}
