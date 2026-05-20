/**
 * Signal Desktop Sticker Auto-Emoji Assigner
 * 
 * Target Pack: HSR_Vol_1 (150 stickers)
 * 
 * Instructions:
 * 1. Open Signal Desktop, go to File > Create/upload sticker pack.
 * 2. Drag & drop the 'HSR_Vol_1' folder.
 * 3. Click "Next" to go to the "Choose Emojis" screen.
 * 4. Once there, press Ctrl + Shift + I to open Developer Tools.
 * 5. In DevTools, click the dropdown next to the word "top" (JavaScript Context)
 *    and select "Electron Isolated Context".
 * 6. Paste this entire script into the console and press Enter!
 */

(async () => {
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // CHANGE THIS NUMBER if you dragged from a file other than 0!
    // (e.g. if the first sticker shown on screen is 81_..., set this to 81)
    const offset = 0; 

    // Hardcoded emoji list matching the folder's files in order
    const emojis = ["😠", "😫", "😎", "🎨", "👍", "🤔", "😎", "🔥", "😰", "😄", "😡", "🧑‍🍳", "🤔", "😩", "🤔", "😮", "👍", "😤", "😊", "😊", "😭", "😏", "😊", "😉", "😋", "🥳", "🎶", "😩", "😭", "📸", "💡", "😴", "🥰", "👋", "🤑", "🥳", " exasperated", "🥺", "🤩", "🦋", "😜", "🎶", "😡", "🤔", "😁", "🕯️", "😉", "😏", "🤔", "😔", "😉", "😟", "😴", "😎", "😭", "🥰", "😉", "🤨", "😊", "😉", "😊", "🧐", "😩", "😤", "😏", "🥰", "😄", "😮", "😮", "😠", "🥺", "😻", "🤔", "😊", "😅", "😋", "😭", "😊", "😳", "🤔", "😭", "💪", "😴", "😮", "😢", "👋", "🤫", "😡", "🤔", "😒", "😉", "😢", "😊", "😊", "😔", "😏", "😄", "😉", "😉", "🥰", "🥺", "😳", "😮", "😠", "🥺", "👍", "😉", "😭", "✌️", "😉", "😊", "😅", "😮", "😴", "✨", "😩", "😖", "😔", "🥱", "😏", "🤔", "🥰", "😔", "😠", "👍", "❓", "✨", "🤩", "😠", "😴", "😉", "😌", "😒", "😤", "✍️", "🤔", "💰", "🤔", "😨", "👊", "😡", "🥰", "🤔", "😩", "😭", "👋", "🙏", "🚶", "🕰️", "🗑️"];

    // Get all emoji trigger buttons on the page
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        return btn.className && btn.className.includes('_emoji-button_');
    });

    console.log(`%cFound ${buttons.length} emoji buttons in Signal Creator. Target emojis count: ${emojis.length}`, 'color: #00ff00; font-weight: bold;');

    if (buttons.length === 0) {
        console.error("No emoji buttons found! Are you on the 'Choose Emojis' screen?");
        return;
    }

    if (offset < 0 || offset >= emojis.length) {
        console.error("Invalid offset entered. It must be between 0 and " + (emojis.length - 1));
        return;
    }

    console.log(`Using offset: ${offset}. Rotating emojis array...`);

    // Helper to close picker safely
    const closePicker = () => {
        const escEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(escEvent);
    };

    const limit = Math.min(buttons.length, emojis.length);

    for (let i = 0; i < limit; i++) {
        const btn = buttons[i];
        
        // Calculate the rotated emoji index
        const emojiIndex = (i + offset) % emojis.length;
        const emoji = emojis[emojiIndex];

        // Skip default/sparkle/unset emojis
        if (!emoji || emoji === "✨") {
            console.log(`[${i + 1}/${limit}] Skipping default sparkle at file index ${emojiIndex}.`);
            continue;
        }

        console.log(`[${i + 1}/${limit}] Mapping sticker to emoji: ${emoji} (file index ${emojiIndex})`);

        // Open the emoji picker
        btn.click();
        await delay(350); // Generous delay to let the picker load

        let clicked = false;

        // Try direct click on visible emojis in the popover
        const candidates = document.querySelectorAll('button, [role="button"], [role="option"]');
        for (const cand of candidates) {
            if (cand.textContent === emoji || cand.getAttribute('aria-label') === emoji || cand.getAttribute('data-emoji') === emoji) {
                cand.click();
                clicked = true;
                break;
            }
        }

        // If not found in default view, use the search input
        if (!clicked) {
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
            if (searchInput) {
                searchInput.value = emoji;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await delay(350); // Let search results load

                // Click first result
                const firstResult = document.querySelector('[role="option"], .emoji-button, button[class*="emoji"]');
                if (firstResult) {
                    firstResult.click();
                    clicked = true;
                }
            }
        }

        if (!clicked) {
            console.warn(`[${i + 1}/${limit}] Could not select emoji "${emoji}". Closing picker.`);
            closePicker();
        }

        await delay(250); // Generous pause between stickers
    }

    console.log("%cAuto-mapping completed!", "color: #00ff00; font-weight: bold; font-size: 14px;");
})();
