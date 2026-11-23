-- ═══════════════════════════════════════════════════════════════════════
--  HexNinja — 003: images in chat (paste a screenshot with Ctrl+V)
--  Run once in Supabase → SQL Editor. Safe to re-run.
--  Images live in the private Storage bucket "chat-images" and are only
--  served through the app to people in that conversation.
-- ═══════════════════════════════════════════════════════════════════════

begin;

alter table public.chat_messages add column if not exists image_path text;

-- Text is optional when the message carries an image.
alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages drop constraint if exists chat_messages_body_or_image_check;
alter table public.chat_messages
  add constraint chat_messages_body_or_image_check
  check (char_length(body) <= 4000 and (char_length(body) >= 1 or image_path is not null));

commit;
