import { ShieldCheck, LogOut, LayoutDashboard, ListFilter, User } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export function Navbar() {
  const navigate = useNavigate();
  const profile = localStorage.getItem("fixxer_user_role") || "Usuário";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="border-b border-white/5 bg-[#111]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-black text-xl tracking-tighter italic uppercase text-white">FIXXER</Link>
        <div className="hidden md:flex items-center gap-4 text-white/40 text-[10px] font-bold uppercase tracking-widest">
          <Link to="/feed" className="hover:text-[#00FF87] transition-colors">Feed</Link>
          <Link to="/dashboard/lojista" className="hover:text-[#00FF87] transition-colors">Dashboard</Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <ShieldCheck className="w-4 h-4 text-[#00FF87]" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{profile}</span>
        </div>
        <button onClick={handleLogout} className="text-white/40 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
