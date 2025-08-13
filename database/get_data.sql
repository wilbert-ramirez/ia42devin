pset format unaligned
\pset fieldsep '\n'
\pset tuples_only on

-- Generar comandos INSERT para todas las tablas
SELECT 'INSERT INTO public.user (id, username, email) VALUES (' || 
       id || ', ' || quote_literal(username) || ', ' || quote_literal(email) || ');'
FROM public.user

UNION ALL

SELECT 'INSERT INTO public.student (id, user_id, profile) VALUES (' || 
       id || ', ' || user_id || ', ' || quote_literal(profile) || ');'
FROM public.student

UNION ALL

SELECT 'INSERT INTO public.inscriptions (id, student_id, id_lx, created_at) VALUES (' || 
       id || ', ' || student_id || ', ' || id_lx || ', ' || quote_literal(created_at::text) || ');'
FROM public.inscriptions

UNION ALL

SELECT 'INSERT INTO public.lx (id, shortname, description, focus) VALUES (' || 
       id || ', ' || quote_literal(shortname) || ', ' || quote_literal(description) || ', ' || quote_literal(focus) || ');'
FROM public.lx

UNION ALL

SELECT 'INSERT INTO public.skill (id, id_lx, description) VALUES (' || 
       id || ', ' || id_lx || ', ' || quote_literal(description) || ');'
FROM public.skill

UNION ALL

SELECT 'INSERT INTO public.outcome (id, id_skill, description) VALUES (' || 
       id || ', ' || id_skill || ', ' || quote_literal(description) || ');'
FROM public.outcome

UNION ALL

SELECT 'INSERT INTO public.ld (id, id_outcome, ld_type, expected_outcome, reference) VALUES (' || 
       id || ', ' || id_outcome || ', ' || quote_literal(ld_type) || ', ' || quote_literal(expected_outcome) || ', ' || quote_literal(reference) || ');'
FROM public.ld;
