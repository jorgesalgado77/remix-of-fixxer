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
  Info,
  HelpCircle,
  Hash,
  ListFilter,
  Megaphone
} from 'lucide-react';
import { AIAssistantButton } from './AIAssistantButton';
import { toast } from 'sonner';

interface ProductFormData {
  title: string;
  description_short: string;
  description: string;
  category: 'ebook' | 'video' | 'course';
  price: number;
  structure: string;
  faq: string;
  tags: string;
  sales_copy: string;
}

interface CreatorProductFormProps {
  onClose: () => void;
  onSave: (data: ProductFormData) => void;
  initialData?: Partial<ProductFormData>;
}

export function CreatorProductForm({ onClose, onSave, initialData }: CreatorProductFormProps) {
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'content' | 'marketing'>('basic');
  const [formData, setFormData] = useState<ProductFormData>({
    title: initialData?.title || '',
    description_short: initialData?.description_short || '',
    description: initialData?.description || '',
    category: initialData?.category || 'ebook',
    price: initialData?.price || 0,
    structure: initialData?.structure || '',
    faq: initialData?.faq || '',
    tags: initialData?.tags || '',
    sales_copy: initialData?.sales_copy || '',
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
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
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

      {/* TABS DO FORMULÁRIO */}
      <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {[
          { id: 'basic', label: 'Básico', icon: <Info className="w-4 h-4" /> },
          { id: 'content', label: 'Estrutura', icon: <ListFilter className="w-4 h-4" /> },
          { id: 'marketing', label: 'Vendas', icon: <Megaphone className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFormTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
              activeFormTab === tab.id 
                ? 'bg-primary text-primary-foreground shadow-lg' 
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* COLUNA PRINCIPAL (FORMULÁRIO) */}
        <div className="md:col-span-2 space-y-6">
          {activeFormTab === 'basic' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Título do Produto
                    <Info className="w-3 h-3" />
                  </label>
                  <AIAssistantButton 
                    type="title" 
                    context={{ currentValue: formData.title, category: formData.category }}
                    onAccept={(val) => setFormData(prev => ({ ...prev, title: val }))}
                  />
                </div>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: O Guia Definitivo do Fixxer"
                  className="bg-white/5 border-white/10 rounded-2xl h-14 text-white font-bold"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Descrição Curta</label>
                  <AIAssistantButton 
                    type="description_short" 
                    context={{ title: formData.title, category: formData.category, currentValue: formData.description_short }}
                    onAccept={(val) => setFormData(prev => ({ ...prev, description_short: val }))}
                  />
                </div>
                <Textarea 
                  value={formData.description_short}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_short: e.target.value }))}
                  placeholder="Um resumo de 1-2 frases para o card do marketplace."
                  className="bg-white/5 border-white/10 rounded-2xl min-h-[80px] text-white"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Descrição Completa</label>
                  <AIAssistantButton 
                    type="description" 
                    context={{ title: formData.title, shortDesc: formData.description_short, currentValue: formData.description }}
                    onAccept={(val) => setFormData(prev => ({ ...prev, description: val }))}
                  />
                </div>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhe todo o valor que seu produto entrega."
                  className="bg-white/5 border-white/10 rounded-2xl min-h-[160px] text-white"
                />
              </div>
            </div>
          )}

          {activeFormTab === 'content' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Estrutura do Curso / Módulos
                    <HelpCircle className="w-3 h-3" />
                  </label>
                  <AIAssistantButton 
                    type="course_structure" 
                    context={{ title: formData.title, category: formData.category, currentValue: formData.structure }}
                    onAccept={(val) => setFormData(prev => ({ ...prev, structure: val }))}
                  />
                </div>
                <Textarea 
                  value={formData.structure}
                  onChange={(e) => setFormData(prev => ({ ...prev, structure: e.target.value }))}
                  placeholder="Liste os módulos e aulas que compõem seu produto."
                  className="bg-white/5 border-white/10 rounded-2xl min-h-[200px] text-white"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Perguntas Frequentes (FAQ)
                  </label>
                  <AIAssistantButton 
                    type="faq" 
                    context={{ title: formData.title, currentValue: formData.faq }}
                    onAccept={(val) => setFormData(prev => ({ ...prev, faq: val }))}
                  />
                </div>
                <Textarea 
                  value={formData.faq}
                  onChange={(e) => setFormData(prev => ({ ...prev, faq: e.target.value }))}
                  placeholder="Dúvidas comuns que seus clientes podem ter."
                  className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] text-white"
                />
              </div>
            </div>
          )}

          {activeFormTab === 'marketing' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Texto de Vendas (Copywriting)
                  </label>
                  <AIAssistantButton 
                    type="sales_copy" 
                    context={{ title: formData.title, description: formData.description, currentValue: formData.sales_copy }}
                    onAccept={(val) => setFormData(prev => ({ ...prev, sales_copy: val }))}
                    showComparison={true}
                    label="Gerar Copy Persuasiva"
                  />
                </div>
                <Textarea 
                  value={formData.sales_copy}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_copy: e.target.value }))}
                  placeholder="O texto que convence o cliente a comprar."
                  className="bg-white/5 border-white/10 rounded-2xl min-h-[250px] text-white border-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      Tags / SEO
                      <Hash className="w-3 h-3" />
                    </label>
                    <AIAssistantButton 
                      type="tags" 
                      context={{ title: formData.title, category: formData.category, currentValue: formData.tags }}
                      onAccept={(val) => setFormData(prev => ({ ...prev, tags: val }))}
                    />
                  </div>
                  <Input 
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="Palavras-chave separadas por vírgula"
                    className="bg-white/5 border-white/10 rounded-2xl h-12 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      Categoria Recomendada
                    </label>
                    <AIAssistantButton 
                      type="category" 
                      context={{ title: formData.title, description: formData.description }}
                      onAccept={(val) => toast.info(`Sugestão de Categoria: ${val}`)}
                    />
                  </div>
                  <Input 
                    disabled
                    value={formData.category === 'ebook' ? 'E-Book' : formData.category === 'video' ? 'Vídeo' : 'Curso'}
                    className="bg-white/5 border-white/10 rounded-2xl h-12 text-muted-foreground opacity-50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA LATERAL (CONFIGS RÁPIDAS) */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tipo de Conteúdo</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ebook', label: 'E-Book', icon: <FileText className="w-4 h-4" /> },
                  { id: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
                  { id: 'course', label: 'Curso', icon: <Layers className="w-4 h-4" /> }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.id as any }))}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5 ${
                      formData.category === cat.id 
                        ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(0,255,135,0.1)]' 
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {cat.icon}
                    <span className="text-[8px] font-black uppercase tracking-widest">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Preço de Venda</label>
                <AIAssistantButton 
                  type="price_recommendation" 
                  context={{ title: formData.title, category: formData.category }}
                  onAccept={(val) => {
                    const match = val.match(/\d+/);
                    if (match) setFormData(prev => ({ ...prev, price: parseInt(match[0]) }));
                  }}
                  label="Precificar"
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                <Input 
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
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
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Upload Capa</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <p className="text-[9px] text-primary font-bold uppercase leading-relaxed text-center">
              DICA: USE OS BOTÕES DE ✨ IA PARA GERAR SUGESTÕES DE ALTA CONVERSÃO PARA SEU PRODUTO.
            </p>
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