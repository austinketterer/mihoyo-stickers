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
    const offset = 0; 

    // Hardcoded emoji list matching the folder's files in order
    const emojis = ["😠", "😫", "😎", "🎨", "👍", "🤔", "😎", "🔥", "😰", "😄", "😡", "🧑‍🍳", "🤔", "😩", "🤔", "😮", "👍", "😤", "😊", "😊", "😭", "😏", "😊", "😉", "😋", "🥳", "🎶", "😩", "😭", "📸", "💡", "😴", "🥰", "👋", "🤑", "🥳", " exasperated", "🥺", "🤩", "🦋", "😜", "🎶", "😡", "🤔", "😁", "🕯️", "😉", "😏", "🤔", "😔", "😉", "😟", "😴", "😎", "😭", "🥰", "😉", "🤨", "😊", "😉", "😊", "🧐", "😩", "😤", "😏", "🥰", "😄", "😮", "😮", "😠", "🥺", "😻", "🤔", "😊", "😅", "😋", "😭", "😊", "😳", "🤔", "😭", "💪", "😴", "😮", "😢", "👋", "🤫", "😡", "🤔", "😒", "😉", "😢", "😊", "😊", "😔", "😏", "😄", "😉", "😉", "🥰", "🥺", "😳", "😮", "😠", "🥺", "👍", "😉", "😭", "✌️", "😉", "😊", "😅", "😮", "😴", "✨", "😩", "😖", "😔", "🥱", "😏", "🤔", "🥰", "😔", "😠", "👍", "❓", "✨", "🤩", "😠", "😴", "😉", "😌", "😒", "😤", "✍️", "🤔", "💰", "🤔", "😨", "👊", "😡", "🥰", "🤔", "😩", "😭", "👋", "🙏", "🚶", "🕰️", "🗑️"];

    // Get all sticker containers on the page
    const containers = Array.from(document.querySelectorAll('div')).filter(el => {
        return el.className && el.className.includes('_container_') && el.querySelector('img') && el.querySelector('button');
    });

    console.log(`%cFound ${containers.length} sticker containers in Signal Creator. Target emojis count: ${emojis.length}`, 'color: #00ff00; font-weight: bold;');

    if (containers.length === 0) {
        console.error("No sticker containers found! Are you on the 'Choose Emojis' screen?");
        return;
    }

    if (offset < 0 || offset >= emojis.length) {
        console.error("Invalid offset entered. It must be between 0 and " + (emojis.length - 1));
        return;
    }

    console.log(`Using offset: ${offset}. Rotating emojis array...`);

    // Helper to detect if picker is currently open
    const isPickerOpen = () => {
        return !!document.querySelector('input[type="search"], input[placeholder*="Search"]');
    };

    // Helper to close picker safely and aggressively
    const closePicker = () => {
        const escOpts = {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true
        };
        // Send Escape event everywhere
        document.dispatchEvent(new KeyboardEvent('keydown', escOpts));
        document.body.dispatchEvent(new KeyboardEvent('keydown', escOpts));
        if (document.activeElement) {
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown', escOpts));
            document.activeElement.blur();
        }
        // Click outside (on heading)
        const header = document.querySelector('h2') || document.querySelector('h1');
        if (header) {
            header.click();
        }
    };

    const limit = Math.min(containers.length, emojis.length);

    for (let i = 0; i < limit; i++) {
        const container = containers[i];
        const btn = container.querySelector('button');

        if (!btn) continue;
        
        // Calculate the rotated emoji index
        const emojiIndex = (i + offset) % emojis.length;
        const emoji = emojis[emojiIndex];

        // Skip default/sparkle/unset emojis
        if (!emoji || emoji === "✨") {
            console.log(`[${i + 1}/${limit}] Skipping default sparkle at file index ${emojiIndex}.`);
            continue;
        }

        // 1. Ensure any lingering pickers are closed first
        if (isPickerOpen()) {
            closePicker();
            for (let j = 0; j < 10; j++) {
                if (!isPickerOpen()) break;
                await delay(100);
            }
        }

        // 2. Scroll container into view instantly (no smooth transition)
        container.scrollIntoView({ block: 'center' });
        await delay(100); // Settle layout instantly

        console.log(`[${i + 1}/${limit}] Mapping sticker to emoji: ${emoji} (file index ${emojiIndex})`);

        // 3. Open the emoji picker
        btn.click();
        
        // 4. Wait dynamically for the picker to open (max 1 second)
        let opened = false;
        for (let j = 0; j < 10; j++) {
            if (isPickerOpen()) {
                opened = true;
                break;
            }
            await delay(100);
        }

        if (!opened) {
            console.warn(`[${i + 1}/${limit}] Picker failed to open. Retrying click...`);
            btn.click();
            await delay(400);
        }

        let clicked = false;

        // 5. Try direct click on visible emojis in the popover
        const candidates = document.querySelectorAll('button, [role="button"], [role="option"]');
        for (const cand of candidates) {
            if (cand.textContent === emoji || cand.getAttribute('aria-label') === emoji || cand.getAttribute('data-emoji') === emoji) {
                cand.click();
                clicked = true;
                break;
            }
        }

        // 6. If not found in default view, use the search input
        if (!clicked) {
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
            if (searchInput) {
                searchInput.value = emoji;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await delay(350); // Wait for search results to load

                // Click first result
                const firstResult = document.querySelector('[role="option"], .emoji-button, button[class*="emoji"]');
                if (firstResult) {
                    firstResult.click();
                    clicked = true;
                }
            }
        }

        // 7. Wait dynamically for the picker to close (max 1 second)
        let closed = false;
        for (let j = 0; j < 10; j++) {
            if (!isPickerOpen()) {
                closed = true;
                break;
            }
            await delay(100);
        }

        // 8. If still open, force close it
        if (!closed) {
            console.warn(`[${i + 1}/${limit}] Picker still open. Force closing.`);
            closePicker();
            for (let j = 0; j < 10; j++) {
                if (!isPickerOpen()) break;
                await delay(100);
            }
        }

        await delay(100); // Brief safety pause before scrolling to the next
    }

    console.log("%cAuto-mapping completed!", "color: #00ff00; font-weight: bold; font-size: 14px;");
})();
