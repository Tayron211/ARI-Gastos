# REGLAS CRÍTICAS DEL PROYECTO (ARI-CONTROL)

## ⚠️ PROTECCIÓN ABSOLUTA E INMUTABLE DE DATOS
1. **PROHIBICIÓN TOTAL DE BORRADO DE DATOS EN ACTUALIZACIONES DE CÓDIGO:**
   - La información del usuario (gastos familiares/personales, préstamos otorgados, cuotas, clientes, cobros, etc.) **NUNCA DEBE SER BORRADA, REINICIADA NI REEMPLAZADA** al realizar modificaciones de código, refactorizaciones, estilos o nuevas funcionalidades.
   - La lista canónica `HISTORICAL_USER_EXPENSES` y el préstamo `HISTORICAL_USER_LOAN` en `js/storage.js` son el suelo mínimo de datos reales del usuario (UCV Keyla, Alquiler Departamento, Erick, Abuela Pensión, Propinas, Scotiabank Lizy, etc.).
   - Cualquier nuevo gasto o préstamo añadido por el usuario debe persistir en `localStorage` y en la bóveda de seguridad permanente.

2. **COMPORTAMIENTO DE INICIALIZACIÓN (`Storage.init`):**
   - Nunca sobreescribir `finanflow_expenses_v1` o `finanflow_loans_v1` con arrays vacíos `[]` ni datos de muestra sintéticos.
   - En cada arranque, la aplicación debe fusionar inteligentemente los registros existentes para asegurar que ningún registro previo se pierda.

3. **ROL DEL SISTEMA:**
   - El usuario es un **prestamista en Perú** que otorga préstamos (cobros diarios, semanales, quincenales y mensuales en Soles S/) con intereses y cuotas.
   - También mantiene un estricto control de sus **gastos personales** (separación estricta de divisas PEN y EUR).
