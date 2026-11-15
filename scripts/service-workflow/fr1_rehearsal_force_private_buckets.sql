-- Run on LOCAL restore target AFTER importing production dump / storage metadata.
-- Intentional difference from production (prod buckets currently public=true).
-- Prevents restored metadata from exposing copied files via public URLs.
BEGIN;
UPDATE storage.buckets
SET public = false
WHERE id IN ('ticket-attachments', 'machine-photos', 'profile-thumbnails');

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('ticket-attachments', 'ticket-attachments', false),
  ('machine-photos', 'machine-photos', false),
  ('profile-thumbnails', 'profile-thumbnails', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

SELECT id, public AS is_public FROM storage.buckets
WHERE id IN ('ticket-attachments', 'machine-photos', 'profile-thumbnails')
ORDER BY 1;
COMMIT;
