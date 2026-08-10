import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Coins, Copy, QrCode, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: any;
}

export function PixManagerModal({ open, onClose, profile }: Props) {
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState(profile?.pix_key || "");
  const [generated, setGenerated] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#1A1A1B] border border-white/10 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black text-white uppercase italic tracking-tight">Gerenciamento PIX</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-2">Chave PIX Cadastrada</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-white">{pixKey || "Não cadastrada"}</span>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(pixKey, "Chave")}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Valor do Recebimento (R$)</label>
            <input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white"
            />
            <Button className="w-full bg-primary" onClick={() => setGenerated(true)}>Gerar QR Code</Button>
          </div>

          {generated && (
            <div className="flex flex-col items-center gap-4 border-t border-white/10 pt-6">
              <div className="w-48 h-48 bg-white p-2 rounded-xl flex items-center justify-center">
                <QrCode className="w-full h-full text-black" />
              </div>
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] font-mono truncate mr-2">pix.copia-e-cola-exemplo-codigo...</span>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard("exemplo", "Código")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
