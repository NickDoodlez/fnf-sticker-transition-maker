(function () {
  'use strict';

  const dictionary = {
    es: {
      'app.title': 'FNF Sticker Transition Maker',
      'btn.credits': 'Créditos',
      'preview.aria': 'Vista previa de la transición',
      'play': 'Reproducir',
      'pause': 'Pausar',
      'restart': 'Volver al inicio',
      'position': 'Posición',
      'loop': 'Repetir',
      'random': 'Otra al azar',

      'sec.pack': 'Sticker pack',
      'pack.pack': 'Pack',
      'pack.set': 'Conjunto',
      'pack.none': 'Sin packs',
      'pack.noSets': 'Sin conjuntos',
      'btn.packsFolder': 'Carpeta de packs',
      'btn.soundsFolder': 'Carpeta de sonidos',
      'btn.reload': 'Recargar',

      'sec.transition': 'Transición',
      'mode.aria': 'Modo',
      'mode.full': 'Completa',
      'mode.in': 'Solo entrada',
      'mode.out': 'Solo salida',
      'cover': 'Duración de entrada y salida',
      'hold': 'Pantalla cubierta',

      'sec.random': 'Aleatoriedad',
      'seed': 'Semilla',
      'seed.new': 'Nueva',
      'seed.newTitle': 'Semilla nueva',
      'seed.copy': 'Copiar',
      'seed.copyTitle': 'Copiar semilla',
      'seed.copied': 'Copiada',
      'lastMode': 'Sticker del centro',
      'lastMode.common': 'Los comunes del pack (BF / GF)',
      'lastMode.any': 'Cualquiera',
      'rows': 'Distancia entre filas',
      'angle': 'Ángulo en grados',
      'scale': 'Tamaño al aparecer',
      'to': 'a',
      'stickerScale': 'Tamaño de los stickers',
      'spacing': 'Separación horizontal',
      'resetRandom': 'Valores originales del juego',

      'sec.sound': 'Sonido',
      'soundOn': 'Sonido de cada sticker',
      'volume': 'Volumen',
      'soundGroup': 'Grupo de sonidos',
      'sound.random': 'Al azar',

      'sec.bg': 'Fondo',
      'bgType': 'Tipo',
      'bg.transparent': 'Transparente',
      'bg.color': 'Color sólido',
      'bg.image': 'Imagen',
      'bg.colorAria': 'Color de fondo',
      'bg.pick': 'Elegir imagen',
      'bg.unreadable': 'No se pudo leer la imagen',

      'sec.export': 'Exportar',
      'resolution': 'Resolución',
      'res.hd': '1280 × 720 (HD)',
      'res.fhd': '1920 × 1080 (Full HD)',
      'res.2k': '2560 × 1440 (2K)',
      'res.4k': '3840 × 2160 (4K)',
      'res.vertical': '1080 × 1920 (vertical)',
      'res.square': '1080 × 1080 (cuadrado)',
      'res.custom': 'Personalizada',
      'size': 'Ancho y alto',
      'fps': 'FPS',
      'format': 'Formato',
      'fmt.webm': 'WebM (VP9, con transparencia)',
      'fmt.mov': 'MOV (ProRes 4444, con transparencia)',
      'fmt.mp4': 'MP4 (H.264, sin transparencia)',
      'fmt.png': 'Secuencia PNG (con transparencia)',
      'audio.include': 'Incluir el sonido',
      'audio.includePng': 'Guardar también el sonido (audio.wav)',
      'btn.export': 'Exportar transición',

      'credits.title': 'Créditos',
      'credits.nick': 'Creador de esta herramienta',
      'credits.funkin': 'Friday Night Funkin\u2019 y su transición de stickers',
      'credits.art': 'Stickers del pack «{name}»: arte de {artist}.',
      'credits.note': 'Proyecto de fans, no oficial y sin afiliación con el juego.',
      'close': 'Cerrar',

      'ov.exporting': 'Exportando',
      'ov.preparing': 'Preparando…',
      'ov.mixing': 'Mezclando sonido…',
      'ov.finishing': 'Terminando el archivo…',
      'ov.canceling': 'Cancelando…',
      'ov.frame': 'Fotograma {a} de {b}',
      'ov.done': 'Exportación lista',
      'ov.failed': 'No se pudo exportar',
      'ov.cannot': 'No se puede exportar',
      'ov.cancel': 'Cancelar',
      'ov.reveal': 'Mostrar en carpeta',

      'msg.loading': 'Cargando…',
      'msg.loadingStickers': 'Cargando stickers…',
      'msg.unusablePack': 'Este pack no tiene stickers que se puedan usar. Revisa el json y los nombres de las imágenes.',
      'msg.putPack': 'Pon un pack en la carpeta «stickerpacks» y pulsa Recargar.',
      'msg.folderError': 'No se pudieron leer las carpetas: {error}',
      'msg.onlyPage': 'Abriste solo la página. Abre la aplicación para que pueda leer tus packs y exportar.',
      'info.noPacks': 'No hay packs. Crea una carpeta dentro de «stickerpacks» con tus stickers y el json, y pulsa Recargar.',
      'info.artist': 'Arte de {artist}. ',
      'info.loaded': '{n} stickers distintos cargados de {total} imágenes.',
      'info.missing': 'No se encontraron las imágenes que pide el json. Revisa que los nombres coincidan.',
      'info.summary': '{mode}: {d} s, {f} fotogramas, {n} stickers.',
      'info.resolution': '{w} × {h} a {fps} FPS.',
      'info.mp4Black': 'MP4 no admite transparencia: se usará fondo negro.',
      'info.alpha': 'Se exportará con transparencia.',

      'dlg.pickImage': 'Elegir imagen de fondo',
      'dlg.images': 'Imágenes',
      'dlg.pngFolder': 'Carpeta donde crear la secuencia PNG',
      'dlg.save': 'Guardar transición',

      'err.E_BUSY': 'Ya hay una exportación en curso.',
      'err.E_FORMAT': 'Formato no válido.',
      'err.E_SIZE': 'Resolución o FPS no válidos.',
      'err.E_NO_FFMPEG': 'No se encontró ffmpeg.',
      'err.E_MP4_EVEN': 'MP4 necesita ancho y alto pares.',
      'err.E_FFMPEG_EXIT': 'ffmpeg terminó con un error.',
      'err.E_FFMPEG_ENDED': 'ffmpeg terminó antes de tiempo.',
      'err.E_FFMPEG_INPUT': 'ffmpeg cerró la entrada.',
      'err.E_NO_JOB': 'No hay exportación activa.',
      'err.E_NOT_ALLOWED': 'Archivo no permitido.'
    },
    en: {
      'app.title': 'FNF Sticker Transition Maker',
      'btn.credits': 'Credits',
      'preview.aria': 'Transition preview',
      'play': 'Play',
      'pause': 'Pause',
      'restart': 'Back to start',
      'position': 'Position',
      'loop': 'Loop',
      'random': 'New random',

      'sec.pack': 'Sticker pack',
      'pack.pack': 'Pack',
      'pack.set': 'Set',
      'pack.none': 'No packs',
      'pack.noSets': 'No sets',
      'btn.packsFolder': 'Packs folder',
      'btn.soundsFolder': 'Sounds folder',
      'btn.reload': 'Reload',

      'sec.transition': 'Transition',
      'mode.aria': 'Mode',
      'mode.full': 'Full',
      'mode.in': 'In only',
      'mode.out': 'Out only',
      'cover': 'In and out duration',
      'hold': 'Screen covered',

      'sec.random': 'Randomness',
      'seed': 'Seed',
      'seed.new': 'New',
      'seed.newTitle': 'New seed',
      'seed.copy': 'Copy',
      'seed.copyTitle': 'Copy seed',
      'seed.copied': 'Copied',
      'lastMode': 'Center sticker',
      'lastMode.common': 'The pack\u2019s common ones (BF / GF)',
      'lastMode.any': 'Any',
      'rows': 'Row distance',
      'angle': 'Angle in degrees',
      'scale': 'Pop-in size',
      'to': 'to',
      'stickerScale': 'Sticker size',
      'spacing': 'Horizontal spacing',
      'resetRandom': 'Original game values',

      'sec.sound': 'Sound',
      'soundOn': 'Sound for each sticker',
      'volume': 'Volume',
      'soundGroup': 'Sound group',
      'sound.random': 'Random',

      'sec.bg': 'Background',
      'bgType': 'Type',
      'bg.transparent': 'Transparent',
      'bg.color': 'Solid color',
      'bg.image': 'Image',
      'bg.colorAria': 'Background color',
      'bg.pick': 'Choose image',
      'bg.unreadable': 'The image could not be read',

      'sec.export': 'Export',
      'resolution': 'Resolution',
      'res.hd': '1280 × 720 (HD)',
      'res.fhd': '1920 × 1080 (Full HD)',
      'res.2k': '2560 × 1440 (2K)',
      'res.4k': '3840 × 2160 (4K)',
      'res.vertical': '1080 × 1920 (vertical)',
      'res.square': '1080 × 1080 (square)',
      'res.custom': 'Custom',
      'size': 'Width and height',
      'fps': 'FPS',
      'format': 'Format',
      'fmt.webm': 'WebM (VP9, with transparency)',
      'fmt.mov': 'MOV (ProRes 4444, with transparency)',
      'fmt.mp4': 'MP4 (H.264, no transparency)',
      'fmt.png': 'PNG sequence (with transparency)',
      'audio.include': 'Include the sound',
      'audio.includePng': 'Also save the sound (audio.wav)',
      'btn.export': 'Export transition',

      'credits.title': 'Credits',
      'credits.nick': 'Creator of this tool',
      'credits.funkin': 'Friday Night Funkin\u2019 and its sticker transition',
      'credits.art': 'Stickers from the \u201c{name}\u201d pack: art by {artist}.',
      'credits.note': 'Fan project, unofficial and not affiliated with the game.',
      'close': 'Close',

      'ov.exporting': 'Exporting',
      'ov.preparing': 'Preparing…',
      'ov.mixing': 'Mixing sound…',
      'ov.finishing': 'Finishing the file…',
      'ov.canceling': 'Canceling…',
      'ov.frame': 'Frame {a} of {b}',
      'ov.done': 'Export finished',
      'ov.failed': 'Export failed',
      'ov.cannot': 'Cannot export',
      'ov.cancel': 'Cancel',
      'ov.reveal': 'Show in folder',

      'msg.loading': 'Loading…',
      'msg.loadingStickers': 'Loading stickers…',
      'msg.unusablePack': 'This pack has no usable stickers. Check the json and the image names.',
      'msg.putPack': 'Put a pack in the \u201cstickerpacks\u201d folder and press Reload.',
      'msg.folderError': 'The folders could not be read: {error}',
      'msg.onlyPage': 'You opened the page only. Open the application so it can read your packs and export.',
      'info.noPacks': 'No packs found. Create a folder inside \u201cstickerpacks\u201d with your stickers and the json, then press Reload.',
      'info.artist': 'Art by {artist}. ',
      'info.loaded': '{n} different stickers loaded from {total} images.',
      'info.missing': 'The images the json asks for were not found. Check that the names match.',
      'info.summary': '{mode}: {d} s, {f} frames, {n} stickers.',
      'info.resolution': '{w} × {h} at {fps} FPS.',
      'info.mp4Black': 'MP4 does not support transparency: a black background will be used.',
      'info.alpha': 'It will be exported with transparency.',

      'dlg.pickImage': 'Choose background image',
      'dlg.images': 'Images',
      'dlg.pngFolder': 'Folder where the PNG sequence will be created',
      'dlg.save': 'Save transition',

      'err.E_BUSY': 'An export is already running.',
      'err.E_FORMAT': 'Invalid format.',
      'err.E_SIZE': 'Invalid resolution or FPS.',
      'err.E_NO_FFMPEG': 'ffmpeg was not found.',
      'err.E_MP4_EVEN': 'MP4 needs an even width and height.',
      'err.E_FFMPEG_EXIT': 'ffmpeg finished with an error.',
      'err.E_FFMPEG_ENDED': 'ffmpeg ended too early.',
      'err.E_FFMPEG_INPUT': 'ffmpeg closed its input.',
      'err.E_NO_JOB': 'There is no active export.',
      'err.E_NOT_ALLOWED': 'File not allowed.'
    }
  };

  let lang = 'es';

  function t(key, params) {
    const table = dictionary[lang] || dictionary.es;
    let text = table[key];
    if (text === undefined) text = dictionary.es[key];
    if (text === undefined) return key;
    if (params) {
      for (const name of Object.keys(params)) text = text.split(`{${name}}`).join(String(params[name]));
    }
    return text;
  }

  function detect() {
    const code = String((navigator.languages && navigator.languages[0]) || navigator.language || 'es').toLowerCase();
    return code.startsWith('es') ? 'es' : 'en';
  }

  function setLang(next) {
    lang = dictionary[next] ? next : 'es';
    document.documentElement.lang = lang;
    document.title = t('app.title');
  }

  function apply(root) {
    const scope = root || document;
    for (const el of scope.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of scope.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
    for (const el of scope.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }

  window.FNF = window.FNF || {};
  window.FNF.i18n = { t, setLang, apply, detect, get lang() { return lang; } };
})();
