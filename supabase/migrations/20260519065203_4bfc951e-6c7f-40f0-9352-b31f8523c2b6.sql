ALTER TABLE public.style_boards
  ADD CONSTRAINT style_boards_inquiry_id_fkey
  FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id) ON DELETE CASCADE;