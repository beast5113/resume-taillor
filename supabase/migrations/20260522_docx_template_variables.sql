-- Add variables column to docx_templates to store extracted <<variable>> names
ALTER TABLE docx_templates
  ADD COLUMN IF NOT EXISTS variables text[] NOT NULL DEFAULT '{}';
