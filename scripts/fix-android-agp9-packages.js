const fs = require('node:fs');
const path = require('node:path');

const blobUtilPackage = require.resolve('react-native-blob-util/package.json');
const blobUtilGradle = path.join(path.dirname(blobUtilPackage), 'android', 'build.gradle');

if (fs.existsSync(blobUtilGradle)) {
  const source = fs.readFileSync(blobUtilGradle, 'utf8');
  const legacyFile = /getDefaultProguardFile\((['"])proguard-android\.txt\1\)/g;
  const updated = source.replace(legacyFile, "getDefaultProguardFile('proguard-android-optimize.txt')");

  if (updated !== source) fs.writeFileSync(blobUtilGradle, updated);
}

// expo-firebase-recaptcha 2.x depends on the legacy expo-firebase-core module.
// Expo SDK 58 no longer exports EXLogWarn, so use Foundation's NSLog for this
// single diagnostic instead of failing the iOS native build.
const firebaseCorePackage = require.resolve('expo-firebase-core/package.json');
const firebaseCoreImplementation = path.join(
  path.dirname(firebaseCorePackage),
  'ios',
  'EXFirebaseCore',
  'EXFirebaseCore.m',
);

if (fs.existsSync(firebaseCoreImplementation)) {
  const source = fs.readFileSync(firebaseCoreImplementation, 'utf8');
  const updated = source.replace(
    'EXLogWarn(@"Failed to initialize Firebase app: %@", name);',
    'NSLog(@"Failed to initialize Firebase app: %@", name);',
  );

  if (updated !== source) fs.writeFileSync(firebaseCoreImplementation, updated);
}
