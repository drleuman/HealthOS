# ✅ Iteración F2 Complete: Onboarding Wizard

## Resumen Ejecutivo

**Objetivo**: Wizard de 5 pasos que captura datos y llama a `POST /assessment`  
**Estado**: ✅ **COMPLETADO**  
**Tiempo**: ~1 hora  

---

## Entregables

### 1. Onboarding Wizard ✅
**Ruta**: `/app/onboarding`  
**Archivo**: `app/app/onboarding/page.tsx`

**Features**:
- ✅ 5 pasos con progress bar
- ✅ Paso 1: Objetivo principal (required)
- ✅ Paso 2: Problemas de sueño (optional)
- ✅ Paso 3: Horarios (bedtime, caffeine, dinner)
- ✅ Paso 4: Síntomas (optional)
- ✅ Paso 5: Limitaciones (optional)
- ✅ Submit a `POST /assessment`
- ✅ Track `onboarding_completed` event
- ✅ Redirect a `/app/today` al completar
- ✅ Navegación adelante/atrás
- ✅ Validación por paso
- ✅ Loading state
- ✅ Error handling

### 2. Smart Login Redirect ✅
**Actualización**: `app/app/login/page.tsx`

**Logic**:
```typescript
// After login:
try {
  await api.getToday();
  // Has program → /app/today
} catch {
  // No program → /app/onboarding
}
```

### 3. TypeScript Path Alias ✅
**Actualización**: `tsconfig.json`

**Added**:
```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

---

## Estructura del Wizard

### Paso 1: Objetivo Principal (Required)
**Opciones**:
- 😴 Mejorar sueño
- ⚡ Más energía
- 🥗 Mejor digestión
- ⚖️ Control de peso
- 🧘 Reducir estrés
- 🎯 Rendimiento

**UI**: Grid 2x3 con emojis

### Paso 2: Problemas de Sueño (Optional)
**Opciones** (multi-select):
- Dificultad para dormir
- Despertares nocturnos
- Despertar temprano
- Sueño no reparador

**UI**: Lista de checkboxes

### Paso 3: Horarios (Required)
**Campos**:
- ¿A qué hora te acuestas? (time input)
- ¿A qué hora tomas café? (time input)
- ¿A qué hora cenas? (time input)

**Defaults**:
- Bedtime: 23:00
- Caffeine: 08:00
- Dinner: 20:00

### Paso 4: Síntomas (Optional)
**Opciones** (multi-select):
- Fatiga crónica
- Niebla mental
- Ansiedad
- Cambios de humor
- Problemas digestivos
- Dolores de cabeza

### Paso 5: Limitaciones (Optional)
**Opciones** (multi-select):
- Trabajo nocturno
- Niños pequeños
- Viajes frecuentes
- Horarios irregulares

---

## API Integration

### POST /assessment
**Endpoint**: `http://localhost:4000/assessment`

**Request**:
```json
{
  "primary_goal": "sleep",
  "sleep_issue_type": ["Dificultad para dormir"],
  "bedtime": "23:00",
  "caffeine_time": "08:00",
  "dinner_time": "20:00",
  "symptoms": ["Fatiga crónica", "Niebla mental"],
  "constraints": ["Horarios irregulares"]
}
```

**Response**:
```json
{
  "profile_type": "circadian_dysregulation",
  "program_id": "circadian_reset_14",
  "starting_day": 1,
  "daily_time_minutes": 15,
  "priority_actions": ["get_light_10min", "avoid_caffeine_after_2pm"]
}
```

### POST /events
**Event Tracked**: `onboarding_completed`

**Payload**:
```json
{
  "event": "onboarding_completed",
  "userId": "current",
  "context": {
    "goal": "sleep",
    "symptoms_count": 2,
    "constraints_count": 1
  },
  "meta": {
    "platform": "web",
    "version": "1.0.0"
  }
}
```

---

## User Flow

```
1. User logs in → POST /auth/login
2. Check if has program → GET /user/today
   - Success → Redirect to /app/today
   - Error → Redirect to /app/onboarding
3. User completes wizard → POST /assessment
4. Track event → POST /events (onboarding_completed)
5. Redirect to /app/today
```

---

## Cómo Probar

### Test Completo: Nuevo Usuario

1. **Login**:
   ```
   http://localhost:3001/app/login
   Email: newuser@example.com
   ```

2. **Esperado**: Redirect a `/app/onboarding`

3. **Paso 1**: Seleccionar "Mejorar sueño"

4. **Paso 2**: Seleccionar "Dificultad para dormir"

5. **Paso 3**: Ajustar horarios (o dejar defaults)

6. **Paso 4**: Seleccionar síntomas (opcional)

7. **Paso 5**: Seleccionar limitaciones (opcional)

8. **Click "Comenzar"**

9. **Esperado**: 
   - Loading state: "Creando tu plan..."
   - POST a `/assessment`
   - Event tracked: `onboarding_completed`
   - Redirect a `/app/today`

### Test: Usuario Existente

1. **Login**:
   ```
   Email: existing@example.com
   ```

2. **Esperado**: Redirect directo a `/app/today` (sin onboarding)

### Verificar Event Tracking

```bash
# Check events in database
curl http://localhost:4000/events/analytics/activation

# Or check database directly
psql -U healthos healthos -c "SELECT * FROM \"Event\" WHERE event = 'onboarding_completed' ORDER BY timestamp DESC LIMIT 5;"
```

---

## Validación por Paso

### Paso 1
- ✅ Required: `primary_goal` must be selected
- ❌ Cannot continue without selection

### Paso 2
- ✅ Optional: Can skip

### Paso 3
- ✅ Required: All time inputs must have values
- ✅ Defaults provided

### Paso 4
- ✅ Optional: Can skip

### Paso 5
- ✅ Optional: Can skip

---

## UX Features

### Progress Bar
- Visual indicator: 0% → 20% → 40% → 60% → 80% → 100%
- Smooth transition animation

### Navigation
- **Atrás**: Available on steps 2-5
- **Continuar**: Available when step is valid
- **Comenzar**: Final step (step 5)

### Loading States
- Button text changes: "Comenzar" → "Creando tu plan..."
- Button disabled during submission
- No navigation during loading

### Error Handling
- API errors shown below form
- Non-blocking: User can retry
- Clear error messages

---

## Archivos Modificados/Creados

### Nuevos
1. `app/app/onboarding/page.tsx` - Wizard completo

### Modificados
1. `app/app/login/page.tsx` - Smart redirect logic
2. `tsconfig.json` - Path alias @/*

---

## Checklist de Verificación

### ✅ Funcionalidad
- [x] Wizard de 5 pasos funciona
- [x] Navegación adelante/atrás
- [x] Validación por paso
- [x] Submit a POST /assessment
- [x] Track onboarding_completed
- [x] Redirect a /app/today
- [x] Smart login redirect (new vs existing user)

### ✅ UX
- [x] Progress bar visual
- [x] Loading states
- [x] Error messages
- [x] Mobile-responsive
- [x] Una acción principal por paso

### ✅ Datos
- [x] Todos los campos de AssessmentInput capturados
- [x] Defaults sensatos (horarios)
- [x] Optional fields manejados correctamente

---

## Decisiones de Diseño

### ¿Por qué 5 pasos?
- **Pro**: No abruma al usuario
- **Pro**: Cada paso tiene un propósito claro
- **Con**: Más clicks
- **Decisión**: Mejor UX que un formulario largo

### ¿Por qué defaults en horarios?
- **Pro**: Usuario puede completar rápido
- **Pro**: Valores sensatos para mayoría
- **Decisión**: Reduce fricción en onboarding

### ¿Por qué check después de login?
- **Pro**: Usuarios existentes no ven onboarding
- **Pro**: Nuevos usuarios van directo a onboarding
- **Con**: Una llamada extra al API
- **Decisión**: Vale la pena para mejor UX

---

## Próximos Pasos

### Iteración F3: Today Page
**Objetivo**: Mostrar tareas del día y permitir completar

**Tareas**:
1. Call `GET /user/today`
2. Mostrar tareas
3. Botón "Hecho" → `POST /user/day-log`
4. Track `day_started`, `action_marked_done`, `day_completed`
5. Redirect a `/app/route` después de completar

**Estimado**: 1-2 horas

---

## Troubleshooting

### Error: "Cannot find module '@/lib/api'"
```bash
# Restart TypeScript server
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Error: "Assessment failed"
```bash
# Verify API is running
curl http://localhost:4000/health

# Check assessment endpoint
curl -X POST http://localhost:4000/assessment \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"primary_goal":"sleep","bedtime":"23:00","caffeine_time":"08:00","dinner_time":"20:00"}'
```

### Event not tracked
```bash
# Check events endpoint
curl -X POST http://localhost:4000/events \
  -H "Content-Type: application/json" \
  -d '{"event":"test","context":{}}'

# Verify in database
psql -U healthos healthos -c "SELECT COUNT(*) FROM \"Event\";"
```

---

## Métricas

- **Archivos creados**: 1
- **Archivos modificados**: 2
- **Líneas de código**: ~450
- **Tiempo de desarrollo**: 1 hora
- **Endpoints integrados**: 2 (`POST /assessment`, `POST /events`)
- **Pasos del wizard**: 5
- **Campos capturados**: 7

---

## ✅ Estado: LISTO PARA ITERACIÓN F3

**Frontend MVP Iteración F2 completada exitosamente.**

- Onboarding wizard funcional
- Smart login redirect
- Event tracking integrado
- Todos los datos de assessment capturados

**Siguiente**: Implementar Today page con completar acción (F3)
