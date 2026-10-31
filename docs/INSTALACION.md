# Instalación del entorno de desarrollo

Este documento explica qué se ha usado para desarrollar Atril PDF y cómo preparar un ordenador **Windows** para trabajar con el proyecto. **Para usar la app no hace falta nada de esto**: basta con descargar el instalador o el APK (ver `docs/GUIA_PARA_MARCOS.md`).

## Qué se ha usado hasta ahora

El desarrollo se ha hecho en un entorno en la nube (Linux) con:

| Herramienta | Versión |
| --- | --- |
| Node.js | 22 LTS (incluye `npm` y `npx`) |
| Git | 2.43 |
| Expo SDK / React Native | 58 / 0.88 |
| TypeScript | 6.0 |
| Electron / electron-builder | 45 / 26 |
| JDK | 21 (OpenJDK) |
| Android SDK | command-line tools, compileSdk 37, build-tools 37, NDK 27.1 (los descarga Gradle automáticamente) |

No se usa `expo-cli` global (está obsoleto): todo se ejecuta con `npx expo …`.
En escritorio **no hace falta compilar módulos nativos** (ni Visual Studio Build Tools): la base de datos usa el SQLite que ya trae Electron (`node:sqlite`).

## Preparar un PC con Windows (paso a paso)

Abre **PowerShell** (botón Inicio → escribe `PowerShell` → pulsa Intro). Copia y pega cada bloque y pulsa Intro.

### 1. Node.js LTS

```powershell
winget install OpenJS.NodeJS.LTS
```

Cierra PowerShell, ábrelo de nuevo y comprueba (debe mostrar `v22…` o superior):

```powershell
node -v
```

### 2. Git

```powershell
winget install Git.Git
```

Cierra y abre PowerShell. Configura tu nombre y tu correo (el que uses en GitHub):

```powershell
git config --global user.name "Marcos Hernández Párraga"
```

```powershell
git config --global user.email "TU_CORREO_AQUÍ"
```

### 3. Descargar el proyecto

```powershell
cd $HOME\Documents
```

```powershell
git clone https://github.com/MarcosHernandezParraga/atril-pdf.git
```

```powershell
cd atril-pdf
```

```powershell
npm install
```

Si todo va bien, al final verás `[copy-vendor] vendor files ready in public/vendor`.

### 4. Comprobar que todo funciona

```powershell
npm run check
```

Debe terminar con `Tests: … passed`.

### 5. Probar la versión de escritorio

```powershell
npm run desktop:start
```

Se abrirá la ventana de Atril PDF. Para crear el instalador de Windows (`.exe`), en la carpeta `desktop\release`:

```powershell
npm run desktop:dist
```

### 6. (Opcional) Android en tu PC

Solo si quieres compilar Android en local (los APK ya los compila GitHub automáticamente):

1. Instala **Android Studio** desde https://developer.android.com/studio (siguiente, siguiente…). Al abrirlo por primera vez, deja que descargue el SDK.
2. Instala el JDK 21: `winget install EclipseAdoptium.Temurin.21.JDK`
3. Configura la variable `ANDROID_HOME` (cierra y abre PowerShell después):

```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
```

4. Conecta tu móvil Android por USB con la **depuración USB** activada (Ajustes → Acerca del teléfono → pulsa 7 veces «Número de compilación»; luego Ajustes → Sistema → Opciones de desarrollador → Depuración USB) y ejecuta:

```powershell
npm run android
```

### 7. (Opcional) EAS Build (compilar iOS en la nube)

```powershell
npm install -g eas-cli
```

```powershell
eas login
```

Necesitas una cuenta gratuita en https://expo.dev. Para iPhone/iPad hace falta además una cuenta de desarrollador de Apple (ver `docs/GUIA_PARA_MARCOS.md`).

## Volver a arrancar el proyecto otro día

```powershell
cd $HOME\Documents\atril-pdf
```

```powershell
git pull
```

```powershell
npm install
```

```powershell
npm run desktop:start
```
