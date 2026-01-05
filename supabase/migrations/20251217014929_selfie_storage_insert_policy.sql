-- Allow authenticated users to upload selfies only into their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE polname = 'Users can upload their own selfies'
      AND schemaname = 'storage'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload their own selfies"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'selfie-verifications'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
