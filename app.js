// Placeholder links for Signal Packs - User can replace these with the actual links after uploading
const SIGNAL_LINKS = {
    hsr: {
        vol1: "https://signal.art/addstickers/#pack_id_hsr_vol_1",
        vol2: "https://signal.art/addstickers/#pack_id_hsr_vol_2",
        vol3: "https://signal.art/addstickers/#pack_id_hsr_vol_3",
        vol4: "https://signal.art/addstickers/#pack_id_hsr_vol_4"
    },
    genshin: {
        vol1: "https://signal.art/addstickers/#pack_id_genshin_vol_1",
        vol2: "https://signal.art/addstickers/#pack_id_genshin_vol_2",
        vol3: "https://signal.art/addstickers/#pack_id_genshin_vol_3",
        vol4: "https://signal.art/addstickers/#pack_id_genshin_vol_4",
        vol5: "https://signal.art/addstickers/#pack_id_genshin_vol_5"
    },
    zzz: {
        vol1: "https://signal.art/addstickers/#pack_id_zzz_vol_1",
        vol2: "https://signal.art/addstickers/#pack_id_zzz_vol_2"
    }
};

let hsrPacks = [];
let hsrEmotesFlat = [];
let genshinPacks = [];
let genshinEmotesFlat = [];
let zzzPacks = [];
let zzzEmotesFlat = [];

let emojiMappings = {};

// Filtering state
let searchQuery = '';
let activeGame = 'hsr'; // 'hsr', 'genshin', 'zzz'

// Modal state
let currentModalType = ''; // 'volume'
let currentModalVolNum = null;
let currentModalPackTitle = '';
let currentModalEmotes = [];

// Determine which game a pack belongs to
function getPackGame(pack) {
    const title = (pack.title || '').toLowerCase();
    if (title.includes('pom-pom') || title.includes('star rail') || title.includes('trailblaze') || title.includes('hsr') || title.includes('warp center')) {
        return 'hsr';
    } else if (title.includes('paimon') || title.includes('genshin') || title.includes('traveler') || title.includes('paintings')) {
        return 'genshin';
    } else if (title.includes('zenless') || title.includes('zzz') || title.includes('sugar rush') || title.includes('new eridu') || title.includes('planet stamps')) {
        return 'zzz';
    }
    return 'other';
}

// Determine which game an emote belongs to
function getEmoteGame(emote) {
    const title = (emote.packTitle || '').toLowerCase();
    if (title.includes('pom-pom') || title.includes('star rail') || title.includes('trailblaze') || title.includes('hsr') || title.includes('warp center')) {
        return 'hsr';
    } else if (title.includes('paimon') || title.includes('genshin') || title.includes('traveler') || title.includes('paintings')) {
        return 'genshin';
    } else if (title.includes('zenless') || title.includes('zzz') || title.includes('sugar rush') || title.includes('new eridu') || title.includes('planet stamps')) {
        return 'zzz';
    }
    return 'other';
}

// Return active flat list
function getEmotesFlatForActiveGame() {
    if (activeGame === 'hsr') return hsrEmotesFlat;
    if (activeGame === 'genshin') return genshinEmotesFlat;
    if (activeGame === 'zzz') return zzzEmotesFlat;
    return [];
}

// Resolve Signal pack URL
function getSignalLink(game, volNum) {
    if (SIGNAL_LINKS[game] && SIGNAL_LINKS[game][`vol${volNum}`]) {
        return SIGNAL_LINKS[game][`vol${volNum}`];
    }
    return `https://signal.art/addstickers/#pack_id_${game}_vol_${volNum}_placeholder`;
}

// Helper to get local sticker path from consolidated volumes
function getStickerLocalPath(emote) {
    const game = getEmoteGame(emote);
    let flatList = [];
    let gameFolder = '';
    
    if (game === 'hsr') {
        flatList = hsrEmotesFlat;
        gameFolder = 'HSR';
    } else if (game === 'genshin') {
        flatList = genshinEmotesFlat;
        gameFolder = 'Genshin';
    } else if (game === 'zzz') {
        flatList = zzzEmotesFlat;
        gameFolder = 'ZZZ';
    } else {
        return emote.url; // fallback
    }
    
    const globalIndex = flatList.findIndex(e => e.id === emote.id);
    if (globalIndex === -1) return emote.url; // fallback to HoYoLAB URL
    
    const volNum = Math.floor(globalIndex / 150) + 1;
    const volIndex = globalIndex % 150;
    const isGif = emote.url.split('?')[0].toLowerCase().endsWith('.gif');
    const ext = isGif ? '.webp' : '.png';
    const emoji = emojiMappings[emote.id] || "✨";
    return `Signal_Packs/Consolidated_Packs/${gameFolder}_Vol_${volNum}/${volIndex}_${emote.id}_${emoji}${ext}`;
}

// Fetch and load metadata
async function loadStickerHub() {
    try {
        // Load emoji mappings
        try {
            const mappingsResponse = await fetch('emoji_mappings.json');
            emojiMappings = await mappingsResponse.json();
        } catch (err) {
            console.warn("Could not load emoji mappings, falling back to default ✨:", err);
        }
        
        // Fetch metadata
        const response = await fetch('emotes_metadata.json');
        const packs = await response.json();
        
        // Categorize packs and flat emotes
        packs.forEach(pack => {
            const game = getPackGame(pack);
            const flatEmotes = pack.emotes.map(emote => ({
                ...emote,
                packTitle: pack.title
            }));
            
            if (game === 'hsr') {
                hsrPacks.push(pack);
                hsrEmotesFlat.push(...flatEmotes);
            } else if (game === 'genshin') {
                genshinPacks.push(pack);
                genshinEmotesFlat.push(...flatEmotes);
            } else if (game === 'zzz') {
                zzzPacks.push(pack);
                zzzEmotesFlat.push(...flatEmotes);
            }
        });

        // Initialize features
        setupThemeSwitcher();
        filterAllViews();
        setupEventListeners();
    } catch (err) {
        console.error("Error loading sticker data:", err);
    }
}

// Configures mouse glow tracking on cards
function setupCardGlow(card) {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
}

// Central filtering controller
function filterAllViews() {
    const query = searchQuery.toLowerCase().trim();
    const flatList = getEmotesFlatForActiveGame();
    
    // Update stats
    document.getElementById('stat-packs').textContent = Math.ceil(flatList.length / 150);
    document.getElementById('stat-stickers').textContent = flatList.length;
    
    const volumeSize = 150;
    const totalVolumes = Math.ceil(flatList.length / volumeSize);
    
    const container = document.getElementById('packs-container');
    container.innerHTML = '';
    
    for (let i = 0; i < totalVolumes; i++) {
        const volNum = i + 1;
        const volEmotes = flatList.slice(i * volumeSize, (i + 1) * volumeSize);
        
        // Count matches within this volume
        const matchCount = volEmotes.filter(emote => {
            return !query || emote.packTitle.toLowerCase().includes(query);
        }).length;
        
        // Show volume cards if filter matches or no query
        if (matchCount > 0 || !query) {
            renderSignalPackCard(volNum, volEmotes, matchCount);
        }
    }
}

// Render a single Consolidated Signal Card
function renderSignalPackCard(volNum, volEmotes, matchCount) {
    const container = document.getElementById('packs-container');
    const signalLink = getSignalLink(activeGame, volNum);
    
    const card = document.createElement('div');
    card.className = 'card';
    setupCardGlow(card);
    
    // Preview first 8 stickers mapped to consolidated path
    let previewHtml = '';
    volEmotes.slice(0, 8).forEach((emote) => {
        const localPath = getStickerLocalPath(emote);
        previewHtml += `<img class="preview-sticker" src="${localPath}" alt="Sticker" loading="lazy" onerror="this.onerror=null; this.src='${emote.url}';">`;
    });

    const isFiltered = searchQuery !== '';
    let gameTitle = '';
    if (activeGame === 'hsr') gameTitle = 'HSR';
    else if (activeGame === 'genshin') gameTitle = 'Genshin';
    else if (activeGame === 'zzz') gameTitle = 'ZZZ';

    const badgeHtml = isFiltered 
        ? `<span class="badge">${matchCount} Matches</span>`
        : `<span class="badge">${gameTitle} Vol. ${volNum}</span>`;

    card.innerHTML = `
        <div class="card-glow"></div>
        <div class="card-header">
            <h3 class="card-title">${gameTitle} Emotes Vol. ${volNum}</h3>
            <div class="card-meta">
                ${badgeHtml}
                <span>${volEmotes.length} Stickers</span>
            </div>
        </div>
        <div class="card-preview">
            ${previewHtml}
        </div>
        <div class="card-actions">
            <a href="${signalLink}" class="btn btn-primary" target="_blank">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 2.224.723 4.28 1.94 5.952l-1.39 5.097 5.25-1.348C9.333 22.583 10.635 22.84 12 22.84c5.523 0 10-4.477 10-10S17.523 2 12 2zm.05 16.03c-2.316 0-4.32-.976-5.748-2.525.138-.636.568-1.187 1.258-1.378 1.09-.3 2.19-.51 3.32-.63.78.78 1.83 1.27 3.01 1.27 1.25 0 2.36-.55 3.12-1.42 1.06.13 2.1.34 3.12.63.66.19 1.06.72 1.19 1.34-1.38 1.63-3.44 2.713-5.83 2.713-.82 0-1.63-.1-2.44-.01z"/>
                </svg>
                Add to Signal
            </a>
            <button class="btn btn-secondary view-vol-btn" data-vol="${volNum}">Browse Pack</button>
        </div>
    `;
    
    container.appendChild(card);
}

// Setup Event Listeners
function setupEventListeners() {
    // Game Tabs toggles
    const tabHsr = document.getElementById('tab-hsr');
    const tabGenshin = document.getElementById('tab-genshin');
    const tabZzz = document.getElementById('tab-zzz');

    tabHsr.addEventListener('click', () => {
        switchGameTab('hsr');
    });
    tabGenshin.addEventListener('click', () => {
        switchGameTab('genshin');
    });
    tabZzz.addEventListener('click', () => {
        switchGameTab('zzz');
    });

    function switchGameTab(game) {
        activeGame = game;
        
        document.querySelectorAll('.tabs-container .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`tab-${game}`).classList.add('active');
        
        // Reset search inside main view
        document.getElementById('search-input').value = '';
        searchQuery = '';
        
        filterAllViews();
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        filterAllViews();
    });

    // Modal Close handlers
    const modal = document.getElementById('pack-modal');
    const closeBtn = document.getElementById('close-modal');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Inner modal sticker search filter handler
    const modalSearchInput = document.getElementById('modal-search-input');
    modalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderModalGallery(currentModalEmotes);
            return;
        }
        
        const filtered = currentModalEmotes.filter(emote => {
            const matchesId = emote.id.toString().includes(query);
            const matchesPack = emote.packTitle && emote.packTitle.toLowerCase().includes(query);
            return matchesId || matchesPack;
        });
        
        renderModalGallery(filtered);
    });

    // Keyboard shortcut tracker (Press / to focus search)
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== modalSearchInput) {
            if (modal.classList.contains('active')) {
                e.preventDefault();
                modalSearchInput.focus();
                modalSearchInput.select();
            } else {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    // Delegated click handlers for dynamic buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-vol-btn')) {
            const volNum = parseInt(e.target.getAttribute('data-vol'));
            openVolumeModal(volNum);
        } else if (e.target.classList.contains('copy-btn')) {
            const url = e.target.getAttribute('data-url');
            const fallbackUrl = e.target.getAttribute('data-fallback-url');
            copyStickerToClipboard(url, fallbackUrl);
        } else if (e.target.classList.contains('download-btn')) {
            const url = e.target.getAttribute('data-url');
            const fallbackUrl = e.target.getAttribute('data-fallback-url');
            const id = e.target.getAttribute('data-id');
            downloadSticker(url, fallbackUrl, id);
        }
    });
}

// Open modal for Consolidated Volumes
function openVolumeModal(volNum) {
    currentModalType = 'volume';
    currentModalVolNum = volNum;
    
    const flatList = getEmotesFlatForActiveGame();
    const volumeSize = 150;
    currentModalEmotes = flatList.slice((volNum - 1) * volumeSize, volNum * volumeSize);
    
    let gameTitle = '';
    if (activeGame === 'hsr') gameTitle = 'Honkai: Star Rail';
    else if (activeGame === 'genshin') gameTitle = 'Genshin Impact';
    else if (activeGame === 'zzz') gameTitle = 'Zenless Zone Zero';
    
    currentModalPackTitle = `${gameTitle} Emotes Volume ${volNum}`;
    
    const modal = document.getElementById('pack-modal');
    document.getElementById('modal-title').textContent = currentModalPackTitle;
    document.getElementById('modal-sticker-count').textContent = `${currentModalEmotes.length} Stickers`;
    
    const typeBadge = document.getElementById('modal-pack-type');
    typeBadge.textContent = "Signal Pack";
    typeBadge.className = "modal-badge type-badge";
    
    const actionBtn = document.getElementById('modal-action-btn');
    actionBtn.href = getSignalLink(activeGame, volNum);
    actionBtn.style.display = 'block';
    actionBtn.textContent = 'Add to Signal';
    
    // Set Sidebar Cover Details
    const coverImg = document.getElementById('modal-cover');
    const coverBlur = document.getElementById('modal-cover-blur');
    const firstEmote = currentModalEmotes[0];
    const localCover = getStickerLocalPath(firstEmote);
    
    coverImg.src = localCover;
    coverImg.onerror = () => {
        coverImg.onerror = null;
        coverImg.src = firstEmote.url;
    };
    coverBlur.style.backgroundImage = `url('${localCover}')`;
    
    // Clear search inside modal
    document.getElementById('modal-search-input').value = '';
    
    renderModalGallery(currentModalEmotes);
    modal.classList.add('active');
}

// Render dynamic grid cells inside active modal gallery
function renderModalGallery(emotesToRender) {
    const gallery = document.getElementById('modal-stickers-grid');
    gallery.innerHTML = '';
    
    if (emotesToRender.length === 0) {
        gallery.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem 0; color: var(--text-secondary);">No stickers found matching the search.</div>`;
        return;
    }
    
    emotesToRender.forEach((emote) => {
        const localPath = getStickerLocalPath(emote);
        
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${localPath}" alt="Sticker Preview" title="Original Set: ${emote.packTitle || ''}" loading="lazy" onerror="this.onerror=null; this.src='${emote.url}';">
            <div class="gallery-item-actions">
                <button class="gallery-action-btn copy-btn" data-url="${localPath}" data-fallback-url="${emote.url}">Copy</button>
                <button class="gallery-action-btn download-btn" data-url="${localPath}" data-fallback-url="${emote.url}" data-id="${emote.id}">Download</button>
            </div>
        `;
        gallery.appendChild(item);
    });
}

// Dynamic theme configuration
function setupThemeSwitcher() {
    const savedTheme = localStorage.getItem('hsr-sticker-theme') || 'express';
    setTheme(savedTheme);
    
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            setTheme(theme);
        });
    });
}

function setTheme(themeName) {
    document.body.classList.remove('theme-express', 'theme-luofu', 'theme-acheron');
    if (themeName !== 'express') {
        document.body.classList.add(`theme-${themeName}`);
    }
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    localStorage.setItem('hsr-sticker-theme', themeName);
}

// Copy sticker image directly to system clipboard
async function copyStickerToClipboard(url, fallbackUrl) {
    try {
        let response;
        try {
            response = await fetch(url);
            if (!response.ok) throw new Error("Local file not found");
        } catch (localErr) {
            response = await fetch(fallbackUrl);
        }
        
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
        showToast("✨ Sticker copied to clipboard!");
    } catch (err) {
        console.warn("Failed to copy image blob, trying text URL link:", err);
        try {
            await navigator.clipboard.writeText(fallbackUrl);
            showToast("🔗 Image URL link copied!");
        } catch (e) {
            showToast("❌ Clipboard copy failed");
        }
    }
}

// Download single sticker PNG/WebP file
function downloadSticker(url, fallbackUrl, id) {
    const a = document.createElement('a');
    fetch(url)
        .then(res => {
            if (!res.ok) return fetch(fallbackUrl);
            return res;
        })
        .then(res => res.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            a.href = blobUrl;
            a.download = `${activeGame}_sticker_${id}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            showToast("💾 Sticker downloaded!");
        })
        .catch(err => {
            console.error("Download failed:", err);
            showToast("❌ Download failed");
        });
}

// Custom Toast notification popup
function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', loadStickerHub);
