# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install --legacy-peer-deps
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Run on Expo Go or as a native React Native app

This project uses React Native with Expo modules and Expo Router. Use the same
JavaScript application in either mode:

### Expo Go

```bash
npm run expo:go
```

Open Expo Go on a device or emulator and scan the QR code. Expo Go only supports
native modules included in its matching Expo SDK. If a library needs native
code that Expo Go does not include, use the native development build below.

### Native Android development build

```bash
npm run native:android
```

This builds and installs the Android app from the checked-in `android/`
project, then connects it to Metro on port `8082`. Start it again later with
`npm run start` and open the installed app. This is the React Native Android
app with Expo's native module and bundling integration; it is not the bare
React Native CLI workflow (`npx react-native run-android`).

After changing a native dependency or Expo config/plugin, rebuild the native
app with `npm run native:android`. A JavaScript reload alone cannot update
native code. Keep native module versions aligned with the Expo SDK before
building; `npx expo install --check` can check the versions when network access
is available.

## API environment

Copy `.env.example` to `.env` and set the HTTPS URLs exposed by the reverse proxy:

```text
EXPO_PUBLIC_ADMIN_URL=https://<DOMAIN>
EXPO_PUBLIC_ATTENDANCE_URL=https://<DOMAIN>/attendance/api
```

Only put non-secret endpoint URLs in `EXPO_PUBLIC_*` variables. Expo bundles
these values into the app, so do not store API keys, JWTs, device tokens,
database URLs, or passwords in `.env`.
AI feature extraction goes through the authenticated admin API. Do not expose
the AI service or its key to mobile clients.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

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
