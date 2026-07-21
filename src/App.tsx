import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { FeedPage, AdminPage, LojistaPage, PrestadorPage, ParceiroPage, ClientePage } from "./pages/DashboardPages";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard/lojista" element={<LojistaPage />} />
        <Route path="/dashboard/prestador" element={<PrestadorPage />} />
        <Route path="/dashboard/parceiro" element={<ParceiroPage />} />
        <Route path="/dashboard/cliente" element={<ClientePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
