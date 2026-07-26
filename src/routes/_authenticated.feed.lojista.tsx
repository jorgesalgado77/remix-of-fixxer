import { createFileRoute } from '@tanstack/react-router';
import FeedLojistaPage from '@/components/pages/FeedLojistaPage';

export const Route = createFileRoute('/_authenticated/feed/lojista')({
  component: FeedLojistaPage,
});
