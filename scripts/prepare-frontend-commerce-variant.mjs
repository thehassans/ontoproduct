import fs from 'node:fs'
import path from 'node:path'

const targetRoot = process.argv[2]
if (!targetRoot) {
  throw new Error('Usage: node prepare-frontend-commerce-variant.mjs <targetRoot>')
}

const root = targetRoot.replace(/\\/g, '/')
const files = {
  capacitor: path.join(root, 'capacitor.config.json'),
  gradle: path.join(root, 'android', 'app', 'build.gradle'),
  strings: path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
  manifest: path.join(root, 'public', 'manifest.webmanifest'),
  html: path.join(root, 'index.html'),
  customerLogin: path.join(root, 'src', 'pages', 'ecommerce', 'CustomerLogin.jsx'),
  register: path.join(root, 'src', 'pages', 'ecommerce', 'Register.jsx'),
  publicLogo: path.join(root, 'public', 'logo.png'),
  keystore: path.join(root, 'android', 'keystore.properties'),
}

const commerceIcon = 'C:/Users/kjh/Desktop/buysialmobileicon.jpeg'
if (!fs.existsSync(commerceIcon)) {
  throw new Error(`Commerce icon not found: ${commerceIcon}`)
}
for (const required of [files.capacitor, files.gradle, files.strings, files.manifest, files.html, files.customerLogin, files.register]) {
  if (!fs.existsSync(required)) {
    throw new Error(`Missing expected project file: ${required}`)
  }
}

const capacitor = JSON.parse(fs.readFileSync(files.capacitor, 'utf8'))
capacitor.appId = 'com.buysial.app'
capacitor.appName = 'Buysial'
fs.writeFileSync(files.capacitor, JSON.stringify(capacitor, null, 2) + '\n', 'utf8')

let gradle = fs.readFileSync(files.gradle, 'utf8').replace(/^\uFEFF/, '')
gradle = gradle.replace(/namespace\s*=\s*"[^"]+"/, 'namespace = "com.buysial.app"')
gradle = gradle.replace(/applicationId\s+"[^"]+"/, 'applicationId "com.buysial.app"')
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 4')
gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "1.0.3"')
fs.writeFileSync(files.gradle, gradle, 'utf8')

let strings = fs.readFileSync(files.strings, 'utf8')
strings = strings.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">Buysial</string>')
strings = strings.replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">Buysial</string>')
strings = strings.replace(/<string name="package_name">.*?<\/string>/, '<string name="package_name">com.buysial.app</string>')
strings = strings.replace(/<string name="custom_url_scheme">.*?<\/string>/, '<string name="custom_url_scheme">com.buysial.app</string>')
fs.writeFileSync(files.strings, strings, 'utf8')

let manifest = fs.readFileSync(files.manifest, 'utf8')
manifest = manifest.replace(/"name"\s*:\s*"[^"]+"/, '"name": "Buysial"')
manifest = manifest.replace(/"short_name"\s*:\s*"[^"]+"/, '"short_name": "Buysial"')
fs.writeFileSync(files.manifest, manifest, 'utf8')

let html = fs.readFileSync(files.html, 'utf8')
html = html.replace(/<title>.*?<\/title>/, '<title>Buysial | Commerce</title>')
fs.writeFileSync(files.html, html, 'utf8')

let customerLogin = fs.readFileSync(files.customerLogin, 'utf8')
customerLogin = customerLogin.replace(/\$\{import\.meta\.env\.BASE_URL\}BSBackgroundremoved\.png/g, '${import.meta.env.BASE_URL}logo.png')
customerLogin = customerLogin.replace(/alt="Logo"/g, 'alt="Buysial"')
fs.writeFileSync(files.customerLogin, customerLogin, 'utf8')

let register = fs.readFileSync(files.register, 'utf8')
register = register.replace(/\$\{import\.meta\.env\.BASE_URL\}BSBackgroundremoved\.png/g, '${import.meta.env.BASE_URL}logo.png')
register = register.replace(/alt="Logo"/g, 'alt="Buysial"')
fs.writeFileSync(files.register, register, 'utf8')

fs.copyFileSync(commerceIcon, files.publicLogo)
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

console.log(`Prepared commerce variant at ${root}`)
