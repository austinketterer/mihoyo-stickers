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

    // Hardcoded emoji list matching the folder's files in order
    const emojis = ["😠", "😫", "😎", "🎨", "👍", "🤔", "😎", "🔥", "😰", "😄", "😡", "🧑‍🍳", "🤔", "😩", "🤔", "😮", "👍", "😤", "😊", "😊", "😭", "😏", "😊", "😉", "😋", "🥳", "🎶", "😩", "😭", "📸", "💡", "😴", "🥰", "👋", "🤑", "🥳", " exasperated", "🥺", "🤩", "🦋", "😜", "🎶", "😡", "🤔", "😁", "🕯️", "😉", "😏", "🤔", "😔", "😉", "😟", "😴", "😎", "😭", "🥰", "😉", "🤨", "😊", "😉", "😊", "🧐", "😩", "😤", "😏", "🥰", "😄", "😮", "😮", "😠", "🥺", "😻", "🤔", "😊", "😅", "😋", "😭", "😊", "😳", "🤔", "😭", "💪", "😴", "😮", "😢", "👋", "🤫", "😡", "🤔", "😒", "😉", "😢", "😊", "😊", "😔", "😏", "😄", "😉", "😉", "🥰", "🥺", "😳", "😮", "😠", "🥺", "👍", "😉", "😭", "✌️", "😉", "😊", "😅", "😮", "😴", "✨", "😩", "😖", "😔", "🥱", "😏", "🤔", "🥰", "😔", "😠", "👍", "❓", "✨", "🤩", "😠", "😴", "😉", "😌", "😒", "😤", "✍️", "🤔", "💰", "🤔", "😨", "👊", "😡", "🥰", "🤔", "😩", "😭", "👋", "🙏", "🚶", "🕰️", "🗑️"];

    // Get all emoji trigger buttons on the page
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        return btn.className.includes('_emoji-button_');
    });

    console.log(`%cFound ${buttons.length} emoji buttons in Signal Creator. Target emojis count: ${emojis.length}`, 'color: #00ff00; font-weight: bold;');

    if (buttons.length === 0) {
        console.error("No emoji buttons found! Are you on the 'Choose Emojis' screen?");
        return;
    }

    const limit = Math.min(buttons.length, emojis.length);

    for (let i = 0; i < limit; i++) {
        const btn = buttons[i];
        const emoji = emojis[i];

        // Skip default/sparkle/unset emojis
        if (!emoji || emoji === "✨") {
            console.log(`[${i + 1}/${limit}] Skipping default sparkle.`);
            continue;
        }

        console.log(`[${i + 1}/${limit}] Mapping to emoji: ${emoji}`);

        // Open the emoji picker for this sticker
        btn.click();
        await delay(120); // Wait for picker to open

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
                await delay(150); // Wait for search results to load

                // Click the first result
                const firstResult = document.querySelector('[role="option"], .emoji-button, button[class*="emoji"]');
                if (firstResult) {
                    firstResult.click();
                    clicked = true;
                }
            }
        }

        if (!clicked) {
            console.warn(`[${i + 1}/${limit}] Could not select emoji "${emoji}". Closing picker.`);
            btn.click(); // Click again to close picker
        }

        await delay(120); // Pause before next sticker
    }

    console.log("%cAuto-mapping completed!", "color: #00ff00; font-weight: bold; font-size: 14px;");
})();
