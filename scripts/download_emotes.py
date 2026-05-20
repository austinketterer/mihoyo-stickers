import os
import re
import sys
import json
import argparse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageSequence

sys.stdout.reconfigure(encoding='utf-8')

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
 
    # Try a sequence of configurations to find the best quality under 300KB
    configs = [
        (512, 80, 4),
        (512, 80, 6),
        (512, 60, 6),
        (384, 70, 6),
        (256, 60, 6),
        (256, 40, 6)
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
    
    # Check if file has already been downloaded (handles emoji-renamed files)
    dir_name = os.path.dirname(save_path)
    base_name = os.path.basename(save_path)
    name_parts = os.path.splitext(base_name)[0].split("_")
    
    if len(name_parts) >= 2:
        idx, emote_id = name_parts[0], name_parts[1]
        if os.path.exists(dir_name):
            for existing in os.listdir(dir_name):
                # Match e.g., "0_1234_✨.png" or "0_1234_😭.png"
                if f"_{emote_id}_" in existing or existing.startswith(f"{idx}_{emote_id}"):
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
    parser = argparse.ArgumentParser(description="Download and process MiHoYo emotes for Signal.")
    parser.add_argument("--game", choices=["hsr", "genshin", "zzz", "all"], default="all",
                        help="The game emotes to process (default: all)")
    parser.add_argument("--type", choices=["consolidated", "original", "both"], default="consolidated",
                        help="Output format: consolidated volumes, original packs, or both (default: consolidated)")
    args = parser.parse_args()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)
    metadata_path = os.path.join(base_dir, "data", "emotes_metadata.json")
    output_base = os.path.join(base_dir, "Signal_Packs")
    
    if not os.path.exists(metadata_path):
        print(f"Error: Metadata file not found at {metadata_path}")
        return
        
    with open(metadata_path, "r", encoding="utf-8") as f:
        packs = json.load(f)
        
    game_emotes = {'hsr': [], 'genshin': [], 'zzz': []}
    game_packs = {'hsr': [], 'genshin': [], 'zzz': []}
    
    for p in packs:
        game = get_pack_game(p['title'])
        if game in game_emotes:
            game_packs[game].append(p)
            for emote in p['emotes']:
                game_emotes[game].append(emote)
                
    # Select which games to process based on argument
    target_games = ['hsr', 'genshin', 'zzz'] if args.game == 'all' else [args.game]
    
    tasks = []
    
    for game in target_games:
        emotes = game_emotes[game]
        packs_list = game_packs[game]
        game_folder_prefix = game.upper()
        
        print(f"Found {len(emotes)} emotes in {len(packs_list)} packs for {game.upper()}.")
        
        # 1. Prepare Original Packs if selected
        if args.type in ["original", "both"]:
            original_base = os.path.join(output_base, "Original_Packs")
            for pack in packs_list:
                title = sanitize_filename(pack["title"])
                pack_folder = os.path.join(original_base, title)
                for emote in pack["emotes"]:
                    url = emote["url"]
                    is_gif = ".gif" in url.split("?")[0].lower()
                    ext = ".webp" if is_gif else ".png"
                    filename = f"{emote['sort']}_{emote['id']}{ext}"
                    save_path = os.path.join(pack_folder, filename)
                    tasks.append((url, save_path, is_gif))
                    
        # 2. Prepare Consolidated Packs if selected
        if args.type in ["consolidated", "both"]:
            consolidated_base = os.path.join(output_base, "Consolidated_Packs")
            for idx, emote in enumerate(emotes):
                volume_num = (idx // 150) + 1
                volume_folder = os.path.join(consolidated_base, f"{game_folder_prefix}_Vol_{volume_num}")
                url = emote["url"]
                is_gif = ".gif" in url.split("?")[0].lower()
                ext = ".webp" if is_gif else ".png"
                filename = f"{idx % 150}_{emote['id']}_✨{ext}"
                save_path = os.path.join(volume_folder, filename)
                tasks.append((url, save_path, is_gif))
                
    print(f"Total downloads/processes to schedule: {len(tasks)}")
    
    if len(tasks) == 0:
        print("No tasks to run.")
        return
        
    success = 0
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [executor.submit(download_and_process, url, path, is_gif) for url, path, is_gif in tasks]
        for i, future in enumerate(futures):
            if future.result():
                success += 1
            if (i+1) % 100 == 0:
                print(f"Progress: {i+1}/{len(tasks)} items processed...")
                
    print(f"Done! Successfully processed {success}/{len(tasks)} files.")

if __name__ == "__main__":
    main()
