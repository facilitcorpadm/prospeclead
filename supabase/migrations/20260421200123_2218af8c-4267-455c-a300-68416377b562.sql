-- 1) Bucket privado para fotos de placa
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-photos', 'lead-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2) RLS no storage.objects: cada usuário só mexe na própria pasta {auth.uid()}/...
CREATE POLICY "Lead photos select own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lead-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lead photos insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lead-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lead photos update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lead-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lead photos delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lead-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3) Novas colunas na tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS captured_at timestamptz;