<p align="center">
  <img src="assets/icon.png" alt="FNF Sticker Transition Maker icon" width="128" height="128">
</p>

<h1 align="center">FNF Sticker Transition Maker</h1>

<p align="center">Made by NickDZ.</p>

Creates the Friday Night Funkin' sticker transition and exports it as video (WebM, MOV, MP4) or a PNG sequence. The app is available in Spanish and English (ES / EN buttons at the top right).

## Build the .exe

1. Install Node.js 18 or newer.
2. On Windows, run `build.bat` (or `npm install` and `npm run build`).

The result is in `build/` and contains only:

- `FNF Sticker Transition Maker.exe`
- `readme.txt` (credits)
- `stickerpacks/`
- `sounds/`

The .exe is portable: no installation needed. Both folders must stay next to it.

## Run from source

Run `start.bat` (or `npm install` and `npm start`).

## Sticker packs

One folder per pack inside `stickerpacks/` (you can also drop the PNGs and the JSON directly into `stickerpacks/`). Each pack contains the PNGs and, optionally, a JSON file using the `stickers-set-1` format (`name`, `artist`, `stickers`, `stickerPacks`). Names in the JSON are looked up as `<name>.png`, ignoring case and subfolders. Without a JSON, all PNGs in the folder are used.

## Sounds

One subfolder per group inside `sounds/`, for example `sounds/keys/keyClick1.ogg`.

## Seed

The same seed with the same randomness, resolution and mode settings always produces the same transition. FPS does not change the design, only how many frames are saved.

## Credits

NickDZ and the Funkin' Crew. Fan project, unofficial.