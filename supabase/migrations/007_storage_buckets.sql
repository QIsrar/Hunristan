-- Create submissions bucket for Hackathon file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;


-- Allow anyone to read files from the submissions bucket
CREATE POLICY "Public Read Access for Submissions"
ON storage.objects FOR SELECT
USING ( bucket_id = 'submissions' );

-- Allow authenticated users to upload files to the submissions bucket
CREATE POLICY "Auth Upload Access for Submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'submissions' );

-- Allow users to update their own files
CREATE POLICY "Auth Update Access for Submissions"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'submissions' AND auth.uid() = owner );

-- Allow users to delete their own files
CREATE POLICY "Auth Delete Access for Submissions"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'submissions' AND auth.uid() = owner );
