-- Fix grade constraint to allow TK/K (grade 0)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_grade_check;
ALTER TABLE public.students ADD CONSTRAINT students_grade_check CHECK (grade between 0 and 12);

-- ─── Spring Break Classes ─────────────────────────────────────────────────────
INSERT INTO public.classes (name, day_of_week, start_time, end_time, color) VALUES
  ('Bio-Engineering — TK/K',                  1, '09:00', '10:30', 'green'),
  ('Bio-Engineering — Grades 1–3',            1, '10:30', '12:00', 'green'),
  ('Cargo & Balance — TK/K',                  2, '09:00', '10:30', 'blue'),
  ('Cargo & Balance — Grades 1–3',            2, '10:30', '12:00', 'blue'),
  ('Solar Optics — TK/K',                     3, '09:00', '10:30', 'yellow'),
  ('Solar Optics — Grades 1–3',               3, '10:30', '12:00', 'yellow'),
  ('Aerodynamics & Wind Power — TK/K',        4, '09:00', '10:30', 'orange'),
  ('Aerodynamics & Wind Power — Grades 1–3',  4, '10:30', '12:00', 'orange'),
  ('Global Engineering Summit — TK/K',        5, '09:00', '10:30', 'purple'),
  ('Global Engineering Summit — Grades 1–3',  5, '10:30', '12:00', 'purple');

-- ─── Curriculum Skills (activities) ──────────────────────────────────────────
-- grade_level: 0 = TK/K,  1 = Grades 1–3
INSERT INTO public.skills (name, subject, grade_level, "order") VALUES
  ('Window Baggie Garden',                 'Bio-Engineering',            0, 1),
  ('Mini-Earth Terrarium',                 'Bio-Engineering',            1, 2),
  ('Foil Freighter',                       'Cargo & Balance',            0, 3),
  ('Bottle Boat Crane',                    'Cargo & Balance',            1, 4),
  ('Rainbow Catcher Wand',                 'Solar Optics',               0, 5),
  ('Signal Array',                         'Solar Optics',               1, 6),
  ('Puff-Mobile',                          'Aerodynamics & Wind Power',  0, 7),
  ('Hoop Glider',                          'Aerodynamics & Wind Power',  1, 8),
  ('Saving the Earth Through Engineering', 'Global Engineering Summit',  0, 9),
  ('Saving the Earth Through Engineering', 'Global Engineering Summit',  1, 10);
