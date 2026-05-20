import os
import re
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageSequence

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def process_static_image(in_data, save_path, target_size=(512, 512)):
    from io import BytesIO
    with Image.open(BytesIO(in_data)) as img:
        img = img.convert("RGBA")
        img.thumbnail(target_size, Image.Resampling.LANCZOS)
        background = Image.new("RGBA", target_size, (0, 0, 0, 0))
        x = (target_size[0] - img.width) // 2
        y = (target_size[1] - img.height) // 2
        background.paste(img, (x, y))
        
        # Save PNG with optimization
        background.save(save_path, "PNG", optimize=True)
        
        # If still over 300KB, save with quantization
        if os.path.exists(save_path) and os.path.getsize(save_path) > 300 * 1024:
            quantized = background.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
            quantized.save(save_path, "PNG", optimize=True)
            
        # If STILL over 300KB, reduce size slightly
        if os.path.exists(save_path) and os.path.getsize(save_path) > 300 * 1024:
            img_small = img.copy()
            img_small.thumbnail((384, 384), Image.Resampling.LANCZOS)
            bg_small = Image.new("RGBA", target_size, (0, 0, 0, 0))
            x = (target_size[0] - img_small.width) // 2
            y = (target_size[1] - img_small.height) // 2
            bg_small.paste(img_small, (x, y))
            bg_small.save(save_path, "PNG", optimize=True)

def process_gif_to_webp(in_data, save_path, target_size=(512, 512)):
    from io import BytesIO
    
    def build_frames(size):
        with Image.open(BytesIO(in_data)) as img:
            frames = []
            durations = []
            for frame in ImageSequence.Iterator(img):
                frame_rgba = frame.convert("RGBA")
                frame_rgba.thumbnail(size, Image.Resampling.LANCZOS)
                background = Image.new("RGBA", target_size, (0, 0, 0, 0))
                x = (target_size[0] - frame_rgba.width) // 2
                y = (target_size[1] - frame_rgba.height) // 2
                background.paste(frame_rgba, (x, y))
                frames.append(background)
                durations.append(img.info.get("duration", 100))
            return frames, durations, img.info.get("loop", 0)

    # Check if there is only 1 frame
    with Image.open(BytesIO(in_data)) as img:
        is_animated = img.is_animated if hasattr(img, "is_animated") else False
        num_frames = img.n_frames if is_animated else 1
        
    if num_frames == 1:
        process_static_image(in_data, save_path.replace(".webp", ".png"), target_size)
        return
 
    configs = [
        (512, 80, 4),
        (384, 75, 4),
        (256, 70, 4)
    ]

    for res, qual, meth in configs:
        frames, durations, loop = build_frames((res, res))
        frames[0].save(
            save_path,
            "WEBP",
            save_all=True,
            append_images=frames[1:],
            loop=loop,
            duration=durations,
            minimize_size=True,
            quality=qual,
            method=meth
        )
        if os.path.exists(save_path) and os.path.getsize(save_path) <= 300 * 1024:
            break

def download_and_process(url, save_path, is_gif=False):
    base_url = url.split("?")[0]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # Check if already exists (with any suffix, just checking if processed)
    # The file could be renamed, e.g. Y_ID_emoji.png, so we check if any file in the folder ends with _ID_emoji.ext
    # Or for simplicity, check if the specific save_path or its variants exist.
    dir_name = os.path.dirname(save_path)
    base_name = os.path.basename(save_path)
    # filename is idx_id_✨.ext
    name_parts = os.path.splitext(base_name)[0].split("_")
    if len(name_parts) >= 2:
        idx, emote_id = name_parts[0], name_parts[1]
        if os.path.exists(dir_name):
            for existing in os.listdir(dir_name):
                if f"_{emote_id}_" in existing or existing.startswith(f"{idx}_{emote_id}"):
                    # Already exists and processed!
                    return True
                    
    if os.path.exists(save_path) and os.path.getsize(save_path) <= 300 * 1024:
        return True
        
    req = urllib.request.Request(base_url, headers=headers)
    try:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read()
            
        if is_gif:
            process_gif_to_webp(data, save_path)
        else:
            process_static_image(data, save_path)
        return True
    except Exception as e:
        try:
            req_orig = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req_orig, timeout=10) as response:
                data = response.read()
            if is_gif:
                process_gif_to_webp(data, save_path)
            else:
                process_static_image(data, save_path)
            return True
        except Exception as e2:
            print(f"Failed to download/process {base_url}: {e2}")
            return False

def get_pack_game(title):
    t = title.lower()
    if 'pom-pom' in t or 'star rail' in t or 'trailblaze' in t or 'hsr' in t or 'warp center' in t:
        return 'hsr'
    elif ('paimon' in t or 'genshin' in t or 'traveler' in t or 'paintings' in t or 
          'teyvat' in t or 'hilichurl' in t or 'lanternlit' in t or 'soaring kites' in t or 
          'eula' in t or 'hu tao' in t or 'tartaglia' in t or 'yae miko' in t or 
          'liyue' in t or 'mondstadt' in t or 'fontaine' in t or 'sumeru' in t or 
          'inazuma' in t or 'natlan' in t or 'spring festival' in t or 'let\'s go!' in t or 
          'good fortune' in t):
        return 'genshin'
    elif ('zenless' in t or 'zzz' in t or 'sugar rush' in t or 'new eridu' in t or 
          'planet stamps' in t or 'type ii' in t or 'cunning hares' in t or 'drip fest' in t):
        return 'zzz'
    return 'other'

def main():
    metadata_path = r"c:\Users\Austin\Documents\Antigravity\filesystem cleanup\mihoyo-stickers\emotes_metadata.json"
    output_base = r"c:\Users\Austin\Documents\Antigravity\filesystem cleanup\mihoyo-stickers\Signal_Packs\Consolidated_Packs"
    
    with open(metadata_path, "r", encoding="utf-8") as f:
        packs = json.load(f)
        
    game_emotes = {'hsr': [], 'genshin': [], 'zzz': []}
    
    for p in packs:
        game = get_pack_game(p['title'])
        if game in game_emotes:
            for emote in p['emotes']:
                game_emotes[game].append(emote)
                
    print(f"Loaded emotes: HSR={len(game_emotes['hsr'])}, Genshin={len(game_emotes['genshin'])}, ZZZ={len(game_emotes['zzz'])}")
    
    tasks = []
    # Build list of download tasks for Genshin and ZZZ (HSR is already processed)
    for game in ['genshin', 'zzz']:
        emotes = game_emotes[game]
        game_folder_prefix = 'Genshin' if game == 'genshin' else 'ZZZ'
        
        for idx, emote in enumerate(emotes):
            volume_num = (idx // 150) + 1
            volume_folder = os.path.join(output_base, f"{game_folder_prefix}_Vol_{volume_num}")
            
            url = emote["url"]
            is_gif = ".gif" in url.split("?")[0].lower()
            ext = ".webp" if is_gif else ".png"
            filename = f"{idx % 150}_{emote['id']}_✨{ext}"
            save_path = os.path.join(volume_folder, filename)
            tasks.append((url, save_path, is_gif))
            
    print(f"Total new stickers to process (Genshin + ZZZ): {len(tasks)}")
    
    if len(tasks) == 0:
        print("No new stickers to process.")
        return
        
    success = 0
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [executor.submit(download_and_process, url, path, is_gif) for url, path, is_gif in tasks]
        for i, future in enumerate(futures):
            if future.result():
                success += 1
            if (i+1) % 100 == 0:
                print(f"Progress: {i+1}/{len(tasks)} processed...")
                
    print(f"Done! Successfully processed {success}/{len(tasks)} files.")

if __name__ == "__main__":
    main()
