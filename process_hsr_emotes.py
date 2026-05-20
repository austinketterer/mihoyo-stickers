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

    # We check if there is only 1 frame
    with Image.open(BytesIO(in_data)) as img:
        is_animated = img.is_animated if hasattr(img, "is_animated") else False
        num_frames = img.n_frames if is_animated else 1
        
    if num_frames == 1:
        process_static_image(in_data, save_path.replace(".webp", ".png"), target_size)
        return

    # We will try a sequence of configurations to find the best quality under 300KB
    configs = [
        # (resolution, quality, method)
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
    
    # Check if already exists and is under 300KB
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

def main():
    metadata_path = r"c:\Users\Austin\Documents\Antigravity\filesystem cleanup\mihoyo-stickers\emotes_metadata.json"
    output_base = r"c:\Users\Austin\Documents\Antigravity\filesystem cleanup\mihoyo-stickers\Signal_Packs"
    
    with open(metadata_path, "r", encoding="utf-8") as f:
        packs = json.load(f)
        
    # Filter for HSR packs
    hsr_packs = [p for p in packs if 'pom-pom' in p['title'].lower() or 'star rail' in p['title'].lower() or 'trailblaze' in p['title'].lower()]
    print(f"Filtering complete: Found {len(hsr_packs)} Honkai: Star Rail packs.")
    
    tasks = []
    consolidated_tasks = []
    
    # Prepare original folders output
    original_base = os.path.join(output_base, "Original_Packs")
    for pack in hsr_packs:
        title = sanitize_filename(pack["title"])
        pack_folder = os.path.join(original_base, title)
        for emote in pack["emotes"]:
            url = emote["url"]
            is_gif = ".gif" in url.split("?")[0].lower()
            ext = ".webp" if is_gif else ".png"
            filename = f"{emote['sort']}_{emote['id']}{ext}"
            save_path = os.path.join(pack_folder, filename)
            tasks.append((url, save_path, is_gif))
            
    # Prepare consolidated folders output (max 200 per pack)
    consolidated_base = os.path.join(output_base, "Consolidated_Packs")
    all_hsr_emotes = []
    for pack in hsr_packs:
        for emote in pack["emotes"]:
            all_hsr_emotes.append(emote)
            
    for idx, emote in enumerate(all_hsr_emotes):
        volume_num = (idx // 150) + 1 # Use 150 per volume for a nice balanced size
        volume_folder = os.path.join(consolidated_base, f"HSR_Vol_{volume_num}")
        url = emote["url"]
        is_gif = ".gif" in url.split("?")[0].lower()
        ext = ".webp" if is_gif else ".png"
        filename = f"{idx % 150}_{emote['id']}_✨{ext}"
        save_path = os.path.join(volume_folder, filename)
        consolidated_tasks.append((url, save_path, is_gif))
        
    print(f"Total HSR emotes to download and process: {len(tasks)}")
    print(f"Generating {len(consolidated_tasks)} consolidated volume items...")
    
    # Run processing concurrently
    success_orig = 0
    success_con = 0
    
    print("\nProcessing original pack folders...")
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [executor.submit(download_and_process, url, path, is_gif) for url, path, is_gif in tasks]
        for i, future in enumerate(futures):
            if future.result():
                success_orig += 1
            if (i+1) % 100 == 0:
                print(f"Original packs progress: {i+1}/{len(tasks)} processed...")
                
    print("\nProcessing consolidated volumes...")
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [executor.submit(download_and_process, url, path, is_gif) for url, path, is_gif in consolidated_tasks]
        for i, future in enumerate(futures):
            if future.result():
                success_con += 1
            if (i+1) % 100 == 0:
                print(f"Consolidated volumes progress: {i+1}/{len(consolidated_tasks)} processed...")
                
    print(f"\nDone! Processed {success_orig} original pack files and {success_con} consolidated pack files.")

if __name__ == "__main__":
    main()
