<!-- Copilot instructions for the `mypyramids-expo` repository -->
# Copilot instructions — mypyramids-expo

Purpose: Give AI coding agents the concise, actionable context they need to be productive in this Expo + React Native repo.

- **Big picture**
  - This is an Expo app using expo-router (file-based routing). App entry is `expo-router/entry` (see `package.json` → `main`).
  - UI is React Native + TypeScript with `@/` path alias (see `tsconfig.json`). Many components live under `app/` and `components/`.
  - Navigation uses `expo-router` + React Navigation. The primary layout is in `app/_layout.tsx` and tabs live under `app/(tabs)/_layout.tsx`.
  - State & services: Redux Toolkit + redux-persist are available; Firebase is present for backend integration (`firebase` in dependencies).

- **Key workflows & commands**
  - Start dev server (Metro + Expo): `npm install` then `npx expo start` or `npm run start`.
  - Native dev builds: `npm run ios` and `npm run android` use `expo run:ios|android`. These require native toolchains (Xcode/Android Studio) and CocoaPods for iOS (`ios/Podfile`).
  - Development client: `expo-dev-client` is installed — expect development builds when using `expo run:*` and custom native code.
  - Linting: `npm run lint` (uses `expo lint`).
  - Reset starter: `npm run reset-project` runs `scripts/reset-project.js` (it moves/removes `app` → `app-example` and scaffolds a new `app` directory).

- **Project-specific conventions**
  - Path alias: imports use `@/` to reference repository root (e.g., `@/components/themed-text`). Follow that in new files.
  - File-based routing: pages/screens are under `app/`. A folder named `(tabs)` contains the Tabs layout — see `app/(tabs)/index.tsx` for Home. Modal route is `app/modal.tsx`.
  - Themed primitives: `ThemedText` and `ThemedView` (in `components/`) are used widely — prefer these to raw `Text`/`View` for consistent theming.
  - Small UI helpers live under `components/ui/` (e.g., `icon-symbol.tsx`). Reuse these instead of introducing new icon wrappers.
  - Hooks: platform-aware color hook is `hooks/use-color-scheme.ts` (and `.web` variant). Use it for theme decisions.
  - Avoid changing `main` in `package.json`; the router entry is intentional for `expo-router` integration.

- **Integration points & notable deps**
  - `firebase` present — search for any `firebase` initializers before modifying backend integration.
  - `expo-dev-client` and native pods: edits touching native modules will require rebuilding dev clients and running `pod install` in `ios/`.
  - `react-native-reanimated` is imported in `app/_layout.tsx` — follow its installation constraints if changing animation code.

- **Files to inspect when changing behaviour**
  - Routing / layout: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/modal.tsx`
  - Theming: `constants/theme.ts`, `components/themed-text.tsx`, `components/themed-view.tsx`
  - Utilities/hooks: `hooks/use-color-scheme.ts`, `hooks/use-theme-color.ts`
  - Native & iOS: `ios/Podfile`, `ios/mypyramids/Info.plist`, `ios/mypyramids.xcodeproj` (only modify with care)
  - Scripts: `scripts/reset-project.js`

- **Change guidance for AI agents**
  - Always prefer small, focused edits. When adding new files, use the `@/` alias for imports and update any related index exports.
  - **Legacy flow rule:** Before changing or implementing an app workflow, inspect the corresponding flow in the legacy app at `/Users/toni/Developer/apps/pyramids/mypyramids` when it is available. Use it to understand the original behavior, required steps, and edge cases, then adapt and improve the flow for this Expo app. Treat the legacy implementation as a reference, not a requirement to copy exactly; if the legacy app is unavailable, continue using the current app and available project documentation.
  - If modifying native behaviour (iOS/Android), include instructions to run `npm run ios` / `npm run android` and mention CocoaPods (`cd ios && pod install`). Note that CI for native builds is not present here.
  - When suggesting dependency upgrades, prefer minimal version bumps and reference `package.json` changes explicitly.
  - For UI changes, prefer reusing `components/ui/*` and `Themed*` primitives so themes and color-scheme hooks remain consistent.
  - **Visual design rule:** Treat the user's latest screenshots as the design source for the entire app. Carry their colors, typography, spacing, shapes, and visual language into every screen, including screens without a direct screenshot reference. Keep interfaces sleek, clean, modern, and polished; use judgment to extend the screenshot theme consistently rather than leaving unreferenced screens visually unrelated.

- **Examples (explicit locations)**
  - Edit home screen: `app/(tabs)/index.tsx` — this is the entry users see in dev mode.
  - Add a new modal route: create `app/new-modal.tsx` and reference it via `Link href="/new-modal"` (see `app/modal.tsx` for patterns).
  - Reset starter: `npm run reset-project` runs `scripts/reset-project.js` and will prompt whether to move existing code to `app-example`.

If any sections are unclear or you'd like more detail (CI, native build tips, or README merging), tell me which area to expand. I'll update iteratively.
