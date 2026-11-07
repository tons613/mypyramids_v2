# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Home dashboard

The signed-in home screen prioritizes search and compact booking, results, and
order-history shortcuts. Providers see My Patient beside Order a test in the
first row. Patients see a Health assistant card beside Order a test, with an AI
badge and guidance on symptoms and tests. Results and order history fill the
second row. Providers retain a separate assistant link above News & updates,
which is the last section for both roles.
Cards adapt to light/dark mode and stack on narrow screens or with large text.

Recommendations load from `/get_recommendations` and auto-scroll while Home is
active, looping back after the last card. Swiping remains available and pauses
auto-scrolling briefly; reduced-motion settings disable auto-scrolling.
Each card's View details action opens the selected test's details.
Health packages load from `/healthpackages` in a vertically scrollable list
capped at three visible rows (with row heights adapting to text size). Tapping
a package opens its description, price, image, and included tests; included tests
link to their own details. Add to cart saves the package at its package price,
with a separate package ID so it cannot collide with an individual test.
Package payment remains unavailable because `/initialize_order` currently accepts
test IDs only; the detail page explains this limitation.
Pull down to refresh the catalog; test names and prices come from the API.

The purple booking hero lives on guest Home, with a Browse tests action alongside
sign-in and registration options. Guest Home scrolls on smaller displays so
these actions remain accessible.

## Splash screen and cold start

`assets/images/splash_screen.jpeg` is the launch artwork. It is configured in
`app.json` through the `expo-splash-screen` plugin (`resizeMode: "cover"`, navy
`#03182E` background, same art in dark mode) and the native projects are kept in
sync:

- iOS: `ios/mypyramids/SplashScreen.storyboard` pins the image edge-to-edge with
  `scaleAspectFill`, and `SplashScreenLogo.imageset` holds 1x/2x/3x exports.
- Android 12+ only supports an icon-based system splash, so
  `drawable-*/splashscreen_logo.png` uses the wordmark cropped from the same
  artwork over the matching `splashscreen_background` color.

Native splash changes require rebuilding the dev client (`npm run ios` or
`npm run android`; run `cd ios && pod install` first if pods changed).

Cold-start work was moved off the critical path: the native splash is held with
`SplashScreen.preventAutoHideAsync()` until the persisted session and onboarding
flag resolve (with a 4 s fallback), and Firebase Auth is imported dynamically
after the first commit instead of during root module evaluation.

## App name

`app.json` sets `expo.name` to `MyPyramids` (lowercase `expo.slug` is the URL/ID
form). Android reads it from `android/app/src/main/res/values/strings.xml`
(`app_name`) and iOS from `CFBundleDisplayName` in
`ios/mypyramids/Info.plist`. Both native projects are gitignored and rendered by
`npx expo prebuild` from `app.json`, so change the name there first.

## App icon

The launcher icon is the legacy Pyramids mark (navy `#23557C` field with the
red/white pyramid), derived from the legacy app's
`android/app/src/main/res/mipmap-*` artwork:

- `assets/images/icon.png` and `ios/mypyramids/Images.xcassets/AppIcon.appiconset`
  hold a 1024x1024 opaque icon (iOS icons must not have alpha).
- Android adaptive icon: `androidIcon.backgroundColor` `#23557C` with
  `android-icon-foreground.png` (pyramid only, kept inside the 66% safe zone) and
  `android-icon-monochrome.png` for Android 13 themed icons.
- `android/app/src/main/res/mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher*.png` carries
  per-density PNGs; `mipmap-anydpi-v26/ic_launcher*.xml` wires background,
  foreground, and monochrome layers.

Regenerate after replacing artwork by re-exporting the same files at the sizes
listed in `app.json`; the native folders are gitignored, so `npx expo prebuild`
recreates them from `app.json`.

## Appearance

Account → Appearance lets users choose **Light**, **Dark**, or **System**
(follows the device). The choice is saved to AsyncStorage and applied app-wide
through the shared `useColorScheme` hook, React Navigation, React Native Paper,
and the status/navigation bars. The account screen also shows the profile
summary, account shortcuts, support links, and sign-out.

Onboarding and auth screens (login, sign up, category, provider role, profile,
phone verification) follow the same resolution via `hooks/use-auth-theme.ts`,
which provides glassy surfaces over the photo background plus themed inputs,
dividers, and buttons. The dark navy wordmark sits on a light plate in dark mode
so the logo stays legible.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
