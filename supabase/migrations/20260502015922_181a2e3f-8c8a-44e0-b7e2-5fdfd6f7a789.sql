
ALTER VIEW public.scraped_products_canonical SET (security_invoker = true);
ALTER VIEW public.scraped_product_images_canonical SET (security_invoker = true);
ALTER VIEW public.llm_reextract_candidates_canonical SET (security_invoker = true);
