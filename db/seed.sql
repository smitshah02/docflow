-- Demo data. Safe to re-run (ON CONFLICT DO NOTHING).
-- Fixed ids so the demo users are identifiable and stable across environments.

INSERT INTO users (id, name, email) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Alice',   'alice@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'Bob',     'bob@example.com'),
  ('00000000-0000-4000-8000-000000000003', 'Charlie', 'charlie@example.com')
ON CONFLICT DO NOTHING;

-- The "Welcome to DocFlow" onboarding content is a static page (app/welcome/page.tsx), not a database row.
-- Earlier versions of this seed inserted it as an Alice-owned document shared with Bob. This removes exactly
-- that seeded row (fixed id + title + owner, still unedited); its document_shares rows go with it (ON DELETE CASCADE).
-- Documents with any other id, or one that has been edited since seeding, are never touched.
DELETE FROM documents
WHERE id = '00000000-0000-4000-8000-0000000000d1'
  AND title = 'Welcome to DocFlow'
  AND owner_id = '00000000-0000-4000-8000-000000000001'
  AND created_at = updated_at;
