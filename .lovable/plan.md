# Plano - INFO PRODUTOS PROMPT 07 - FIXXER Secure Player & Progresso

Implementação do player de vídeo seguro com gestão de progresso e navegação por módulos/aulas.

## 1. Banco de Dados (Supabase Externo)
Criar a tabela `info_product_progress` para persistir o avanço do usuário.

```sql
CREATE TABLE public.info_product_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.info_products(id) ON DELETE CASCADE NOT NULL,
    lesson_id uuid REFERENCES public.info_product_lessons(id) ON DELETE CASCADE NOT NULL,
    last_position_seconds integer DEFAULT 0,
    is_completed boolean DEFAULT false,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE ON public.info_product_progress TO authenticated;
GRANT ALL ON public.info_product_progress TO service_role;

ALTER TABLE public.info_product_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress"
ON public.info_product_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id);
```

## 2. Componentes e UI
- **FIXXER Player (`src/components/info-products/FixxerPlayer.tsx`)**:
  - Baseado em HTML5 Video nativo (otimizado para mobile).
  - Custom UI: Play/Pause, Volume, Progresso, Fullscreen, Velocidade (0.5x a 2x).
  - Watermark visual discreto com ID do usuário (proteção V1).
  - Próxima/Anterior integrados.
- **Navegação de Curso (`src/components/info-products/CourseCurriculum.tsx`)**:
  - Lista de módulos colapsável.
  - Indicadores de conclusão por aula.
- **Página de Aula (`src/routes/info.$id.aula.$lessonId.tsx`)**:
  - Layout focado no conteúdo.
  - Sidebar ou drawer (mobile) para currículo.

## 3. Lógica de Persistência
- **Sincronização de Progresso (`src/lib/info-products/progress-service.ts`)**:
  - Função `updateProgress` com debounce de 10-15 segundos.
  - Salvar obrigatoriamente no evento `ended` do vídeo.
  - Recuperar `last_position_seconds` ao carregar a aula.

## 4. Otimização Realme C55
- **Lazy Loading**: Não carregar o componente de vídeo até a interação ou visibilidade.
- **Preload**: Definido como `metadata` para economizar banda e CPU.
- **Memory Management**: Limpeza de referências de vídeo ao trocar de aula.

## 5. Auditoria
- Criar `docs/FIXXER_INFO_PRODUCTS_PROMPT_07_AUDIT.md`.
- Testar troca rápida de aulas.
- Verificar persistência pós-refresh.
