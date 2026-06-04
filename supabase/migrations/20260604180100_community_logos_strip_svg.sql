-- Saca image/svg+xml del whitelist del bucket community-logos.
-- Razón: bucket es público; un SVG malicioso puede embeber <script> que se ejecuta
-- al navegar la URL directa (XSS). Mantener PNG/JPG/WEBP cubre el 99% de casos
-- reales de logos sin abrir esa puerta. Los SVG ya subidos (si los hubiere) no se
-- eliminan, solo se bloquea nuevo upload.

update storage.buckets
  set allowed_mime_types = array['image/png','image/jpeg','image/webp']
  where id = 'community-logos';
