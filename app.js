// Placeholder links for Signal Packs - User can replace these with the actual links after uploading
const SIGNAL_LINKS = {
    vol1: "https://signal.art/addstickers/#pack_id_vol_1_placeholder",
    vol2: "https://signal.art/addstickers/#pack_id_vol_2_placeholder",
    vol3: "https://signal.art/addstickers/#pack_id_vol_3_placeholder",
    vol4: "https://signal.art/addstickers/#pack_id_vol_4_placeholder"
};

const POPULAR_CHARACTERS = [
    "Pom-Pom", "March 7th", "Dan Heng", "Herta", "Acheron", 
    "Firefly", "Robin", "Sparkle", "Kafka", "Silver Wolf", 
    "Blade", "Himeko", "Welt", "Bronya", "Seele"
];

let allPacks = [];
let allEmotesFlat = [];

// Filtering state
let searchQuery = '';
let activeCharacterFilter = 'all';

// Modal state
let currentModalType = ''; // 'volume' or 'pack'
let currentModalVolNum = null;
let currentModalPackTitle = '';
let currentModalEmotes = [];

// Helper to get local sticker path from consolidated volumes
function getStickerLocalPath(emote) {
    const globalIndex = allEmotesFlat.findIndex(e => e.id === emote.id);
    if (globalIndex === -1) return emote.url; // fallback to HoYoLAB URL
    
    const volNum = Math.floor(globalIndex / 150) + 1;
    const volIndex = globalIndex % 150;
    const isGif = emote.url.split('?')[0].toLowerCase().endsWith('.gif');
    const ext = isGif ? '.webp' : '.png';
    return `Signal_Packs/Consolidated_Packs/HSR_Vol_${volNum}/${volIndex}_${emote.id}_✨${ext}`;
}

// Fetch and load metadata
async function loadStickerHub() {
    try {
        const response = await fetch('hsr_metadata.json');
        allPacks = await response.json();
        
        // Flatten all emotes to calculate volumes and local mapping
        allPacks.forEach(pack => {
            pack.emotes.forEach(emote => {
                allEmotesFlat.push({
                    ...emote,
                    packTitle: pack.title
                });
            });
        });

        // Initialize features
        setupThemeSwitcher();
        renderCharacterTags();
        updateStatsDashboard();
        filterAllViews();
        setupEventListeners();
    } catch (err) {
        console.error("Error loading sticker data:", err);
    }
}

// Render dynamic stats counts
function updateStatsDashboard() {
    document.getElementById('stat-packs').textContent = allPacks.length;
    document.getElementById('stat-stickers').textContent = allEmotesFlat.length;
}

// Render dynamic character filters
function renderCharacterTags() {
    const container = document.getElementById('character-tags');
    // Keep 'All' tag, empty others
    container.innerHTML = '<button class="tag-pill active" data-character="all">All Characters</button>';
    
    POPULAR_CHARACTERS.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'tag-pill';
        btn.setAttribute('data-character', char.toLowerCase());
        btn.textContent = char;
        container.appendChild(btn);
    });
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
    
    // Filter Original Packs
    const filteredOriginal = allPacks.filter(pack => {
        const matchesSearch = !query || pack.title.toLowerCase().includes(query);
        const matchesChar = activeCharacterFilter === 'all' || pack.title.toLowerCase().includes(activeCharacterFilter);
        return matchesSearch && matchesChar;
    });
    renderOriginalPacks(filteredOriginal);
    
    // Filter & Render Consolidated Signal Volumes
    const volumeSize = 150;
    const totalVolumes = Math.ceil(allEmotesFlat.length / volumeSize);
    
    const container = document.getElementById('signal-packs-container');
    container.innerHTML = '';
    
    for (let i = 0; i < totalVolumes; i++) {
        const volNum = i + 1;
        const volEmotes = allEmotesFlat.slice(i * volumeSize, (i + 1) * volumeSize);
        
        // Count matches within this volume
        const matchCount = volEmotes.filter(emote => {
            const matchesSearch = !query || emote.packTitle.toLowerCase().includes(query);
            const matchesChar = activeCharacterFilter === 'all' || emote.packTitle.toLowerCase().includes(activeCharacterFilter);
            return matchesSearch && matchesChar;
        }).length;
        
        // Show volume cards if filter matches
        if (matchCount > 0 || (activeCharacterFilter === 'all' && !query)) {
            renderSignalPackCard(volNum, volEmotes, matchCount);
        }
    }
}

// Render a single Consolidated Signal Card
function renderSignalPackCard(volNum, volEmotes, matchCount) {
    const container = document.getElementById('signal-packs-container');
    const linkKey = `vol${volNum}`;
    const signalLink = SIGNAL_LINKS[linkKey] || '#';
    
    const card = document.createElement('div');
    card.className = 'card';
    setupCardGlow(card);
    
    // Preview first 8 stickers mapped to consolidated path
    let previewHtml = '';
    volEmotes.slice(0, 8).forEach((emote, idx) => {
        const isGif = emote.url.split('?')[0].toLowerCase().endsWith('.gif');
        const ext = isGif ? '.webp' : '.png';
        const localPath = `Signal_Packs/Consolidated_Packs/HSR_Vol_${volNum}/${idx}_${emote.id}_✨${ext}`;
        previewHtml += `<img class="preview-sticker" src="${localPath}" alt="Sticker" loading="lazy">`;
    });

    const isFiltered = activeCharacterFilter !== 'all' || searchQuery !== '';
    const badgeHtml = isFiltered 
        ? `<span class="badge">${matchCount} Matches</span>`
        : `<span class="badge">Pack ${volNum}</span>`;

    card.innerHTML = `
        <div class="card-glow"></div>
        <div class="card-header">
            <h3 class="card-title">Honkai: Star Rail Emotes Vol. ${volNum}</h3>
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

// Render Original Pack Grid
function renderOriginalPacks(packsToRender) {
    const container = document.getElementById('original-packs-container');
    container.innerHTML = '';

    if (packsToRender.length === 0) {
        container.innerHTML = `<div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">No packs found matching your search.</div>`;
        return;
    }

    packsToRender.forEach((pack) => {
        const card = document.createElement('div');
        card.className = 'card';
        setupCardGlow(card);
        
        let previewHtml = '';
        pack.emotes.slice(0, 8).forEach(emote => {
            const localPath = getStickerLocalPath(emote);
            previewHtml += `<img class="preview-sticker" src="${localPath}" alt="Sticker" loading="lazy">`;
        });

        card.innerHTML = `
            <div class="card-glow"></div>
            <div class="card-header">
                <h3 class="card-title">${pack.title}</h3>
                <div class="card-meta">
                    <span>${pack.emotes.length} Stickers</span>
                </div>
            </div>
            <div class="card-preview">
                ${previewHtml}
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary view-pack-btn" data-pack-id="${pack.title}">Browse Set</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Tabs toggles
    const tabSignal = document.getElementById('tab-signal');
    const tabBrowse = document.getElementById('tab-browse');
    const signalView = document.getElementById('signal-view');
    const browseView = document.getElementById('browse-view');

    tabSignal.addEventListener('click', () => {
        tabSignal.classList.add('active');
        tabBrowse.classList.remove('active');
        signalView.classList.add('active');
        browseView.classList.remove('active');
    });

    tabBrowse.addEventListener('click', () => {
        tabBrowse.classList.add('active');
        tabSignal.classList.remove('active');
        browseView.classList.add('active');
        signalView.classList.remove('active');
    });

    // Search inputs
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        filterAllViews();
    });

    // Character filter pills click event
    const tagsContainer = document.getElementById('character-tags');
    tagsContainer.addEventListener('click', (e) => {
        const tag = e.target.closest('.tag-pill');
        if (!tag) return;
        
        tagsContainer.querySelectorAll('.tag-pill').forEach(btn => btn.classList.remove('active'));
        tag.classList.add('active');
        
        activeCharacterFilter = tag.getAttribute('data-character');
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
        } else if (e.target.closest('.view-pack-btn')) {
            const btn = e.target.closest('.view-pack-btn');
            const packTitle = btn.getAttribute('data-pack-id');
            openPackModal(packTitle);
        } else if (e.target.classList.contains('copy-btn')) {
            const url = e.target.getAttribute('data-url');
            copyStickerToClipboard(url);
        } else if (e.target.classList.contains('download-btn')) {
            const url = e.target.getAttribute('data-url');
            const id = e.target.getAttribute('data-id');
            downloadSticker(url, id);
        }
    });
}

// Open modal for Consolidated Volumes
function openVolumeModal(volNum) {
    currentModalType = 'volume';
    currentModalVolNum = volNum;
    currentModalPackTitle = `Honkai: Star Rail Emotes Volume ${volNum}`;
    
    const volumeSize = 150;
    currentModalEmotes = allEmotesFlat.slice((volNum - 1) * volumeSize, volNum * volumeSize);
    
    const modal = document.getElementById('pack-modal');
    document.getElementById('modal-title').textContent = currentModalPackTitle;
    document.getElementById('modal-sticker-count').textContent = `${currentModalEmotes.length} Stickers`;
    
    const typeBadge = document.getElementById('modal-pack-type');
    typeBadge.textContent = "Signal Pack";
    typeBadge.className = "modal-badge type-badge";
    
    const actionBtn = document.getElementById('modal-action-btn');
    const linkKey = `vol${volNum}`;
    actionBtn.href = SIGNAL_LINKS[linkKey] || '#';
    actionBtn.style.display = 'block';
    actionBtn.textContent = 'Add to Signal';
    
    // Set Sidebar Cover Details
    const coverImg = document.getElementById('modal-cover');
    const coverBlur = document.getElementById('modal-cover-blur');
    const firstEmote = currentModalEmotes[0];
    const isGif = firstEmote.url.split('?')[0].toLowerCase().endsWith('.gif');
    const ext = isGif ? '.webp' : '.png';
    const localCover = `Signal_Packs/Consolidated_Packs/HSR_Vol_${volNum}/0_${firstEmote.id}_✨${ext}`;
    
    coverImg.src = localCover;
    coverBlur.style.backgroundImage = `url('${localCover}')`;
    
    // Clear search inside modal
    document.getElementById('modal-search-input').value = '';
    
    renderModalGallery(currentModalEmotes);
    modal.classList.add('active');
}

// Open modal for Original Sets
function openPackModal(packTitle) {
    const pack = allPacks.find(p => p.title === packTitle);
    if (!pack) return;

    currentModalType = 'pack';
    currentModalVolNum = null;
    currentModalPackTitle = pack.title;
    currentModalEmotes = pack.emotes.map(e => ({
        ...e,
        packTitle: pack.title
    }));
    
    const modal = document.getElementById('pack-modal');
    document.getElementById('modal-title').textContent = currentModalPackTitle;
    document.getElementById('modal-sticker-count').textContent = `${currentModalEmotes.length} Stickers`;
    
    const typeBadge = document.getElementById('modal-pack-type');
    typeBadge.textContent = "Original Set";
    typeBadge.className = "modal-badge";
    
    const actionBtn = document.getElementById('modal-action-btn');
    actionBtn.style.display = 'none';
    
    // Set Sidebar Cover Details
    const coverImg = document.getElementById('modal-cover');
    const coverBlur = document.getElementById('modal-cover-blur');
    const firstEmote = currentModalEmotes[0];
    const localCover = getStickerLocalPath(firstEmote);
    
    coverImg.src = localCover;
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
        let localPath = '';
        if (currentModalType === 'volume') {
            const idxInVol = currentModalEmotes.findIndex(e => e.id === emote.id);
            const isGif = emote.url.split('?')[0].toLowerCase().endsWith('.gif');
            const ext = isGif ? '.webp' : '.png';
            localPath = `Signal_Packs/Consolidated_Packs/HSR_Vol_${currentModalVolNum}/${idxInVol}_${emote.id}_✨${ext}`;
        } else {
            localPath = getStickerLocalPath(emote);
        }
        
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${localPath}" alt="Sticker Preview" title="Original Set: ${emote.packTitle || ''}" loading="lazy" onerror="this.src='${emote.url}'">
            <div class="gallery-item-actions">
                <button class="gallery-action-btn copy-btn" data-url="${localPath}">Copy</button>
                <button class="gallery-action-btn download-btn" data-url="${localPath}" data-id="${emote.id}">Download</button>
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
async function copyStickerToClipboard(url) {
    try {
        const response = await fetch(url);
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
            const absoluteUrl = new URL(url, window.location.href).href;
            await navigator.clipboard.writeText(absoluteUrl);
            showToast("🔗 Image URL link copied!");
        } catch (e) {
            showToast("❌ Clipboard copy failed");
        }
    }
}

// Download single sticker PNG/WebP file
function downloadSticker(url, id) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `hsr_sticker_${id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("💾 Sticker downloaded!");
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
