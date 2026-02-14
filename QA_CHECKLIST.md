# QA Checklist & Verification Guide

## 1. Environment Setup
- [ ] Backend running (`docker-compose up -d` + `pnpm dev:api`)
- [ ] Frontend running (`pnpm dev:web`)
- [ ] Database accessible

## 2. "Therapeutic Loop" Verification

### A. Login & Onboarding
- [ ] **Navigate to `/app/login`**
  - [ ] Enter valid email
  - [ ] Click "Continuar"
  - [ ] Verify redirect to `/app/onboarding` (if new user) OR `/app/today` (if existing)

- [ ] **Onboarding Wizard**
  - [ ] Step 1: Select "Mejorar sueño"
  - [ ] Step 2: Select any sleep issue
  - [ ] Step 3: Enter times (23:00, 14:00, 20:00)
  - [ ] Step 4: Skip symptoms (optional)
  - [ ] Step 5: Skip constraints (optional)
  - [ ] Click "Comenzar"
  - [ ] **Verify**: Redirects to `/app/today`
  - [ ] **Verify DB**: `Event` table has `onboarding_completed` event

### B. Daily View (Today)
- [ ] **Load `/app/today`**
  - [ ] Verify "Día 1" (or current day) is shown
  - [ ] Verify "TU FOCO DE HOY" lists tasks
  - [ ] **Visual Check**: "Hecho ✅" button is sticky at bottom
  - [ ] **Visual Check**: Tool banner (if any) is above footer

- [ ] **Tool Interaction** (if tool banner visible)
  - [ ] Click "Ver Herramienta"
  - [ ] Verify new tab opens
  - [ ] **Verify DB**: `Event` table has `tool_opened_store` event

- [ ] **Complete Day**
  - [ ] Click "Hecho ✅"
  - [ ] Button shows "Guardando..."
  - [ ] Verify redirect to `/app/route`

### C. Route View
- [ ] **Load `/app/route`**
  - [ ] Verify progress bar increased
  - [ ] Verify current day is marked as "done" (or next day is current)
  - [ ] Click "Continuar" -> Redirects back to `/app/today`

## 3. Failure Scenarios (Manual Test)

### Scenario A: API Offline (500/Network Error)
1. **Action**: Stop backend server (Ctrl+C)
2. **Test**: Refresh `/app/today`
3. **Expected**:
   - Loading spinner appears initially
   - Error message appears: "No se pudo cargar tu plan de hoy."
   - "Reintentar" button is visible
4. **Recovery**: Start backend, click "Reintentar" -> Loads successfully

### Scenario B: Session Expired (401)
1. **Action**: Manually clear `localStorage.removeItem('healthos_token')` in console
2. **Test**: Refresh `/app/today`
3. **Expected**:
   - Redirects immediately to `/app/login`
4. **Action**: Login again
5. **Expected**: Works normally

## 4. Mobile Responsiveness
- [ ] Use Chrome DevTools (F12) -> Toggle Device Toolbar -> Select "iPhone 12"
- [ ] Verify "Hecho" button is always visible at bottom
- [ ] Verify text is readable without zooming
- [ ] Verify hit targets (buttons) are large enough (>44px)
