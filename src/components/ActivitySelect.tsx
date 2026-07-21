import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActivityBranches } from "@/hooks/use-activity-branches";

interface ActivitySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ActivitySelect({ value, onChange }: ActivitySelectProps) {
  const { branches, addBranch } = useActivityBranches();
  const [isOther, setIsOther] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  const handleSelect = (val: string) => {
    if (val === "Outro") {
      setIsOther(true);
      onChange("");
    } else {
      setIsOther(false);
      onChange(val);
    }
  };

  const handleOtherSubmit = async () => {
    if (otherValue.trim()) {
      await addBranch(otherValue.trim());
      onChange(otherValue.trim());
      setIsOther(false);
      setOtherValue("");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Ramo de Atividade *</Label>
      {!isOther ? (
        <Select value={branches.includes(value) ? value : (value ? "Outro" : "")} onValueChange={handleSelect}>
          <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all">
            <SelectValue placeholder="Selecione o ramo..." />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1B] border-white/10 z-[100]">
            {branches.map(b => (
              <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
            ))}
            <SelectItem value="Outro" className="text-xs font-bold text-primary">Outro...</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2">
          <Input 
            autoFocus
            placeholder="Digite o novo ramo..." 
            value={otherValue}
            onChange={(e) => setOtherValue(e.target.value)}
            className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50"
            onKeyDown={(e) => e.key === 'Enter' && handleOtherSubmit()}
          />
          <button 
            onClick={handleOtherSubmit}
            className="px-4 bg-primary text-black rounded-xl font-bold text-xs"
          >
            Add
          </button>
          <button 
            onClick={() => setIsOther(false)}
            className="px-4 bg-white/5 text-white rounded-xl font-bold text-xs"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
