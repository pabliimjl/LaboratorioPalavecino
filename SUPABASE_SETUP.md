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
- `resultados.html` consulta `public.results` filtrando por DNI + `access_code`.

## Datos requeridos para resultados

Al cargar un resultado en `public.results`, completar:
- `appointment_id`: turno del paciente
- `access_code`: codigo que se entrega al paciente
- `pdf_path`: URL publica del PDF o ruta accesible

Ejemplo de insercion:

```sql
insert into public.results (appointment_id, access_code, pdf_path, notes)
values (1, 'AB12CD34', 'https://tu-dominio.com/resultados/resultado-1.pdf', 'Perfil lipidico');
```

## Importante para produccion

- Las politicas incluidas son de demo y dejan insertar/leer/editar/borrar con rol anon.
- Para produccion, conviene:
   - limitar edicion y borrado solo a admin,
  - agregar autenticacion para personal,
  - auditar cambios.

## Si ya ejecutaste el esquema antes

Si las tablas ya estaban creadas, ejecuta nuevamente en SQL Editor el bloque de politicas para asegurar tambien:
- `anon_update_appointments` y `anon_delete_appointments`
- `anon_insert_results`, `anon_update_results` y `anon_delete_results`
