import fs from 'node:fs'
import path from 'node:path'

const androidDir = 'c:/Users/kjh/Desktop/buysial/ontoproduct-main/buysial-store-mobile/android'
const gradlePath = path.join(androidDir, 'app', 'build.gradle')
const keystorePath = path.join(androidDir, 'keystore.properties')

let text = fs.readFileSync(gradlePath, 'utf8').replace(/^\uFEFF/, '')

if (!text.includes('import java.util.Properties')) {
  text = `import java.util.Properties\nimport java.io.FileInputStream\n\n${text}`
}

if (!text.includes("def keystoreProperties = new Properties()")) {
  const oldBlock = `apply plugin: "com.facebook.react"\n\ndef projectRoot`
  const newBlock = `apply plugin: "com.facebook.react"\n\ndef keystoreProperties = new Properties()\ndef keystorePropertiesFile = rootProject.file('keystore.properties')\nif (keystorePropertiesFile.exists()) {\n    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))\n}\n\ndef projectRoot`
  if (!text.includes(oldBlock)) {
    throw new Error('Could not locate projectRoot insertion point in store build.gradle')
  }
  text = text.replace(oldBlock, newBlock)
}

const signingOld = `    signingConfigs {\n        debug {\n            storeFile file('debug.keystore')\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        }\n    }`
const signingNew = `    signingConfigs {\n        debug {\n            storeFile file('debug.keystore')\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        }\n        release {\n            if (keystorePropertiesFile.exists() && keystoreProperties['storeFile']) {\n                storeFile file(keystoreProperties['storeFile'])\n                storePassword keystoreProperties['storePassword']\n                keyAlias keystoreProperties['keyAlias']\n                keyPassword keystoreProperties['keyPassword']\n            }\n        }\n    }`
if (!text.includes(signingNew)) {
  if (!text.includes(signingOld)) {
    throw new Error('Could not locate signingConfigs block in store build.gradle')
  }
  text = text.replace(signingOld, signingNew)
}

const releaseOld = `        release {\n            // Caution! In production, you need to generate your own keystore file.\n            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug`
const releaseNew = `        release {\n            // Caution! In production, you need to generate your own keystore file.\n            // see https://reactnative.dev/docs/signed-apk-android.\n            if (keystorePropertiesFile.exists() && keystoreProperties['storeFile']) {\n                signingConfig signingConfigs.release\n            } else {\n                signingConfig signingConfigs.debug\n            }`
if (!text.includes(releaseNew)) {
  if (!text.includes(releaseOld)) {
    throw new Error('Could not locate release signingConfig block in store build.gradle')
  }
  text = text.replace(releaseOld, releaseNew)
}

fs.writeFileSync(gradlePath, text, 'utf8')
fs.writeFileSync(
  keystorePath,
  [
    'storeFile=C:/Users/kjh/buysial-upload.jks',
    'storePassword=Hassan123',
    'keyAlias=buysial-upload',
    'keyPassword=Hassan123',
  ].join('\n'),
  'utf8'
)

console.log('Patched store Android signing config.')
