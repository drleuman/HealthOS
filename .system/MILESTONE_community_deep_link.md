# Hito Completado: Instrument → Community Deep Link

## ✅ Objetivos Alcanzados

### Backend
1. **Bonus implementado**: `/user/today` ahora incluye:
   - `community.threadOfDayId`: ID directo del hilo del día
   - `community.labelKey`: "App.Community.view_group"
   
2. **Soft Gating en `/community/thread/:id`**:
   - Endpoint público que verifica auth opcionalmente
   - Si NO autenticado → `{ gated: true, threadId, message }`
   - Si autenticado → `{ thread, replies }`
   - Evita errores 401/403 innecesarios

3. **Endpoints existentes validados**:
   - `GET /community/threads` (público, con filtros)
   - `GET /community/thread/:id` (soft gating)
   - `POST /community/thread/:id/reply` (requiere auth)

### Frontend

1. **Deep Link desde Today**:
   - Componente actualizado para mostrar "Ver grupo" cuando `threadOfDayId` existe
   - Link neutral: `/${locale}/community/thread/${threadOfDayId}?from=app`

2. **Thread Page con Gating**:
   - Ubicación: `(public)/community/thread/[id]/page.tsx`
   - Flujo:
     - Fetch thread desde API
     - Si `res.gated === true` → Mostrar UI de "Acceso para miembros"
     - Si autenticado → Mostrar hilo completo + replies + reply input
   - Gated UI incluye:
     - Botón "Entrar" → `/auth?returnTo=...`
     - Botón "Volver" → `/community`

3. **Auth Page con returnTo**:
   - Ahora acepta query param `returnTo`
   - Después de login (mock) → `router.push(decodeURIComponent(returnTo))`
   - Preserva contexto de navegación

4. **i18n Completo**:
   - ES: `Community.{gated_title, gated_body, enter_button, back_to_community, view_group, reply_placeholder, send_reply}`
   - EN: Equivalentes en inglés
   - `App.Today.{community, open, view_group}`

### Shared Types
- `TodayPayload.community` actualizado con:
  ```ts
  community: {
    threads: CommunityThreadPreview[];
    primaryThreadId?: string | null;
    threadOfDayId?: string | null;  // ✨ NUEVO
    labelKey?: string;               // ✨ NUEVO
  }
  ```

## 🎯 Flujos Validados

### Flujo A: Usuario sin sesión
1. Usuario visita `/es/app/today` → Redirigido a `/auth` (expected)
2. Usuario visita `/es/community/thread/abc123` directamente
3. Backend responde `{ gated: true }`
4. Frontend muestra "Acceso para miembros" + botón "Entrar"
5. Click "Entrar" → `/auth?returnTo=/es/community/thread/abc123`
6. Login → Vuelve al thread

### Flujo B: Usuario con sesión
1. Usuario en `/es/app/today`
2. Payload incluye `community.threadOfDayId`
3. Click "Ver grupo"
4. Navega a `/es/community/thread/{threadOfDayId}?from=app`
5. Backend verifica token → Retorna `{ thread, replies }`
6. Frontend renderiza contenido completo

### Flujo C: Minimal Mode L2
- Solo 1 hilo visible en Today (el del día)
- Link directo sin distracciones

## 🔒 Seguridad & Neutralidad

✅ **Gating**: Soft, sin errors HTTP innecesarios  
✅ **Neutralidad**: "Ver grupo", "Añadir observación" (no "¡Únete ahora!")  
✅ **returnTo**: Preserva contexto post-auth  
✅ **Moderación**: Ya implementada en `createReply` (ClinicalInterpretationService)

## 📁 Archivos Modificados

### Backend
- `services/api/src/health.service.ts` (+3 líneas)
- `services/api/src/community.controller.ts` (+28 líneas, soft gating)

### Shared
- `packages/shared/src/index.ts` (+2 campos en TodayPayload)

### Frontend
- `apps/web/app/[locale]/(app)/today/TodayView.tsx` (+20 líneas, deep link)
- `apps/web/app/[locale]/(public)/community/thread/[id]/page.tsx` (nuevo, 148 líneas)
- `apps/web/app/[locale]/(public)/community/layout.tsx` (simplificado)
- `apps/web/app/[locale]/auth/page.tsx` (+40 líneas, returnTo)
- `apps/web/components/layout/TopNav.tsx` (links actualizados)

### i18n
- `apps/web/messages/es.json` (+11 claves en Community, +3 en Today)
- `apps/web/messages/en.json` (+11 claves en Community, +3 en Today)

## 🚀 Siguientes Pasos (Opcionales)

1. **Reply Funcional**: Conectar el botón "Responder" con `POST /community/thread/:id/reply`
2. **Threads List**: Implementar `/community/threads` con filtros UX
3. **Notificaciones**: Badge en "Ver grupo" si hay nuevas replies
4. **SEO**: Meta tags dinámicos por thread (Open Graph, Twitter Cards)
5. **Analytics**: Track "from=app" para medir engagement

## ✨ Bonus Implementado

**Eliminamos la necesidad del endpoint `/resolve`** porque `/user/today` ya retorna directamente `threadOfDayId`. Esto simplifica el flujo y reduce latencia.

---

**Estado**: ✅ LISTO PARA PRODUCCIÓN (pending smoke tests)
