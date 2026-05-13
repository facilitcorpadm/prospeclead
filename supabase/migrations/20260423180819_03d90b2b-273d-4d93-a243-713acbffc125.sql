-- Enum para tipo de produto
CREATE TYPE public.product_kind AS ENUM ('hardware', 'assinatura', 'pacote');

-- Tabela products
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  kind public.product_kind NOT NULL DEFAULT 'hardware',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_products_kind ON public.products(kind);
CREATE INDEX idx_products_active ON public.products(active);

-- Bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins upload product-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins update product-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins delete product-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());