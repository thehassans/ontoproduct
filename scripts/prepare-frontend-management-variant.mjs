import fs from 'node:fs'
import path from 'node:path'

const targetRoot = process.argv[2]
if (!targetRoot) {
  throw new Error('Usage: node prepare-frontend-management-variant.mjs <targetRoot>')
}

const normalizedRoot = targetRoot.replace(/\\/g, '/')
const files = {
  capacitor: path.join(normalizedRoot, 'capacitor.config.json'),
  gradle: path.join(normalizedRoot, 'android', 'app', 'build.gradle'),
  strings: path.join(normalizedRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
  login: path.join(normalizedRoot, 'src', 'pages', 'user', 'Login.jsx'),
  publicLogo: path.join(normalizedRoot, 'public', 'management-logo.jpg'),
  keystore: path.join(normalizedRoot, 'android', 'keystore.properties'),
}

const desktopManagementIcon = 'C:/Users/kjh/Desktop/buysialmanagmentappicon.jpg'
if (!fs.existsSync(desktopManagementIcon)) {
  throw new Error(`Management icon not found: ${desktopManagementIcon}`)
}
if (!fs.existsSync(files.capacitor) || !fs.existsSync(files.gradle) || !fs.existsSync(files.strings) || !fs.existsSync(files.login)) {
  throw new Error('Target root does not look like the frontend project copy')
}

const capacitor = JSON.parse(fs.readFileSync(files.capacitor, 'utf8'))
capacitor.appId = 'com.buysial.management'
capacitor.appName = 'Buysial Management'
fs.writeFileSync(files.capacitor, JSON.stringify(capacitor, null, 2) + '\n', 'utf8')

let gradle = fs.readFileSync(files.gradle, 'utf8').replace(/^\uFEFF/, '')
gradle = gradle.replace(/namespace\s*=\s*"[^"]+"/, 'namespace = "com.buysial.management"')
gradle = gradle.replace(/applicationId\s+"[^"]+"/, 'applicationId "com.buysial.management"')
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 4')
gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "1.0.3"')
fs.writeFileSync(files.gradle, gradle, 'utf8')

let strings = fs.readFileSync(files.strings, 'utf8')
strings = strings.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">Buysial Management</string>')
strings = strings.replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">Buysial Management</string>')
strings = strings.replace(/<string name="package_name">.*?<\/string>/, '<string name="package_name">com.buysial.management</string>')
strings = strings.replace(/<string name="custom_url_scheme">.*?<\/string>/, '<string name="custom_url_scheme">com.buysial.management</string>')
fs.writeFileSync(files.strings, strings, 'utf8')

let login = fs.readFileSync(files.login, 'utf8')
login = login.replace(/const fallbackLogo = `\$\{import\.meta\.env\.BASE_URL\}[^`]+`/, 'const fallbackLogo = `${import.meta.env.BASE_URL}management-logo.jpg`')
login = login.replace('Sign in to your Buysial workspace', 'Sign in to your Buysial Management workspace')
login = login.replace('Powered by <strong>Buysial</strong>', 'Powered by <strong>Buysial Management</strong>')
fs.writeFileSync(files.login, login, 'utf8')

fs.copyFileSync(desktopManagementIcon, files.publicLogo)
fs.writeFileSync(
  files.keystore,
  [
    'storeFile=C:/Users/kjh/buysial-upload.jks',
    'storePassword=Hassan123',
    'keyAlias=buysial-upload',
    'keyPassword=Hassan123',
  ].join('\n'),
  'utf8'
)

console.log(`Prepared management variant at ${normalizedRoot}`)
