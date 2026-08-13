import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { FixxerPlayer } from '@/components/info-products/FixxerPlayer';
import { supabaseExternal } from '@/lib/supabaseExternal';
import { toast } from 'sonner';

export const Route = createFileRoute('/info/$id/aula/$lessonId')({
  component: LessonPage,
});

function LessonPage() {
  const { id: productId, lessonId } = Route.useParams();
  const [lesson, setLesson] = useState<any>(null);

  useEffect(() => {
    // Carregar dados da aula e progresso
    async function fetchLesson() {
      const { data } = await supabaseExternal
        .from('info_product_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      setLesson(data);
    }
    fetchLesson();
  }, [lessonId]);

  if (!lesson) return <div>Carregando aula...</div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-black text-white">{lesson.title}</h1>
      <FixxerPlayer 
        productId={productId}
        filePath={lesson.video_url} 
        onProgress={(s) => console.log('Progresso:', s)} 
      />
    </div>
  );
}
