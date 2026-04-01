# Setup rapido de Supabase

1. Crear proyecto en Supabase.
2. Ir a SQL Editor y ejecutar el contenido de `supabase-schema.sql`.
3. Ir a Project Settings > API y copiar:
   - Project URL
   - anon public key
4. Editar `supabase-config.js` y reemplazar:
   - TU_SUPABASE_URL
   - TU_SUPABASE_ANON_KEY
5. Publicar los archivos en GitHub Pages.

## Como funciona

- `turnos.html` guarda siempre en localStorage como respaldo.
- Si Supabase esta configurado, tambien inserta en `public.appointments`.
- `turnos-reservados.html` intenta leer desde Supabase.
- Si no hay config o falla la conexion, usa localStorage.

## Importante para produccion

- Las politicas incluidas son de demo y dejan insertar/leer/borrar con rol anon.
- Para produccion, conviene:
  - limitar borrado solo a admin,
  - agregar autenticacion para personal,
  - auditar cambios.
