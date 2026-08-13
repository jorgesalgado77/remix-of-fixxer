import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, 
  Save, 
  Image as ImageIcon, 
  FileText, 
  Video, 
  Layers,
  Info
} from 'lucide-react';
import { AIAssistantButton } from './AIAssistantButton';
import { toast } from 'sonner';

interface ProductFormData {
  title: string;
  description_short: string;
  description: string;
  category: 'ebook' | 'video' | 'course';
  price: number;
}

interface CreatorProductFormProps {
  onClose: () => void;
  onSave: (data: ProductFormData) => void;
  initialData?: Partial<ProductFormData>;
}

export function CreatorProductForm({ onClose, onSave, initialData }: CreatorProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    title: initialData?.title || '',
    description_short: initialData?.description_short || '',
    description: initialData?.description || '',
    category: initialData?.category || 'ebook',
    price: initialData?.price || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("O título é obrigatório");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              {initialData ? 'Editar Produto' : 'Novo Info Produto'}
            </h2>
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Configure os detalhes do seu conteúdo digital</p>
          </div>
        </div>
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onClose}
          className="rounded-full w-10 h-10 p-0 text-muted-foreground hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LADO ESQUERDO: INFO BÁSICA */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                Título do Produto
                <Info className="w-3 h-3" />
              </label>
              <AIAssistantButton 
                type="title" 
                context={{ currentValue: formData.title, category: formData.category }}
                onAccept={(val: string) => setFormData((prev: ProductFormData) => ({ ...prev, title: val }))}
              />
            </div>
            <Input 
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: ProductFormData) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: O Guia Definitivo do Fixxer"
              className="bg-white/5 border-white/10 rounded-2xl h-14 text-white font-bold"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Descrição Curta</label>
              <AIAssistantButton 
                type="description_short" 
                context={{ title: formData.title, category: formData.category }}
                onAccept={(val: string) => setFormData((prev: ProductFormData) => ({ ...prev, description_short: val }))}
              />
            </div>
            <Textarea 
              value={formData.description_short}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev: ProductFormData) => ({ ...prev, description_short: e.target.value }))}
              placeholder="Um resumo de 1-2 frases para o card do marketplace."
              className="bg-white/5 border-white/10 rounded-2xl min-h-[80px] text-white"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Descrição Completa</label>
              <AIAssistantButton 
                type="description" 
                context={{ title: formData.title, shortDesc: formData.description_short }}
                onAccept={(val: string) => setFormData((prev: ProductFormData) => ({ ...prev, description: val }))}
              />
            </div>
            <Textarea 
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev: ProductFormData) => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhe todo o valor que seu produto entrega."
              className="bg-white/5 border-white/10 rounded-2xl min-h-[160px] text-white"
            />
          </div>
        </div>

        {/* LADO DIREITO: CONFIG E PREÇO */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tipo de Conteúdo</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'ebook', label: 'E-Book', icon: <FileText className="w-4 h-4" /> },
                { id: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
                { id: 'course', label: 'Curso', icon: <Layers className="w-4 h-4" /> }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData((prev: ProductFormData) => ({ ...prev, category: cat.id as any }))}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 ${
                    formData.category === cat.id 
                      ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(0,255,135,0.1)]' 
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {cat.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Preço de Venda (BRL)</label>
              <AIAssistantButton 
                type="price_recommendation" 
                context={{ title: formData.title, category: formData.category }}
                onAccept={(val: string) => {
                  const match = val.match(/\d+/);
                  if (match) setFormData((prev: ProductFormData) => ({ ...prev, price: parseInt(match[0]) }));
                }}
                label="Sugestão de Preço"
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
              <Input 
                type="number"
                value={formData.price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: ProductFormData) => ({ ...prev, price: parseFloat(e.target.value) }))}
                className="bg-white/5 border-white/10 rounded-2xl h-14 pl-12 text-white font-black text-xl italic"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Capa do Produto</label>
            <div className="aspect-video rounded-3xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-3 group cursor-pointer hover:bg-white/10 transition-all hover:border-primary/50">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Upload da Capa (16:9)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-8 border-t border-white/10">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onClose}
          className="font-black uppercase tracking-widest text-xs h-12 px-8 rounded-2xl"
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          className="bg-primary text-primary-foreground font-black px-10 h-12 rounded-2xl shadow-[0_0_25px_rgba(0,255,135,0.4)] hover:scale-105 transition-all uppercase tracking-widest text-xs gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Produto
        </Button>
      </div>
    </form>
  );
}