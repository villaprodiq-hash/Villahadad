'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ClientGalleryPage from '@/components/shared/ClientGalleryPage';

type GalleryRow = {
  id: string;
  client_name?: string | null;
  clientName?: string | null;
  session_id?: string | null;
  sessionId?: string | null;
};

type PhotoRow = {
  id: string | number;
  cloud_url?: string | null;
  cloudUrl?: string | null;
  file_name?: string | null;
  fileName?: string | null;
  uploaded_at?: string | null;
  uploadedAt?: string | null;
};

type ClientPhoto = {
  id: string;
  cloudUrl: string;
  fileName: string;
  uploadedAt?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GalleryPage() {
  const params = useParams<{ id: string }>();
  const galleryId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryRow | null>(null);
  const [photos, setPhotos] = useState<ClientPhoto[]>([]);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!galleryId) {
        if (mounted) {
          setIsNotFound(true);
          setLoading(false);
        }
        return;
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        if (mounted) {
          setHasError('Supabase environment variables are missing.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setHasError(null);

        const { data: galleryData, error: galleryError } = await supabase
          .from('galleries')
          .select('*')
          .eq('id', galleryId)
          .single();

        if (galleryError || !galleryData) {
          if (mounted) {
            setIsNotFound(true);
            setLoading(false);
          }
          return;
        }

        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('gallery_id', galleryId)
          .order('uploaded_at', { ascending: false });

        if (photosError) {
          throw photosError;
        }

        const transformedPhotos: ClientPhoto[] = ((photosData as PhotoRow[] | null) || [])
          .map((photo) => ({
            id: String(photo.id),
            cloudUrl: photo.cloud_url || photo.cloudUrl || '',
            fileName: photo.file_name || photo.fileName || `photo-${photo.id}`,
            uploadedAt: photo.uploaded_at || photo.uploadedAt || undefined,
          }))
          .filter((photo) => Boolean(photo.cloudUrl));

        if (mounted) {
          setGallery(galleryData as GalleryRow);
          setPhotos(transformedPhotos);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setHasError(error instanceof Error ? error.message : 'Failed to load gallery data.');
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [galleryId]);

  if (isNotFound) {
    notFound();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (hasError || !gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-200 px-4">
        <p className="text-sm">{hasError || 'An unknown error occurred.'}</p>
      </div>
    );
  }

  return (
    <ClientGalleryPage
      clientName={gallery.client_name || gallery.clientName || 'Client'}
      sessionId={gallery.session_id || gallery.sessionId || gallery.id}
      photos={photos}
      r2PublicUrl="https://pub-placeholder.r2.dev"
    />
  );
}
