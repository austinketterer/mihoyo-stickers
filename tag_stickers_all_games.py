import os
import sys
import json
import time
import base64
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

API_KEY = "AIzaSyDD6J5y67lnXBPrV95W-_M7Tn8MLm3zlcs"
BASE_DIR = r"c:\Users\Austin\Documents\Antigravity\filesystem cleanup\mihoyo-stickers"
CONSOLIDATED_DIR = os.path.join(BASE_DIR, "Signal_Packs", "Consolidated_Packs")
MAPPINGS_FILE = os.path.join(BASE_DIR, "emoji_mappings.json")

def analyze_batch(file_paths):
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={API_KEY}"
    
    parts = []
    # Add instruction
    parts.append({
        "text": (
            "You are given a list of sticker images from MiHoYo games (Honkai Star Rail, Genshin Impact, Zenless Zone Zero). "
            "For each image in order, identify the single best matching emoji (e.g. 😭, 😡, 😊, 😮, 👍, 🤔, 😴, 😤, 🥺). "
            "Return a JSON list containing ONLY the emoji characters, in the exact same order as the images. "
            "Do not include any markdown, markdown code blocks like ```json, or other text outside the JSON array. "
            "Output must be a valid JSON array of strings and nothing else. Example output: [\"😭\", \"😡\"]"
        )
    })
    
    # Add all images in base64
    for path in file_paths:
        mime_type = "image/webp" if path.endswith(".webp") else "image/png"
        try:
            with open(path, "rb") as f:
                img_data = base64.b64encode(f.read()).decode("utf-8")
            parts.append({
                "inlineData": {
                    "mimeType": mime_type,
                    "data": img_data
                }
            })
        except Exception as e:
            print(f"Error reading image {path}: {e}")
            return None
        
    payload = {
        "contents": [{"parts": parts}]
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        # 45 second timeout for larger batches
        with urllib.request.urlopen(req, timeout=45) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Clean up markdown code blocks if present
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text.rsplit("\n", 1)[0]
            text = text.strip()
            if text.startswith("json"):
                text = text[4:].strip()
            
            emojis = json.loads(text)
            if isinstance(emojis, list):
                # Clean up any non-emoji strings if the model returns them
                cleaned = []
                for emo in emojis:
                    # Strip spaces or words, default to a smiley if empty
                    cleaned.append(str(emo).strip())
                return cleaned
            return None
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        print(f"Error calling API: {e}")
        return None

def process_items(items, mappings):
    file_paths = [os.path.join(CONSOLIDATED_DIR, item[0], item[1]) for item in items]
    emojis = analyze_batch(file_paths)
    
    if emojis and len(emojis) == len(items):
        for item, emoji in zip(items, emojis):
            vol, filename, emote_id = item
            base_name, ext = os.path.splitext(filename)
            
            # Extract current index
            index = base_name.split("_")[0]
            # Strip wordy outputs, keep first character if it's emoji, or default to a standard one
            emoji = emoji.split()[0] if emoji else "✨"
            new_filename = f"{index}_{emote_id}_{emoji}{ext}"
            
            old_path = os.path.join(CONSOLIDATED_DIR, vol, filename)
            new_path = os.path.join(CONSOLIDATED_DIR, vol, new_filename)
            
            try:
                if os.path.exists(new_path) and old_path != new_path:
                    os.remove(new_path)
                os.rename(old_path, new_path)
                mappings[emote_id] = emoji
                print(f"  Renamed {filename} -> {new_filename} ({emoji})")
            except Exception as ex:
                print(f"  Failed to rename {filename}: {ex}")
                
        # Progressive save
        with open(MAPPINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(mappings, f, ensure_ascii=False, indent=4)
        return True
    else:
        print(f"  Batch failed or returned invalid length (Expected {len(items)}, got {len(emojis) if emojis else 0})")
        return False

def main():
    if not os.path.exists(CONSOLIDATED_DIR):
        print(f"Error: Consolidated packs directory not found at {CONSOLIDATED_DIR}")
        return
        
    # Read existing mappings
    mappings = {}
    if os.path.exists(MAPPINGS_FILE):
        try:
            with open(MAPPINGS_FILE, "r", encoding="utf-8") as f:
                mappings = json.load(f)
            print(f"Loaded {len(mappings)} existing mappings from JSON.")
        except Exception as e:
            print("Could not load existing mappings:", e)
            
    # Gather all files from ALL directories in Consolidated_Packs
    all_files = []
    for vol in os.listdir(CONSOLIDATED_DIR):
        vol_dir = os.path.join(CONSOLIDATED_DIR, vol)
        if not os.path.isdir(vol_dir):
            continue
        for f in os.listdir(vol_dir):
            if f.endswith(".png") or f.endswith(".webp"):
                all_files.append((vol, f))
                
    # Sort files to ensure stable order
    all_files.sort(key=lambda x: (x[0], x[1]))
    print(f"Found {len(all_files)} total sticker files to process.")
    
    # Filter files that need processing (don't have custom emoji in mappings)
    to_process = []
    for vol, filename in all_files:
        name_parts = os.path.splitext(filename)[0].split("_")
        if len(name_parts) >= 2:
            emote_id = name_parts[1]
            if emote_id not in mappings or mappings[emote_id] == "✨" or len(mappings[emote_id]) > 4:
                to_process.append((vol, filename, emote_id))
                
    print(f"Need to process {len(to_process)} stickers.")
    
    if len(to_process) == 0:
        print("All stickers already tagged!")
        return

    # Process in batches of 30
    batch_size = 30
    i = 0
    while i < len(to_process):
        batch = to_process[i:i + batch_size]
        print(f"\nProcessing batch {i//batch_size + 1}/{(len(to_process)-1)//batch_size + 1} ({len(batch)} items)...")
        
        success = process_items(batch, mappings)
        
        if not success:
            # Fallback to smaller sub-batches of 15
            print("  Falling back to sub-batches of 15...")
            sub_batch_size = 15
            for j in range(0, len(batch), sub_batch_size):
                sub_batch = batch[j:j + sub_batch_size]
                print(f"    Processing sub-batch {j//sub_batch_size + 1}/{(len(batch)-1)//sub_batch_size + 1} ({len(sub_batch)} items)...")
                process_items(sub_batch, mappings)
                if j + sub_batch_size < len(batch):
                    print("    Pausing 12 seconds between sub-batches...")
                    time.sleep(12)
                    
        i += batch_size
        
        # Pause to avoid rate limits (5 requests per minute -> 1 request every 12 seconds)
        if i < len(to_process):
            print("  Pausing 12 seconds to respect rate limits...")
            time.sleep(12)
            
    print("\nAll done! Mappings saved to emoji_mappings.json.")

if __name__ == "__main__":
    main()
