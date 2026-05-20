# MiHoYo Sticker Signal Hub

A web-based interface and automation pipeline to download, process, auto-tag, and import official MiHoYo game emotes (Honkai: Star Rail, Genshin Impact, and Zenless Zone Zero) directly into **Signal Desktop**.

---

## Project Structure

```
mihoyo-stickers/
├── data/
│   ├── emoji_mappings.json      # Maps processed emote IDs to matching emojis
│   └── emotes_metadata.json     # Metadata list of official emote packs and URL CDN links
├── scripts/
│   ├── download_emotes.py       # Consolidated downloading and format conversion script
│   ├── tag_stickers_all_games.py# Auto-tags emotes with relevant emojis using Gemini API
│   └── generate_helper.py       # Generates auto-emoji JS array files for Signal Desktop pack creator
├── Signal_Packs/                # Processed transparent sticker images (512x512, <300KB)
│   └── Consolidated_Packs/      # Sticker volumes grouped in sets of 150 (e.g. HSR_Vol_1, ZZZ_Vol_2)
├── Downloaded_Packs/            # Raw downloaded Hoyolab assets (Git-ignored)
├── index.html                   # Web sticker-hub interface
├── app.js                       # Frontend UI and search logic
├── style.css                    # Sticker hub web styling
└── .gitignore                   # Ignores large raw downloads and python compiled caches
```

---

## How it Works

### 1. Downloading and Resizing Emotes
The pipeline downloads the raw sticker packs directly from the official Hoyolab CDN using [data/emotes_metadata.json](data/emotes_metadata.json). It automatically resizes static images to transparent PNGs and converts animated GIFs to optimized WebPs that strictly match Signal's requirements (exactly 512x512 size, under 300KB).

Run the consolidated downloader script:
```bash
python scripts/download_emotes.py --game all --type consolidated
```
* **Arguments**:
  * `--game`: `hsr`, `genshin`, `zzz`, or `all` (default: `all`)
  * `--type`: `consolidated` (sets of 150), `original` (default packs), or `both` (default: `consolidated`)

---

### 2. Auto-Tagging Stickers with Emojis
To make searching and importing stickers easier, the auto-tagger queries the Gemini API to analyze the visual content of the stickers and maps them to appropriate emojis, saving the results to [data/emoji_mappings.json](data/emoji_mappings.json).

Run the tagger:
```bash
python scripts/tag_stickers_all_games.py
```
*(Requires a valid Gemini API Key set inside the script)*

---

### 3. Creating Signal Sticker Packs
When uploading sticker packs via Signal Desktop, you must assign an emoji to every single sticker. To automate this:
1. Run the helper generator:
   ```bash
   python scripts/generate_helper.py [hsr/genshin/zzz] [volume_number]
   ```
   *Example*: `python scripts/generate_helper.py hsr 1`
2. This generates a file named `auto_emoji_helper.js` at the root.
3. You can paste this code into your browser console or Electron development console on Signal Desktop to auto-assign emojis to all 150 stickers in seconds.

---

### 4. Running the Web Hub Locally
You can run a local web server to browse the stickers:
```bash
python -m http.server 8000
```
Open your browser and navigate to **http://localhost:8000** to preview the sticker hub.
