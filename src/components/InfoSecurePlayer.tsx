import { useState, useEffect } from 'react';
import { getSecureInfoUrl } from '@/lib/info-storage.server';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Lock } from 'lucide-react';
import { FixxerPlayer } from './info-products/FixxerPlayer';
import { InfoPdfReader } from './info-products/InfoPdfReader';

interface InfoSecurePlayerProps {
  productId: string;
  filePath: string;
  type: 'video' | 'pdf';
  title?: string;
  className?: string;
  allowDownload?: boolean;
}

/**
 * Player/Viewer Seguro para Info Produtos.
 * Centraliza a lógica de acesso e delega para players específicos.
 */
export function InfoSecurePlayer({ 
  productId, 
  filePath, 
  type, 
  title, 
  className,
  allowDownload = false
}: InfoSecurePlayerProps) {
  if (type === 'video') {
    return (
      <div className={className}>
        <FixxerPlayer 
          productId={productId}
          filePath={filePath}
          title={title}
        />
      </div>
    );
  }

  if (type === 'pdf') {
    return (
      <InfoPdfReader 
        productId={productId}
        filePath={filePath}
        title={title}
        className={className}
        allowDownload={allowDownload}
      />
    );
  }

  return null;
}
