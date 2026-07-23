import { createFileRoute } from '@tanstack/react-router';
import FeedPrestadorPage from '@/pages/FeedPrestadorPage';

export const Route = createFileRoute('/_authenticated/feed/prestador')({
  component: FeedPrestadorPage,
});
