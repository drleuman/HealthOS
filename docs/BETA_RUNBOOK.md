# 📔 HealthOS Beta Runbook

Este documento define el protocolo operativo para la Beta Cerrada de HealthOS. Seguirlo es crítico para mantener la **validez científica** de los experimentos.

---

## 🚀 Día 0: Lanzamiento (Setup)

### 1. Puerta de Enlace (Staging Gate)
Antes de invitar a nadie, debes pasar el gate de calidad:
```bash
# En el root del proyecto
./staging-gate.ps1
```
**REGLA:** Si el gate falla (🔴), **NO** invites a usuarios. Arregla primero.

### 2. Configuración de Entorno
Asegúrate de que estas variables de entorno están correctamente seteadas en producción:
- `BETA_ALLOWLIST`: Comma-separated emails de los 5-10 testers.
- `BETA_FREEZE`: `true` (Esto bloquea cambios automáticos del Decision Engine).
- `ANALYTICS_SECRET`: Tu clave secreta para los informes.

---

## 📅 Rutina Diaria (Días 1-7)

### 1. Auditoría Matutina (Digest)
Cada mañana, genera y revisa el digest del día anterior:
```bash
cd services/api
npm run beta:digest
```
Revisa en `reports/daily_digest_YYYY-MM-DD.md`:
- **Control Contamination:** Debe ser 0.
- **Errors Today:** No debe haber picos (🟡 o 🔴).

### 2. Registro de Interacciones Manuales
Si hablas con un tester por WhatsApp, email o en persona, **debes** registrarlo inmediatamente:
```bash
npm run beta:log -- usuario@email.com reminder "le pedí que completara el log"
```
*Tip: El email no necesita estar en la DB todavía.*

---

## 📊 Rutina Semanal (Día 7)

### 1. Evaluación de Causalidad
Al finalizar la ventana de 7 días, genera el informe final:
```bash
npm run beta:weekly
```
Revisa el **Uplift** y la advertencia de **BIAS**.
- Si el sesgo (Operator Influence) es > 30%, considera el resultado **no concluyente**.

### 2. Toma de Decisión
Basado en el veredicto del Decision Engine:
- **KEEP:** El cambio se convierte en parte estable del producto.
- **ROLLBACK:** Se descarta el cambio por impacto negativo o nulo.
- **CONTINUE:** Se extiende el experimento 7 días más si no hay muestra suficiente.

---

## 🆘 Protocolo de Incidentes

- **Contamination > 0:** Un bug ha filtrado intervenciones al grupo de control. El experimento actual queda **invalidado**. Corrige y reinicia la semana.
- **Error Spike (🔴 UNSTABLE):** Revisa logs de `pm2` o del servidor inmediatamente. Detén invitaciones nuevas.
- **Pending Interactions > 0:** Hay interacciones logueadas para emails que no existen. Asegúrate de que esos usuarios se registren con el email correcto.

---
*HealthOS - Built for Causal Truth.*
