import { createFileRoute } from '@tanstack/react-router';
import FeedLojistaPage from '@/components/pages/FeedLojistaPage';
import { validateAdFilterSearch } from '@/lib/ad-filter-search';

export const Route = createFileRoute('/_authenticated/feed/lojista')({
  validateSearch: validateAdFilterSearch,
  component: FeedLojistaPage,
});
