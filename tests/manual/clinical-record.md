# Prueba manual de generación de historia clínica

Este procedimiento verifica que la pestaña **Historia Clínica** recibe los campos clave aun cuando la transcripción no siga un formato rígido.

1. Ejecuta `npm install` si todavía no has instalado las dependencias del proyecto y luego inicia la app con `npm run dev`.
2. Copia y pega en el campo de transcripción el siguiente texto ejemplo:

   ```
   Paciente de nombre Carlos Alberto, varón de 45 años. Consulta por dolor torácico opresivo desde hace dos días y refiere que se intensifica al esfuerzo. Antecedentes médicos: hipertensión arterial controlada; niega cirugías previas. Antecedentes familiares con padre que presenta cardiopatía isquémica. Hábitos: exfumador, actualmente realiza caminatas suaves. Examen físico muestra presión arterial de 150/90 y frecuencia cardíaca de 92 lpm. Se diagnostica angina inestable. Plan de tratamiento: iniciar betabloqueador, indicar reposo relativo y programar prueba de esfuerzo.
   ```

3. Pulsa **Generar Historia Clínica**.
4. Abre la pestaña **Historia Clínica** y comprueba que los campos **Motivo de consulta**, **Antecedentes médicos**, **Diagnóstico** y **Plan/Tratamiento** aparecen completos con información coherente del texto anterior.

Si cualquiera de los campos aparece vacío, revisa la transcripción y reporta el comportamiento inesperado.
