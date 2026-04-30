-- Plume — Seed Data (development only)
-- Creates sample data for testing

-- Sample brand voice
INSERT INTO brand_voices (id, user_id, name, tone, rhythm, preferred_expressions, forbidden_expressions, style_rules, good_examples, bad_examples)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- replace with actual user ID
  'Expert Stratégique',
  'Direct, concret, expert, sans jargon',
  'Phrases courtes. Paragraphes courts. Un point par paragraphe.',
  '["En pratique", "Concrètement", "Ce que ça change pour vous", "Voici comment"]',
  '["Révolutionnaire", "Game-changer", "Incroyable", "Vous allez adorer", "Synergies"]',
  'Commencer par le problème, pas la solution. Données avant opinions. CTA clair et unique.',
  'Vous perdez 3h par semaine sur des tâches que l''IA peut faire en 3 minutes. Voici le système.',
  'L''intelligence artificielle est une révolution incroyable qui va transformer votre business de manière game-changing.'
) ON CONFLICT DO NOTHING;
