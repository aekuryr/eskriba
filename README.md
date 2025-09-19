# Medical Voice Transcription → Clinical Record (Vite + React + TypeScript)

Aplicación web para **subir o grabar audio** y **transcribirlo** usando la Web Speech API (navegador), con **parseo médico** básico a una estructura de **historia clínica**.

## Tecnologías
- Vite + React + TypeScript
- TailwindCSS
- Web Speech API (Reconocimiento de voz del navegador)
- lucide-react (iconos)

## Requisitos previos
- Node.js 18+
- Una cuenta de GitHub

> **Nota**: La Web Speech API varía entre navegadores. Chrome en escritorio suele soportarla (webkitSpeechRecognition). La app requiere HTTPS para acceder al micrófono (GitHub Pages ya usa HTTPS).

## Desarrollo local
```bash
npm install
npm run dev
```
Abrir `http://localhost:5173` (o el puerto que indique Vite).

## Build
```bash
npm run build
npm run preview
```

## Despliegue en GitHub Pages (automatizado con GitHub Actions)
1. Crea un repositorio en GitHub (por ejemplo: `usuario/Audio-a-texto`).
2. Ajusta el **base** de Vite si publicarás en `https://usuario.github.io/Audio-a-texto`:
   - Edita `vite.config.ts` y cambia `base: '/Audio-a-texto/'` (usa el **nombre exacto** del repo).
3. Haz commit y push de todo el proyecto (incluyendo `.github/workflows/deploy.yml`).
4. En GitHub, ve a **Settings → Pages** y selecciona **Source: GitHub Actions** (si es necesario).
5. El workflow creará la rama `gh-pages` y publicará automáticamente tras cada push a `main`.

### Alternativa sin cambiar `base`
Si vas a publicar en `https://usuario.github.io/` (repositorio especial **usuario/usuario.github.io**), puedes dejar `base: '/'`.

## Estructura del proyecto
```
project/
  src/
    components/...
    services/transcriptionService.ts
    utils/audioTranscription.ts
    utils/medicalParser.ts
    types/medical.ts
  index.html
  vite.config.ts
  tailwind.config.js
  package.json
```

## Variables/clave API
Actualmente **no requiere claves**: usa APIs del navegador.

## Consideraciones de privacidad
- El audio y la transcripción se manejan en el navegador (cliente). No se sube a un backend.
- Asegúrate de informar al usuario y tener consentimiento cuando corresponda.

## Licencia
MIT (puedes cambiarla según prefieras).
