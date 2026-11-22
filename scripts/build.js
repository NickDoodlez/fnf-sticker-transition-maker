process.env.DEBUG = process.env.DEBUG || 'electron-builder';

const fs = require('fs');
const path = require('path');
const builder = require('electron-builder');
const { ensure } = require('./prepare');

const root = path.resolve(__dirname, '..');
const APP_NAME = 'FNF Sticker Transition Maker';
const out = path.join(root, 'build');
const temp = path.join(root, '.build-temp');
const icon = path.join(root, 'assets', 'icon.ico');

const README = [
  'FNF Sticker Transition Maker',
  '',
  'Creditos / Credits',
  'NickDZ - Creator of this tool',
  "Funkin' Crew - Friday Night Funkin' and its sticker transition",
  '',
  'Fan project, unofficial and not affiliated with the game.',
  '',
  'Usage',
  'Open the .exe. Put your sticker packs in the stickerpacks folder (one folder per pack) and your sounds in sounds (one subfolder per group).',
  ''
].join('\r\n');

function step(text) {
  console.log(`- ${text}`);
}

async function applyIcon(context) {
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  try {
    const mod = await import('rcedit');
    const rcedit = mod.rcedit || mod.default;
    await rcedit(exe, {
      icon,
      'version-string': { CompanyName: 'NickDZ', FileDescription: APP_NAME, ProductName: APP_NAME, LegalCopyright: 'NickDZ' }
    });
  } catch (error) {
    console.warn(`  Aviso: no se pudo cambiar el icono interno (${error.message}).`);
  }
}

async function main() {
  if (process.platform !== 'win32') throw new Error('El .exe debe generarse desde Windows.');
  const { electronDist, ffmpeg } = await ensure();

  fs.rmSync(temp, { recursive: true, force: true });
  fs.rmSync(out, { recursive: true, force: true });

  step('Creando el .exe (puede tardar unos minutos)');
  await builder.build({
    targets: builder.Platform.WINDOWS.createTarget('portable', builder.Arch.x64),
    publish: 'never',
    config: {
      appId: 'com.nickdz.fnfstickertransitionmaker',
      productName: APP_NAME,
      artifactName: `${APP_NAME}.\${ext}`,
      electronDist,
      directories: { output: temp, buildResources: 'assets' },
      files: ['main.js', 'preload.js', 'lib/**/*', 'renderer/**/*', 'package.json'],
      extraResources: [
        { from: icon, to: 'icon.ico' },
        { from: ffmpeg, to: 'ffmpeg.exe' }
      ],
      compression: 'store',
      afterPack: applyIcon,
      win: { icon, signAndEditExecutable: false }
    }
  });

  const built = path.join(temp, `${APP_NAME}.exe`);
  if (!fs.existsSync(built)) throw new Error(`No se generó ${built}`);

  step('Armando la carpeta final');
  fs.mkdirSync(out, { recursive: true });
  const exe = path.join(out, `${APP_NAME}.exe`);
  fs.copyFileSync(built, exe);
  for (const folder of ['sounds', 'stickerpacks']) {
    fs.cpSync(path.join(root, folder), path.join(out, folder), { recursive: true });
  }
  fs.writeFileSync(path.join(out, 'readme.txt'), README);
  fs.rmSync(temp, { recursive: true, force: true });

  for (const item of [exe, path.join(out, 'readme.txt'), path.join(out, 'sounds'), path.join(out, 'stickerpacks')]) {
    if (!fs.existsSync(item)) throw new Error(`Falta ${item}`);
  }

  console.log(`\nListo: ${out}`);
  console.log(fs.readdirSync(out).map((name) => `  ${name}`).join('\n'));
}

main().catch((error) => {
  fs.rmSync(temp, { recursive: true, force: true });
  console.error(`\nError: ${error.message}`);
  process.exit(1);
});
