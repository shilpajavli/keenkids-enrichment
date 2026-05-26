-- ─── Insert Students ─────────────────────────────────────────────────────────
-- grade: 0 = TK/K, 1 = 1st, 2 = 2nd, 3 = 3rd
INSERT INTO public.students (first_name, last_name, grade) VALUES
  ('David',     'Liu',       0),
  ('Ahana',     'Jain',      0),
  ('Jeeva',     'Gandhi',    0),
  ('Maira',     'Ram',       0),
  ('Mahathi',   'Arun',      0),
  ('Shekinah',  'Tan',       0),
  ('Neel',      'Nagarmat',  0),
  ('Vishwa',    'Sarvesh',   1),
  ('Kairav',    'Rao',       2),
  ('Seraphina', 'Tan',       2),
  ('Varad',     'Madabusi',  3),
  ('Neil',      'Dalal',     3);

-- ─── Enroll TK/K students in all TK/K classes ────────────────────────────────
INSERT INTO public.enrollments (student_id, class_id)
SELECT s.id, c.id
FROM public.students s
CROSS JOIN public.classes c
WHERE s.grade = 0
  AND c.name LIKE '%TK/K%';

-- ─── Enroll Grade 1–3 students in all Grade 1–3 classes ──────────────────────
INSERT INTO public.enrollments (student_id, class_id)
SELECT s.id, c.id
FROM public.students s
CROSS JOIN public.classes c
WHERE s.grade BETWEEN 1 AND 3
  AND c.name LIKE '%Grades 1%';

-- ─── Assign curriculum skills to TK/K students ───────────────────────────────
INSERT INTO public.student_skills (student_id, skill_id)
SELECT s.id, sk.id
FROM public.students s
CROSS JOIN public.skills sk
WHERE s.grade = 0
  AND sk.grade_level = 0;

-- ─── Assign curriculum skills to Grade 1–3 students ──────────────────────────
INSERT INTO public.student_skills (student_id, skill_id)
SELECT s.id, sk.id
FROM public.students s
CROSS JOIN public.skills sk
WHERE s.grade BETWEEN 1 AND 3
  AND sk.grade_level = 1;
