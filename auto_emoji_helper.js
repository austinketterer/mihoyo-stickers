/**
 * Signal Desktop Sticker Auto-Emoji Assigner
 * 
 * Instructions:
 * 1. Open Signal Desktop, go to File > Create/upload sticker pack.
 * 2. Drag & drop the HSR_Vol_1 folder (or any compiled folder).
 * 3. Once they load, press Ctrl + Shift + I to open Developer Tools.
 * 4. In DevTools, click the dropdown next to the word "top" (JavaScript Context)
 *    and select "Electron Isolated Context".
 * 5. Paste this entire script into the console and press Enter!
 */

(async () => {
    // Delay helper
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // 1. Locate all sticker items (independent of randomized classnames)
    function getStickerItems() {
        const list = [];
        const imgs = document.querySelectorAll('img');
        
        imgs.forEach(img => {
            if (img.src && img.src.startsWith('file://')) {
                // Find the parent container that has a button
                let parent = img.parentElement;
                while (parent && !parent.querySelector('button')) {
                    parent = parent.parentElement;
                }
                if (parent) {
                    const btn = parent.querySelector('button');
                    list.push({ img, btn });
                }
            }
        });
        return list;
    }

    // 2. Extract emoji from local filename
    function extractEmoji(src) {
        try {
            const decoded = decodeURIComponent(src);
            const filename = decoded.substring(decoded.lastIndexOf('/') + 1);
            const parts = filename.split('_');
            if (parts.length < 2) return null;
            
            // Get string after last underscore and remove file extension
            const emojiPart = parts[parts.length - 1].split('.')[0];
            return emojiPart.trim();
        } catch (e) {
            return null;
        }
    }

    const items = getStickerItems();
    console.log(`%cFound ${items.length} stickers in Signal Creator. Starting mapping...`, 'color: #00ff00; font-weight: bold;');

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const emoji = extractEmoji(item.img.src);

        // Skip default/sparkle emojis
        if (!emoji || emoji === "✨" || emoji === "star") {
            console.log(`[${i + 1}/${items.length}] Skipping default sparkle or invalid emoji.`);
            continue;
        }

        console.log(`[${i + 1}/${items.length}] Mapping to emoji: ${emoji}`);

        // Open the emoji picker for this sticker
        item.btn.click();
        await delay(150); // Wait for picker popover to open

        let clicked = false;

        // Try direct click if emoji is visible in the picker
        const candidates = document.querySelectorAll('button, [role="button"], [role="option"]');
        for (const cand of candidates) {
            if (cand.textContent === emoji || cand.getAttribute('aria-label') === emoji || cand.getAttribute('data-emoji') === emoji) {
                cand.click();
                clicked = true;
                break;
            }
        }

        // If not found in default view, use the picker search box
        if (!clicked) {
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
            if (searchInput) {
                searchInput.value = emoji;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await delay(200); // Wait for search results to load

                // Click the first result
                const firstResult = document.querySelector('[role="option"], .emoji-button, button[class*="emoji"]');
                if (firstResult) {
                    firstResult.click();
                    clicked = true;
                }
            }
        }

        if (!clicked) {
            console.warn(`[${i + 1}/${items.length}] Could not auto-click "${emoji}". Closing picker.`);
            // Click the button again to close the picker so it doesn't block the next one
            item.btn.click();
        }

        await delay(150); // Pause before next sticker
    }

    console.log("%cAuto-mapping completed!", "color: #00ff00; font-weight: bold; font-size: 14px;");
})();
