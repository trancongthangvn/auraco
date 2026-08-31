-- Attach the six shoppable-video clips shown on the reference site's
-- `.home-video-slider` to their products. Files are self-hosted under
-- public/videos/products/ (downloaded from the client's live site).
UPDATE products SET video_url = v.url FROM (VALUES
  ('Square-Pearl-Baya-Pendant-Necklace',      '/videos/products/ca05d05f-b2be-430b-85fd-10baadd643f0.mp4'),
  ('The-Timeless-Green-Stone-Locket-Necklace','/videos/products/a82cc165-848a-41f1-a811-d3ed7acfd660.mp4'),
  ('The-Emerald-Tide-Station-Bracelet',       '/videos/products/af828eb8-7796-447a-87a1-acfe4900b418.mp4'),
  ('The-Solstice-Pyramid-Stone-Hoops',        '/videos/products/00a7361e-1866-4b68-b438-b84d6b563404.mp4'),
  ('Heritage-Triple-Ridge-Huggies',           '/videos/products/2a4ae3be-bfa9-4bb9-b295-ffb5e3f3f067.mp4'),
  ('Dot-Chain-Necklace',                      '/videos/products/0732bf89-8eab-42e0-a1cd-295fedb62885.mp4')
) AS v(slug, url) WHERE products.slug = v.slug;
