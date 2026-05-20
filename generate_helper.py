import os
import sys
import json

def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_helper.py <game> <volume_number>")
        print("Example: python generate_helper.py hsr 1")
        sys.exit(1)
        
    game = sys.argv[1].lower()
    vol_num = sys.argv[2]
    
    game_folders = {
        'hsr': 'HSR',
        'genshin': 'Genshin',
        'zzz': 'ZZZ'
    }
    
    if game not in game_folders:
        print(f"Error: Unknown game '{game}'. Choose hsr, genshin, or zzz.")
        sys.exit(1)
        
    folder_name = f"{game_folders[game]}_Vol_{vol_num}"
    dir_path = os.path.join("Signal_Packs", "Consolidated_Packs", folder_name)
    
    if not os.path.isdir(dir_path):
        print(f"Error: Directory '{dir_path}' does not exist.")
        sys.exit(1)
        
    try:
        files = os.listdir(dir_path)
    except Exception as e:
        print(f"Error reading directory: {e}")
        sys.exit(1)
        
    # Sort files numerically by the first index (prefix)
    try:
        files_sorted = sorted(files, key=lambda x: int(x.split('_')[0]))
    except Exception as e:
        files_sorted = sorted(files)
        
    emojis = []
    for f in files_sorted:
        parts = f.split('_')
        if len(parts) >= 3:
            emoji = parts[2].split('.')[0]
            emojis.append(emoji)
        else:
            emojis.append("✨")
            
    # Generate the JS content
    js_content = f"""/**
 * Signal Desktop Sticker Auto-Emoji Assigner
 * 
 * Target Pack: {folder_name} ({len(emojis)} stickers)
 * 
 * Instructions:
 * 1. Open Signal Desktop, go to File > Create/upload sticker pack.
 * 2. Drag & drop the '{folder_name}' folder.
 * 3. Click "Next" to go to the "Choose Emojis" screen.
 * 4. Once there, press Ctrl + Shift + I to open Developer Tools.
 * 5. In DevTools, click the dropdown next to the word "top" (JavaScript Context)
 *    and select "Electron Isolated Context".
 * 6. Paste this entire script into the console and press Enter!
 */

(async () => {{
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // Hardcoded emoji list matching the folder's files in order
    const emojis = {json.dumps(emojis, ensure_ascii=False)};

    // Get all emoji trigger buttons on the page
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {{
        return btn.className.includes('_emoji-button_');
    }});

    console.log(`%cFound ${{buttons.length}} emoji buttons in Signal Creator. Target emojis count: ${{emojis.length}}`, 'color: #00ff00; font-weight: bold;');

    if (buttons.length === 0) {{
        console.error("No emoji buttons found! Are you on the 'Choose Emojis' screen?");
        return;
    }}

    const limit = Math.min(buttons.length, emojis.length);

    for (let i = 0; i < limit; i++) {{
        const btn = buttons[i];
        const emoji = emojis[i];

        // Skip default/sparkle/unset emojis
        if (!emoji || emoji === "✨") {{
            console.log(`[${{i + 1}}/${{limit}}] Skipping default sparkle.`);
            continue;
        }}

        console.log(`[${{i + 1}}/${{limit}}] Mapping to emoji: ${{emoji}}`);

        // Open the emoji picker for this sticker
        btn.click();
        await delay(120); // Wait for picker to open

        let clicked = false;

        // Try direct click if emoji is visible in the picker
        const candidates = document.querySelectorAll('button, [role="button"], [role="option"]');
        for (const cand of candidates) {{
            if (cand.textContent === emoji || cand.getAttribute('aria-label') === emoji || cand.getAttribute('data-emoji') === emoji) {{
                cand.click();
                clicked = true;
                break;
            }}
        }}

        // If not found in default view, use the picker search box
        if (!clicked) {{
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
            if (searchInput) {{
                searchInput.value = emoji;
                searchInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
                await delay(150); // Wait for search results to load

                // Click the first result
                const firstResult = document.querySelector('[role="option"], .emoji-button, button[class*="emoji"]');
                if (firstResult) {{
                    firstResult.click();
                    clicked = true;
                }}
            }}
        }}

        if (!clicked) {{
            console.warn(`[${{i + 1}}/${{limit}}] Could not select emoji "${{emoji}}". Closing picker.`);
            btn.click(); // Click again to close picker
        }}

        await delay(120); // Pause before next sticker
    }}

    console.log("%cAuto-mapping completed!", "color: #00ff00; font-weight: bold; font-size: 14px;");
}})();
"""

    output_path = "auto_emoji_helper.js"
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        print(f"SUCCESS: Generated {output_path} for {folder_name}!")
    except Exception as e:
        print(f"Error writing helper script: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
