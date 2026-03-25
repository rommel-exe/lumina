# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Desktop Upgrade Support (Tauri Updater)

This app is updater-ready for desktop releases.

Users do not need to set up anything. Updater configuration is embedded at build time and checked automatically when the app starts.

### 1. Generate updater signing keys

```bash
npm run tauri signer generate -- -w ~/.tauri/lumina.key
```

Copy the generated public key value and keep the private key secure.

### 2. Set release environment variables (CI/build machine only)

Set these variables when building the desktop app (not on user machines):

```bash
export TAURI_UPDATER_PUBKEY="<public key contents>"
export TAURI_UPDATER_ENDPOINT="https://your-update-server/{{target}}/{{arch}}/{{current_version}}"
export TAURI_SIGNING_PRIVATE_KEY="<path or contents of private key>"
```

Optional:

```bash
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
```

### 3. Build updater artifacts

`src-tauri/tauri.conf.json` has `bundle.createUpdaterArtifacts` enabled, so running a release build creates signed updater bundles.

```bash
npm run tauri build
```

### 4. Host update metadata and artifacts

Your update endpoint must return valid Tauri updater metadata (static JSON or dynamic server) pointing to signed artifacts.

`latest.json` is generated automatically after every successful `npm run tauri build` and written to:

`src-tauri/target/release/bundle/latest.json`

You can also generate it manually:

```bash
npm run generate:latest-json
```

### 5. Publish flow for zero-setup users

1. Build and sign each release in CI with the env vars above.
2. Upload generated installers and `.sig` files to your update server/CDN.
3. Update your endpoint metadata (static `latest.json` or dynamic server response).
4. Users open the app normally; it checks for updates on startup and installs updates automatically.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
