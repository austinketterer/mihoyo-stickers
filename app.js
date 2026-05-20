// Placeholder links for Signal Packs - User can replace these with the actual links after uploading
const SIGNAL_LINKS = {
    vol1: "https://signal.art/addstickers/#pack_id_vol_1_placeholder",
    vol2: "https://signal.art/addstickers/#pack_id_vol_2_placeholder",
    vol3: "https://signal.art/addstickers/#pack_id_vol_3_placeholder",
    vol4: "https://signal.art/addstickers/#pack_id_vol_4_placeholder"
};

let allPacks = [];
let allEmotesFlat = [];

// Helper to get local sticker path from consolidated volumes
function getStickerLocalPath(emote) {
    const globalIndex = allEmotesFlat.findIndex(e => e.id === emote.id);
    if (globalIndex === -1) return emote.url; // fallback to HoYoLAB URL
    
    const volNum = Math.floor(globalIndex / 150) + 1;
    const volIndex = globalIndex % 150;
    const isGif = emote.url.split('?')[0].toLowerCase().endsWith('.gif');
    const ext = isGif ? '.webp' : '.png';
    return `Signal_Packs/Consolidated_Packs/HSR_Vol_${volNum}/${volIndex}_${emote.id}${ext}`;
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

        renderSignalPacks();
        renderOriginalPacks(allPacks);
        setupEventListeners();
    } catch (err) {
        console.error("Error loading sticker data:", err);
    }
}

// Render the 4 Consolidated Signal Volumes
function renderSignalPacks() {
    const container = document.getElementById('signal-packs-container');
    container.innerHTML = '';

    const volumeSize = 150;
    const totalVolumes = Math.ceil(allEmotesFlat.length / volumeSize);

    for (let i = 0; i < totalVolumes; i++) {
        const volNum = i + 1;
        const volEmotes = allEmotesFlat.slice(i * volumeSize, (i + 1) * volumeSize);
        const linkKey = `vol${volNum}`;
        const signalLink = SIGNAL_LINKS[linkKey] || '#';

        const card = document.createElement('div');
        card.className = 'card';
        
        // Generate grid preview HTML using the first 8 stickers in this volume
        let previewHtml = '';
        volEmotes.slice(0, 8).forEach((emote, idx) => {
            const isGif = emote.url.split('?')[0].toLowerCase().endsWith('.gif');
            const ext = isGif ? '.webp' : '.png';
            const localPath = `Signal_Packs/Consolidated_Packs/HSR_Vol_${volNum}/${idx}_${emote.id}${ext}`;
            previewHtml += `<img class="preview-sticker" src="${localPath}" alt="Sticker" loading="lazy">`;
        });

        card.innerHTML = `
            <div class="card-glow"></div>
            <div class="card-header">
                <h3 class="card-title">Honkai: Star Rail Emotes Vol. ${volNum}</h3>
                <div class="card-meta">
                    <span class="badge">Pack ${volNum}</span>
                    <span>${volEmotes.length} Stickers</span>
                </div>
            </div>
            <div class="card-preview">
                ${previewHtml}
            </div>
            <div class="card-actions">
                <a href="${signalLink}" class="btn btn-primary" target="_blank">Add to Signal</a>
                <button class="btn btn-secondary view-vol-btn" data-vol="${volNum}">Browse Pack</button>
            </div>
        `;
        
        container.appendChild(card);
    }
}

// Render Original Pack Catalog
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
        
        // Preview first 8 stickers mapped to consolidated path
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

// Set up event listeners (tabs, search, modals)
function setupEventListeners() {
    // Tabs
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

    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderOriginalPacks(allPacks);
            return;
        }

        const filteredPacks = allPacks.filter(pack => {
            return pack.title.toLowerCase().includes(query);
        });

        renderOriginalPacks(filteredPacks);
    });

    // Modal Close
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

    // Delegated click listeners for dynamically rendered browse buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-vol-btn')) {
            const volNum = parseInt(e.target.getAttribute('data-vol'));
            openVolumeModal(volNum);
        } else if (e.target.classList.contains('view-pack-btn')) {
            const packTitle = e.target.getAttribute('data-pack-id');
            openPackModal(packTitle);
        }
    });
}

// Open modal for a Consolidated Volume
function openVolumeModal(volNum) {
    const modal = document.getElementById('pack-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalCount = document.getElementById('modal-sticker-count');
    const modalBtn = document.getElementById('modal-action-btn');
    const gallery = document.getElementById('modal-stickers-grid');

    const volumeSize = 150;
    const volEmotes = allEmotesFlat.slice((volNum - 1) * volumeSize, volNum * volumeSize);
    const linkKey = `vol${volNum}`;

    modalTitle.textContent = `Honkai: Star Rail Emotes Volume ${volNum}`;
    modalCount.textContent = `${volEmotes.length} Stickers`;
    modalBtn.href = SIGNAL_LINKS[linkKey] || '#';
    modalBtn.style.display = 'inline-block';
    modalBtn.textContent = 'Add to Signal';
    
    gallery.innerHTML = '';
    volEmotes.forEach((emote, idx) => {
        const isGif = emote.url.split('?')[0].toLowerCase().endsWith('.gif');
        const ext = isGif ? '.webp' : '.png';
        const localPath = `Signal_Packs/Consolidated_Packs/HSR_Vol_${volNum}/${idx}_${emote.id}${ext}`;
        
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${localPath}" alt="Sticker Preview" title="Sticker ID: ${emote.id}" loading="lazy">`;
        gallery.appendChild(item);
    });

    modal.classList.add('active');
}

// Open modal for an Original Set
function openPackModal(packTitle) {
    const modal = document.getElementById('pack-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalCount = document.getElementById('modal-sticker-count');
    const modalBtn = document.getElementById('modal-action-btn');
    const gallery = document.getElementById('modal-stickers-grid');

    const pack = allPacks.find(p => p.title === packTitle);
    if (!pack) return;

    modalTitle.textContent = pack.title;
    modalCount.textContent = `${pack.emotes.length} Stickers`;
    
    // Hide Signal button in original view since it needs to be installed via Consolidated packs
    modalBtn.style.display = 'none';

    gallery.innerHTML = '';
    pack.emotes.forEach(emote => {
        const localPath = getStickerLocalPath(emote);
        
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${localPath}" alt="Sticker Preview" title="Sticker ID: ${emote.id}" loading="lazy">`;
        gallery.appendChild(item);
    });

    modal.classList.add('active');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', loadStickerHub);
