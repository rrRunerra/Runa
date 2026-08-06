(function () {
    'use strict';

    const PLUGIN_ID = "f9a4c810-7213-4d43-9821-2e65d8a9b12d";
    let pluginConfig = null;

    console.log('%c[Aquila Plugin] CLIENT SCRIPT LOADED - VERBOSE LOGGING ACTIVE', 'background: #8b5cf6; color: #ffffff; font-size: 14px; font-weight: bold; padding: 6px 12px; border-radius: 4px;');

    // Inject CSS from REST endpoint /Aquila/Modal.css
    function injectCss() {
        if (document.getElementById('aquila-modal-css')) return;
        const cssUrl = typeof ApiClient !== 'undefined' && ApiClient.getUrl ? ApiClient.getUrl('Aquila/Modal.css') : '/Aquila/Modal.css';
        console.log('[Aquila Plugin] [CSS INJECT] Loading stylesheet from:', cssUrl);
        const link = document.createElement('link');
        link.id = 'aquila-modal-css';
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);
    }

    // SVG Icon for Aquila button
    const AQUILA_ICON_SVG = `
        <svg viewBox="0 0 24 24" style="width:24px; height:24px; fill:#a78bfa;" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 19h20L12 2zm0 3.8L18.5 17H5.5L12 5.8z"/>
            <circle cx="12" cy="13" r="2.5"/>
        </svg>
    `;

    // Fetch user plugin configuration
    async function loadConfig() {
        try {
            console.log('[Aquila Plugin] [CONFIG FETCH] Requesting plugin configuration via ApiClient...');
            const config = await ApiClient.getPluginConfiguration(PLUGIN_ID);
            const currentUserId = ApiClient.getCurrentUserId();
            const userConfig = (config.UserConfigs || []).find(u => u.JellyfinUserId === currentUserId) || {};
            pluginConfig = {
                baseUrl: userConfig.AquilaServerUrl || "http://localhost:3000/api",
                apiKey: userConfig.ApiKey || "",
                mappings: config.LibraryMappings || []
            };
            console.log('[Aquila Plugin] [CONFIG LOADED] User ID:', currentUserId, '| BaseURL:', pluginConfig.baseUrl, '| API Key Present:', Boolean(pluginConfig.apiKey));
        } catch (e) {
            console.error('[Aquila Plugin] [CONFIG ERROR] Failed to load plugin configuration:', e);
        }
    }

    // Extract item details from Jellyfin item object
    function getItemDetails(item) {
        let mediaType = "tv";
        let title = item.Name || "";
        let targetId = item.Id;

        if (item.Type === "Episode") {
            title = item.SeriesName || item.Name;
            targetId = item.SeriesId || item.Id;
            mediaType = "tv";
        } else if (item.Type === "Movie") {
            mediaType = "movie";
        } else if (item.Type === "Series") {
            mediaType = "tv";
        }

        console.log('[Aquila Plugin] [ITEM DETAILS] Raw Item Type:', item.Type, '| Resolved MediaType:', mediaType, '| Title:', title, '| Target ID:', targetId);
        return { mediaType, title, targetId };
    }

    // Create Modal Container
    function createModalContainer() {
        let backdrop = document.getElementById('aquila-modal-backdrop');
        if (backdrop) return backdrop;

        console.log('[Aquila Plugin] [MODAL] Creating modal DOM element...');
        backdrop = document.createElement('div');
        backdrop.id = 'aquila-modal-backdrop';
        backdrop.className = 'aquila-modal-backdrop';

        backdrop.innerHTML = `
            <div class="aquila-modal-card">
                <div class="aquila-modal-header">
                    <h3><span>Aquila Realm</span> <span class="aquila-badge">Media Tracker</span></h3>
                    <button class="aquila-close-btn" id="aquila-modal-close">&times;</button>
                </div>
                <div class="aquila-modal-body" id="aquila-modal-content">
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.getElementById('aquila-modal-close').addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });

        return backdrop;
    }

    function openModal() {
        console.log('[Aquila Plugin] [MODAL] Opening modal overlay.');
        injectCss();
        const backdrop = createModalContainer();
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('aquila-show'), 10);
    }

    function closeModal() {
        console.log('[Aquila Plugin] [MODAL] Closing modal overlay.');
        const backdrop = document.getElementById('aquila-modal-backdrop');
        if (backdrop) {
            backdrop.classList.remove('aquila-show');
            setTimeout(() => { backdrop.style.display = 'none'; }, 250);
        }
    }

    // Extract current item ID from page context, buttons or URL
    function getCurrentItemId() {
        const hash = window.location.hash || window.location.href;
        console.log('[Aquila Plugin] [ITEM ID SCAN] Current URL/Hash:', hash);

        if (hash.includes('id=')) {
            const id = hash.split('id=')[1]?.split('&')[0];
            if (id) {
                console.log('[Aquila Plugin] [ITEM ID FOUND] Extracted from URL:', id);
                return id;
            }
        }

        const ratingBtn = document.querySelector('.btnUserRating, [is="emby-ratingbutton"], .btnPlaystate');
        if (ratingBtn && ratingBtn.getAttribute('data-id')) {
            const id = ratingBtn.getAttribute('data-id');
            console.log('[Aquila Plugin] [ITEM ID FOUND] Extracted from rating button element:', id);
            return id;
        }

        const itemEl = document.querySelector('[data-id]');
        if (itemEl && itemEl.getAttribute('data-id')) {
            const id = itemEl.getAttribute('data-id');
            console.log('[Aquila Plugin] [ITEM ID FOUND] Extracted from generic data-id element:', id);
            return id;
        }

        console.warn('[Aquila Plugin] [ITEM ID MISSING] Could not determine item ID on current page.');
        return null;
    }

    // Handle Aquila Button Click
    async function handleAquilaButtonClick(itemId) {
        console.log('[Aquila Plugin] [BUTTON CLICK] Triggered for Item ID:', itemId);
        openModal();
        const content = document.getElementById('aquila-modal-content');
        content.innerHTML = '<div style="text-align:center; padding: 40px; color: #94a3b8;">Loading Aquila Media Data...</div>';

        if (!pluginConfig) {
            await loadConfig();
        }

        try {
            const currentUserId = ApiClient.getCurrentUserId();
            console.log('[Aquila Plugin] [ITEM FETCH] Calling ApiClient.getItem for User:', currentUserId, '| Item:', itemId);
            const item = await ApiClient.getItem(currentUserId, itemId);
            const { mediaType, title, targetId } = getItemDetails(item);

            const mappingKey = `aquila_map_${currentUserId}_${targetId}`;
            const savedAquilaId = localStorage.getItem(mappingKey);

            console.log('[Aquila Plugin] [MAPPING CHECK] Storage Key:', mappingKey, '| Saved Aquila ID:', savedAquilaId);

            if (savedAquilaId) {
                renderManagementView(currentUserId, targetId, mediaType, parseInt(savedAquilaId, 10), title);
            } else {
                renderSearchView(currentUserId, targetId, mediaType, title);
            }
        } catch (err) {
            console.error('[Aquila Plugin] [ITEM FETCH ERROR] Failed to load item details from Jellyfin:', err);
            content.innerHTML = `<div style="text-align:center; padding: 20px; color:#f87171;">Failed to load item details from Jellyfin server.</div>`;
        }
    }

    // Render Search View via Same-Origin Server Proxy Endpoint (/Aquila/Api/Search)
    async function renderSearchView(userId, targetId, mediaType, defaultTitle) {
        console.log('[Aquila Plugin] [SEARCH VIEW] Rendering search form for Title:', defaultTitle, '| Type:', mediaType);
        const content = document.getElementById('aquila-modal-content');
        content.innerHTML = `
            <div>
                <p style="margin-top:0; color:#94a3b8; font-size:0.9rem;">This media is not linked to Aquila yet. Search and select a title to link it.</p>
                <div style="display:flex; gap: 10px; margin-bottom: 16px;">
                    <input type="text" id="aquila-search-input" class="aquila-form-control" value="${defaultTitle}" placeholder="Search Aquila media..." />
                    <button class="aquila-btn-primary" id="aquila-search-btn">Search</button>
                </div>
                <div class="aquila-search-results" id="aquila-search-results">
                    <div style="grid-column: 1/-1; text-align:center; padding:20px; color:#94a3b8;">Searching Aquila database...</div>
                </div>
            </div>
        `;

        const searchInput = document.getElementById('aquila-search-input');
        const searchBtn = document.getElementById('aquila-search-btn');

        const doSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) return;

            const resultsContainer = document.getElementById('aquila-search-results');
            resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#94a3b8;">Loading search results...</div>';

            // Resolve Same-Origin Proxy Endpoint
            let proxyUrl = `/Aquila/Api/Search?mediaType=${encodeURIComponent(mediaType)}&query=${encodeURIComponent(query)}`;
            if (typeof ApiClient !== 'undefined' && ApiClient.getUrl) {
                proxyUrl = ApiClient.getUrl(`Aquila/Api/Search?mediaType=${encodeURIComponent(mediaType)}&query=${encodeURIComponent(query)}`);
            }

            console.log('[Aquila Plugin] [FETCH START] Proxy Search URL:', proxyUrl);

            try {
                const res = await fetch(proxyUrl);
                console.log('[Aquila Plugin] [FETCH RESPONSE] Status:', res.status, res.statusText, '| URL:', proxyUrl);

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || `HTTP ${res.status}: ${res.statusText}`);
                }

                const items = await res.json();
                console.log('[Aquila Plugin] [SEARCH SUCCESS] Returned Items Count:', items ? items.length : 0, '| Data:', items);

                if (!items || items.length === 0) {
                    resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:20px;">No matching titles found on Aquila server.</div>';
                    return;
                }

                // Render Lightweight Cards: title & coverImage ONLY
                resultsContainer.innerHTML = items.map(item => `
                    <div class="aquila-search-card" data-id="${item.id}" data-title="${(item.title || '').replace(/"/g, '&quot;')}">
                        <img src="${item.coverImage || 'https://via.placeholder.com/130x180?text=No+Cover'}" alt="${item.title}" />
                        <div class="aquila-search-card-title">${item.title}</div>
                    </div>
                `).join('');

                // Link selection onClick
                document.querySelectorAll('.aquila-search-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const aquilaId = parseInt(card.getAttribute('data-id'), 10);
                        const cardTitle = card.getAttribute('data-title');
                        console.log('[Aquila Plugin] [MEDIA LINKED] Linked Jellyfin Item:', targetId, 'to Aquila ID:', aquilaId, '| Title:', cardTitle);
                        const mappingKey = `aquila_map_${userId}_${targetId}`;
                        localStorage.setItem(mappingKey, aquilaId);
                        renderManagementView(userId, targetId, mediaType, aquilaId, cardTitle);
                    });
                });
            } catch (err) {
                console.error('[Aquila Plugin] [SEARCH ERROR] Detailed error info:', err);
                resultsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#f87171;">Search failed: ${err.message || 'Check Aquila Server URL & API Key in Plugin Settings.'}</div>`;
            }
        };

        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
        doSearch();
    }

    // Render Media Edit / Management View via Same-Origin Proxy Endpoints
    async function renderManagementView(userId, targetId, mediaType, aquilaId, title) {
        console.log('[Aquila Plugin] [MANAGEMENT VIEW] Aquila ID:', aquilaId, '| Title:', title, '| Type:', mediaType);
        const content = document.getElementById('aquila-modal-content');
        content.innerHTML = '<div style="text-align:center; padding: 30px; color:#94a3b8;">Loading user list entry...</div>';

        let entry = { progress: 0, status: 'WATCHING', score: 0, notes: '' };
        try {
            let proxyUrl = `/Aquila/Api/Entry?mediaType=${encodeURIComponent(mediaType)}&id=${aquilaId}`;
            if (typeof ApiClient !== 'undefined' && ApiClient.getUrl) {
                proxyUrl = ApiClient.getUrl(`Aquila/Api/Entry?mediaType=${encodeURIComponent(mediaType)}&id=${aquilaId}`);
            }

            console.log('[Aquila Plugin] [FETCH START] Proxy Entry URL:', proxyUrl);
            const res = await fetch(proxyUrl);
            console.log('[Aquila Plugin] [FETCH RESPONSE] Status:', res.status, res.statusText, '| URL:', proxyUrl);

            if (res.ok) {
                const data = await res.json();
                if (data) {
                    entry = data;
                    console.log('[Aquila Plugin] [ENTRY LOADED] Loaded Data:', entry);
                }
            }
        } catch (e) {
            console.warn('[Aquila Plugin] [ENTRY FETCH WARNING] Could not fetch existing entry:', e);
        }

        content.innerHTML = `
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h4 style="margin:0; font-size:1.1rem; color:#f1f5f9;">${title}</h4>
                    <button id="aquila-relink-btn" style="background:none; border:none; color:#a78bfa; cursor:pointer; font-size:0.8rem; text-decoration:underline;">Relink Media</button>
                </div>

                <div class="aquila-form-group">
                    <label>Status</label>
                    <select id="aquila-status-select" class="aquila-form-control">
                        <option value="WATCHING" ${entry.status === 'WATCHING' ? 'selected' : ''}>Watching</option>
                        <option value="COMPLETED" ${entry.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                        <option value="PAUSED" ${entry.status === 'PAUSED' ? 'selected' : ''}>Paused</option>
                        <option value="DROPPED" ${entry.status === 'DROPPED' ? 'selected' : ''}>Dropped</option>
                        <option value="PLANNING" ${entry.status === 'PLANNING' ? 'selected' : ''}>Planning</option>
                        <option value="REWATCHING" ${entry.status === 'REWATCHING' ? 'selected' : ''}>Rewatching</option>
                    </select>
                </div>

                <div class="aquila-form-group">
                    <label>Progress (Episodes / Count)</label>
                    <div class="aquila-progress-counter">
                        <button class="aquila-btn-counter" id="aquila-progress-dec">-</button>
                        <input type="number" id="aquila-progress-input" class="aquila-form-control" style="text-align:center;" value="${entry.progress || 0}" min="0" />
                        <button class="aquila-btn-counter" id="aquila-progress-inc">+</button>
                    </div>
                </div>

                <div class="aquila-form-group">
                    <label>Score Rating (1 - 10)</label>
                    <input type="number" id="aquila-score-input" class="aquila-form-control" value="${entry.score || 0}" min="0" max="10" step="0.5" placeholder="Unscored (0)" />
                </div>

                <div class="aquila-form-group">
                    <label>Personal Notes</label>
                    <textarea id="aquila-notes-input" class="aquila-form-control" rows="3" placeholder="Add personal notes...">${entry.notes || ''}</textarea>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                    <button class="aquila-btn-primary" id="aquila-save-entry-btn">Save Entry</button>
                </div>
            </div>
        `;

        // Counter handlers
        const progInput = document.getElementById('aquila-progress-input');
        document.getElementById('aquila-progress-dec').addEventListener('click', () => {
            progInput.value = Math.max(0, parseInt(progInput.value || '0', 10) - 1);
        });
        document.getElementById('aquila-progress-inc').addEventListener('click', () => {
            progInput.value = parseInt(progInput.value || '0', 10) + 1;
        });

        // Relink handler
        document.getElementById('aquila-relink-btn').addEventListener('click', () => {
            console.log('[Aquila Plugin] [RELINK CLICK] Unlinking Jellyfin Item:', targetId);
            const mappingKey = `aquila_map_${userId}_${targetId}`;
            localStorage.removeItem(mappingKey);
            renderSearchView(userId, targetId, mediaType, title);
        });

        // Save handler via proxy
        document.getElementById('aquila-save-entry-btn').addEventListener('click', async () => {
            const status = document.getElementById('aquila-status-select').value;
            const progress = parseInt(progInput.value, 10);
            const score = parseFloat(document.getElementById('aquila-score-input').value) || 0;
            const notes = document.getElementById('aquila-notes-input').value;

            const dto = { status, progress, score, notes };
            if (mediaType === 'anime') dto.animeId = aquilaId;
            else if (mediaType === 'movie') dto.movieId = aquilaId;
            else dto.tvId = aquilaId;

            let proxySaveUrl = `/Aquila/Api/Save?mediaType=${encodeURIComponent(mediaType)}`;
            if (typeof ApiClient !== 'undefined' && ApiClient.getUrl) {
                proxySaveUrl = ApiClient.getUrl(`Aquila/Api/Save?mediaType=${encodeURIComponent(mediaType)}`);
            }

            console.log('[Aquila Plugin] [FETCH START] Save Entry Proxy URL:', proxySaveUrl, '| Payload:', dto);

            try {
                const res = await fetch(proxySaveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dto)
                });
                console.log('[Aquila Plugin] [SAVE RESPONSE] Status:', res.status, res.statusText);

                if (res.ok) {
                    console.log('[Aquila Plugin] [SAVE SUCCESS] Entry saved to Aquila.');
                    closeModal();
                } else {
                    console.error('[Aquila Plugin] [SAVE ERROR] Request failed with HTTP:', res.status);
                    alert('Failed to save list entry to Aquila.');
                }
            } catch (err) {
                console.error('[Aquila Plugin] [SAVE ERROR] Network exception during save:', err);
                alert('Error connecting to Aquila server.');
            }
        });
    }

    // Helper: Create button element matching Jellyfin's .mainDetailButtons style
    function createAquilaButton() {
        const btn = document.createElement('button');
        btn.setAttribute('is', 'emby-button');
        btn.setAttribute('type', 'button');
        btn.className = 'button-flat btnAquilaEditModal detailButton emby-button';
        btn.title = 'Manage Aquila Media';
        btn.innerHTML = `
            <div class="detailButton-content">
                <span class="detailButton-icon" style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px;">
                    ${AQUILA_ICON_SVG}
                </span>
            </div>
        `;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('[Aquila Plugin] [UI INJECT] Aquila detail button clicked!');
            const itemId = getCurrentItemId();
            if (itemId) {
                handleAquilaButtonClick(itemId);
            } else {
                console.warn('[Aquila Plugin] [UI INJECT] Could not determine item ID for button click.');
            }
        });

        return btn;
    }

    // Inject EXACTLY ONE Inline Aquila Button into .mainDetailButtons right next to .btnUserRating
    function injectInlineButtons() {
        const detailContainer = document.querySelector('.mainDetailButtons, .detailButtons');
        if (!detailContainer) return;

        // Guarantee EXACTLY ONE button inside the detail container
        if (detailContainer.querySelector('.btnAquilaEditModal')) {
            return;
        }

        const btn = createAquilaButton();
        const favBtn = detailContainer.querySelector('.btnUserRating, button[is="emby-ratingbutton"], .btnFavorite, .btnDetailFavorite');

        if (favBtn && favBtn.parentNode === detailContainer) {
            favBtn.parentNode.insertBefore(btn, favBtn.nextSibling);
            console.log('[Aquila Plugin] [UI INJECT SUCCESS] Injected single Aquila button next to favorite button in detail container:', detailContainer);
        } else {
            detailContainer.appendChild(btn);
            console.log('[Aquila Plugin] [UI INJECT SUCCESS] Injected single Aquila button into detail container:', detailContainer);
        }
    }

    // Render Floating Action Button (FAB)
    function injectFloatingActionButton() {
        const itemId = getCurrentItemId();
        const hasDetailView = Boolean(document.querySelector('.mainDetailButtons, .detailButtons, .videoOsd, .itemDetailPage'));
        let fab = document.getElementById('aquila-fab-btn');

        if (!itemId && !hasDetailView) {
            if (fab) fab.style.display = 'none';
            return;
        }

        if (!fab) {
            fab = document.createElement('button');
            fab.id = 'aquila-fab-btn';
            fab.className = 'aquila-fab-btn';
            fab.title = 'Manage Aquila Media';
            fab.innerHTML = AQUILA_ICON_SVG;

            fab.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('[Aquila Plugin] [FAB CLICK] Floating Action Button clicked!');
                const currentId = getCurrentItemId();
                if (currentId) {
                    handleAquilaButtonClick(currentId);
                } else {
                    console.warn('[Aquila Plugin] [FAB CLICK] Item ID unavailable.');
                }
            });

            document.body.appendChild(fab);
            console.log('[Aquila Plugin] [UI INJECT SUCCESS] Injected Aquila Floating Action Button (FAB).');
        }

        fab.style.display = 'flex';
    }

    // Process DOM Updates
    function processUiUpdates() {
        try {
            injectCss();
            injectInlineButtons();
            injectFloatingActionButton();
        } catch (e) {
            console.error('[Aquila Plugin] [UI UPDATE ERROR] Exception during UI iteration:', e);
        }
    }

    // Continuous polling interval fallback (every 1 sec) to handle SPA navigation
    setInterval(processUiUpdates, 1000);

    const observer = new MutationObserver(() => {
        processUiUpdates();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Aquila Plugin] DOMContentLoaded event fired. Running initial UI injection.');
        processUiUpdates();
    });

    // Initial run
    processUiUpdates();
})();
