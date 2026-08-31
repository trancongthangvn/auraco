-- Press logos for the 'As Seen In' strip, self-hosted under public/images/press.
-- Replaces the placeholder text-only mentions. Safe to re-run.
BEGIN;
DELETE FROM press_mentions;

INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ('BENZINGA', '/images/press/2bd640a7-1166-47d7-aa16-0b90fcb8077a.png', 0, TRUE);
INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ('CNN', '/images/press/e57d5e7c-71b2-4046-8539-cc22e3ff23e8.png', 1, TRUE);
INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ('Lion''s Roar', '/images/press/1def32d6-f8b8-47b1-8054-837606b91b35.png', 2, TRUE);
INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ('BBC', '/images/press/9aa64128-0c56-45be-a6d6-4ab2d47a1af3.webp', 3, TRUE);
INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ('Men''s Folio', '/images/press/9ef932d8-9a88-4ae4-ba26-077db2a8d250.png', 4, TRUE);
INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ('CNA', '/images/press/32938ec6-3f32-4162-9b18-bdbbf4fe36fb.png', 5, TRUE);
INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ('The Peak', '/images/press/8a228c5e-d3fc-4ee1-8771-74365fb436e9.png', 6, TRUE);

COMMIT;
