// Reddit Downloader - Main Application Logic
// Rate limiting and API protection for personal usage

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let afterToken = '';
let currentSub = '';
let isLoading = false;
let isGridView = localStorage.getItem('viewMode') === 'grid';
let currentFilter = localStorage.getItem('filter') || 'hot';
let currentTimeRange = localStorage.getItem('timeRange') || 'all';
let allPosts = []; // Store all loaded posts for search functionality
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// ============================================================================
// RATE LIMITING SYSTEM
// ============================================================================
const RateLimiter = {
    requestTimes: [],
    maxRequestsPerMinute: 30, // Conservative limit for personal use
    minRequestInterval: 2000, // 2 seconds between requests
    lastRequestTime: 0,

    canMakeRequest() {
        const now = Date.now();

        // Remove requests older than 1 minute
        this.requestTimes = this.requestTimes.filter(time => now - time < 60000);

        // Check if we've exceeded max requests per minute
        if (this.requestTimes.length >= this.maxRequestsPerMinute) {
            return false;
        }

        // Check minimum interval between requests
        if (now - this.lastRequestTime < this.minRequestInterval) {
            return false;
        }

        return true;
    },

    recordRequest() {
        const now = Date.now();
        this.requestTimes.push(now);
        this.lastRequestTime = now;
    },

    getWaitTime() {
        const now = Date.now();
        const intervalWait = this.minRequestInterval - (now - this.lastRequestTime);

        if (this.requestTimes.length >= this.maxRequestsPerMinute) {
            const oldestRequest = this.requestTimes[0];
            const minuteWait = 60000 - (now - oldestRequest);
            return Math.max(intervalWait, minuteWait);
        }

        return Math.max(intervalWait, 0);
    },

    showWarning() {
        const warning = document.createElement('div');
        warning.className = 'rate-limit-warning';
        warning.textContent = '⚠️ Rate limit approaching. Slowing down requests to protect your access.';
        document.body.insertBefore(warning, document.getElementById('feed'));

        setTimeout(() => warning.remove(), 5000);
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    initViewMode();
    initEventListeners();
    initFilters();
    loadFeed(true);
});

function initEventListeners() {
    // Subreddit input
    document.getElementById('subredditInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') loadFeed(true);
    });

    // Search within results
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterPosts, 300));
    }

    // Infinite scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                loadFeed();
            }

            // Show/hide back to top button
            const backToTop = document.getElementById('backToTop');
            if (window.scrollY > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }, 100);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function initFilters() {
    const filterSelect = document.getElementById('filterSelect');
    const timeRangeSelect = document.getElementById('timeRangeSelect');

    if (filterSelect) {
        filterSelect.value = currentFilter;
        filterSelect.addEventListener('change', function() {
            currentFilter = this.value;
            localStorage.setItem('filter', currentFilter);

            // Show/hide time range based on filter
            if (currentFilter === 'top' || currentFilter === 'controversial') {
                timeRangeSelect.style.display = 'inline-block';
            } else {
                timeRangeSelect.style.display = 'none';
            }

            loadFeed(true);
        });
    }

    if (timeRangeSelect) {
        timeRangeSelect.value = currentTimeRange;
        timeRangeSelect.addEventListener('change', function() {
            currentTimeRange = this.value;
            localStorage.setItem('timeRange', currentTimeRange);
            loadFeed(true);
        });

        // Initial visibility
        if (currentFilter === 'top' || currentFilter === 'controversial') {
            timeRangeSelect.style.display = 'inline-block';
        } else {
            timeRangeSelect.style.display = 'none';
        }
    }
}

// ============================================================================
// VIEW MANAGEMENT
// ============================================================================
function initViewMode() {
    const feed = document.getElementById('feed');
    const viewIcon = document.getElementById('viewIcon');
    const viewToggle = document.getElementById('viewToggle');

    if (isGridView) {
        feed.classList.add('grid-view');
        viewIcon.textContent = '☰';
        viewToggle.classList.add('active');
    } else {
        feed.classList.remove('grid-view');
        viewIcon.textContent = '⊞';
        viewToggle.classList.remove('active');
    }
}

function toggleView() {
    isGridView = !isGridView;
    localStorage.setItem('viewMode', isGridView ? 'grid' : 'list');
    initViewMode();
}

// ============================================================================
// FEED LOADING
// ============================================================================
async function loadFeed(reset = false) {
    if (isLoading) return;

    // Check if running from file:// protocol
    if (window.location.protocol === 'file:') {
        showError('This file must be run through a local web server, not opened directly.<br><br>' +
            'Please run: <code>./start.sh</code><br><br>' +
            'Or: <code>python3 -m http.server 8000</code><br><br>' +
            'Then open: <code>http://localhost:8000/reddit-downloader.html</code>');
        return;
    }

    const subInput = document.getElementById('subredditInput').value.trim().replace('r/', '').replace(/^\/+|\/+$/g, '');
    if (!subInput) {
        alert('Please enter a subreddit name');
        return;
    }

    // Rate limiting check
    if (!RateLimiter.canMakeRequest()) {
        const waitTime = Math.ceil(RateLimiter.getWaitTime() / 1000);
        RateLimiter.showWarning();
        console.log(`Rate limit: waiting ${waitTime} seconds before next request`);

        // Auto-retry after wait time
        setTimeout(() => loadFeed(reset), RateLimiter.getWaitTime());
        return;
    }

    isLoading = true;
    const feed = document.getElementById('feed');
    const loadingDiv = document.getElementById('loading');

    if (reset) {
        feed.innerHTML = '';
        afterToken = '';
        currentSub = subInput;
        allPosts = [];
    }

    if (!currentSub) {
        currentSub = subInput;
    }

    loadingDiv.style.display = 'block';

    try {
        // Build URL with filters
        let url = `https://www.reddit.com/r/${currentSub}/${currentFilter}.json?limit=25`;

        if (afterToken) {
            url += `&after=${afterToken}`;
        }

        if ((currentFilter === 'top' || currentFilter === 'controversial') && currentTimeRange !== 'all') {
            url += `&t=${currentTimeRange}`;
        }

        const json = await fetchWithFallback(url);

        // Record successful request
        RateLimiter.recordRequest();

        // Warn if approaching rate limit
        if (RateLimiter.requestTimes.length > RateLimiter.maxRequestsPerMinute * 0.8) {
            RateLimiter.showWarning();
        }

        afterToken = json.data.after;
        const posts = json.data.children;

        if (posts.length === 0 && reset) {
            feed.innerHTML = '<div class="loading">No posts found. Try a different subreddit.</div>';
        } else {
            let mediaFound = 0;
            posts.forEach(post => {
                const data = post.data;
                if (isMediaPost(data)) {
                    allPosts.push(data);
                    createCard(data);
                    mediaFound++;
                }
            });

            if (reset && mediaFound === 0) {
                feed.innerHTML = '<div class="loading">No media posts found in this subreddit. Try r/pics, r/aww, or r/videos.</div>';
            }
        }

    } catch (error) {
        console.error('Full error:', error);
        if (reset) {
            showError(formatErrorMessage(error));
        }
    }

    isLoading = false;
    loadingDiv.style.display = 'none';
}

// ============================================================================
// NETWORK & CORS HANDLING
// ============================================================================
async function fetchWithFallback(redditUrl) {
    const urls = [
        `https://old.reddit.com${new URL(redditUrl).pathname}${new URL(redditUrl).search}`,
        `https://corsproxy.io/?${encodeURIComponent(redditUrl)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(redditUrl)}`
    ];

    let lastError = null;

    for (let i = 0; i < urls.length; i++) {
        try {
            console.log(`Attempt ${i + 1}/${urls.length}: Fetching...`);
            const response = await fetch(urls[i], {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            let json;

            // Handle allorigins.win wrapper format
            if (urls[i].includes('allorigins.win')) {
                const wrapper = await response.json();
                if (wrapper.contents) {
                    json = JSON.parse(wrapper.contents);
                } else {
                    continue;
                }
            } else {
                if (response.ok) {
                    json = await response.json();
                } else {
                    console.log(`Attempt ${i + 1} failed with status: ${response.status}`);
                    if (response.status === 403 || response.status === 429) {
                        lastError = new Error('Reddit is blocking requests (rate limited)');
                        continue;
                    }
                    continue;
                }
            }

            // Verify valid Reddit JSON
            if (json && json.data && json.data.children) {
                console.log(`✓ Success with attempt ${i + 1}`);
                return json;
            } else {
                console.log(`Attempt ${i + 1} returned invalid JSON structure`);
            }
        } catch (err) {
            console.log(`Attempt ${i + 1} error:`, err.message);
            lastError = err;
        }

        // Wait a bit between attempts (exponential backoff)
        if (i < urls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }

    throw lastError || new Error('Unable to fetch from Reddit after all attempts');
}

// ============================================================================
// MEDIA DETECTION
// ============================================================================
function isMediaPost(data) {
    // Images
    if (data.post_hint === 'image' || (data.url && data.url.match(/\.(jpeg|jpg|gif|png|webp)$/i))) {
        return true;
    }

    // Videos
    if (data.is_video || data.post_hint === 'hosted:video' || data.post_hint === 'rich:video') {
        return true;
    }

    // External video hosts
    if (data.url && (
        data.url.includes('v.redd.it') ||
        data.url.includes('youtube.com') ||
        data.url.includes('youtu.be') ||
        data.url.includes('vimeo.com') ||
        data.url.includes('streamable.com') ||
        data.url.includes('imgur.com/') && data.url.includes('.gifv')
    )) {
        return true;
    }

    return false;
}

function getMediaUrl(data) {
    // Direct image
    if (data.post_hint === 'image' || (data.url && data.url.match(/\.(jpeg|jpg|gif|png|webp)$/i))) {
        return { type: 'image', url: data.url };
    }

    // Reddit video
    if (data.is_video && data.media && data.media.reddit_video) {
        return {
            type: 'video',
            url: data.media.reddit_video.fallback_url,
            hasAudio: !data.media.reddit_video.is_gif
        };
    }

    // Imgur gifv -> mp4
    if (data.url && data.url.includes('.gifv')) {
        return { type: 'video', url: data.url.replace('.gifv', '.mp4') };
    }

    // Fallback
    return { type: 'image', url: data.url };
}

// ============================================================================
// CARD CREATION
// ============================================================================
function createCard(data) {
    const feed = document.getElementById('feed');
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.postId = data.id;

    // Add favorite badge if favorited
    if (favorites.includes(data.id)) {
        const badge = document.createElement('div');
        badge.className = 'favorite-badge';
        badge.textContent = '★';
        card.appendChild(badge);
    }

    // Create media element
    const media = getMediaUrl(data);
    let mediaElement;

    if (media.type === 'video') {
        mediaElement = document.createElement('video');
        mediaElement.src = media.url;
        mediaElement.controls = true;
        mediaElement.loop = true;
        mediaElement.preload = 'metadata';
        if (!media.hasAudio) {
            mediaElement.muted = true;
            mediaElement.autoplay = true;
        }
    } else {
        mediaElement = document.createElement('img');
        mediaElement.src = media.url;
        mediaElement.loading = 'lazy';
        mediaElement.alt = 'Content';
        mediaElement.className = 'loading';

        // Remove loading class when image loads
        mediaElement.addEventListener('load', function() {
            this.classList.remove('loading');
        });

        mediaElement.addEventListener('error', function() {
            this.classList.remove('loading');
            this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext fill="%23888" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage unavailable%3C/text%3E%3C/svg%3E';
        });
    }

    card.appendChild(mediaElement);

    // Create card content
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = data.title;
    cardContent.appendChild(title);

    // Create actions
    const actions = document.createElement('div');
    actions.className = 'actions';

    const author = document.createElement('span');
    author.style.cssText = 'color:#888; font-size:0.8em;';
    author.textContent = `u/${data.author}`;
    actions.appendChild(author);

    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display:flex; gap:10px;';

    // Favorite button
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'btn-favorite';
    favoriteBtn.textContent = favorites.includes(data.id) ? '★' : '☆';
    if (favorites.includes(data.id)) {
        favoriteBtn.classList.add('favorited');
    }
    favoriteBtn.addEventListener('click', () => toggleFavorite(data.id, favoriteBtn, card));
    buttonGroup.appendChild(favoriteBtn);

    // Download button
    const downloadBtn = document.createElement('a');
    downloadBtn.href = media.url;
    downloadBtn.className = 'btn-dl';
    downloadBtn.textContent = 'Download ⬇';
    downloadBtn.download = media.url.split('/').pop() || 'reddit-media';
    downloadBtn.target = '_blank';
    buttonGroup.appendChild(downloadBtn);

    actions.appendChild(buttonGroup);

    cardContent.appendChild(actions);
    card.appendChild(cardContent);
    feed.appendChild(card);
}

// ============================================================================
// FAVORITES SYSTEM
// ============================================================================
function toggleFavorite(postId, button, card) {
    const index = favorites.indexOf(postId);

    if (index > -1) {
        // Remove from favorites
        favorites.splice(index, 1);
        button.textContent = '☆';
        button.classList.remove('favorited');
        card.querySelector('.favorite-badge')?.remove();
    } else {
        // Add to favorites
        favorites.push(postId);
        button.textContent = '★';
        button.classList.add('favorited');

        const badge = document.createElement('div');
        badge.className = 'favorite-badge';
        badge.textContent = '★';
        card.insertBefore(badge, card.firstChild);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function showOnlyFavorites() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const postId = card.dataset.postId;
        if (favorites.includes(postId)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function showAllPosts() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.display = '';
    });
}

// ============================================================================
// SEARCH WITHIN RESULTS
// ============================================================================
function filterPosts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.card');

    if (!searchTerm) {
        showAllPosts();
        return;
    }

    cards.forEach(card => {
        const title = card.querySelector('.title').textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================
function handleKeyboardShortcuts(e) {
    // Don't trigger if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    switch(e.key.toLowerCase()) {
        case 'g':
            // Toggle grid view
            toggleView();
            break;
        case 'r':
            // Reload feed
            loadFeed(true);
            break;
        case 'f':
            // Focus search
            document.getElementById('searchInput')?.focus();
            break;
        case 't':
            // Back to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case '?':
            // Show keyboard shortcuts
            toggleShortcutsHelp();
            break;
    }
}

function toggleShortcutsHelp() {
    let help = document.getElementById('shortcutsHelp');
    if (!help) {
        help = createShortcutsHelp();
        document.body.appendChild(help);
    }
    help.classList.toggle('visible');
}

function createShortcutsHelp() {
    const help = document.createElement('div');
    help.id = 'shortcutsHelp';
    help.className = 'shortcuts-help';
    help.innerHTML = `
        <button class="close-btn" onclick="toggleShortcutsHelp()">×</button>
        <h3>Keyboard Shortcuts</h3>
        <ul>
            <li><kbd>G</kbd> Toggle grid/list view</li>
            <li><kbd>R</kbd> Reload feed</li>
            <li><kbd>F</kbd> Focus search</li>
            <li><kbd>T</kbd> Back to top</li>
            <li><kbd>?</kbd> Show this help</li>
        </ul>
    `;
    return help;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
    const feed = document.getElementById('feed');
    feed.innerHTML = `
        <div class="error-message">
            ${message}
            <br><br>
            <button class="retry-btn" onclick="loadFeed(true)">Retry</button>
        </div>
    `;
}

function formatErrorMessage(error) {
    let errorMsg = 'Error loading subreddit. ';

    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
        errorMsg += '<br><br><strong>Network Error:</strong><br>';
        errorMsg += '1. Make sure you\'re running through a local server (not file://)<br>';
        errorMsg += '2. Check your internet connection<br>';
        errorMsg += '3. Check browser console (F12) for detailed errors<br><br>';
        errorMsg += '<strong>To start server:</strong><br>';
        errorMsg += '<code>./start.sh</code> or <code>python3 -m http.server 8000</code>';
    } else if (error.message.includes('blocking') || error.message.includes('rate limited') || error.message.includes('403') || error.message.includes('429')) {
        errorMsg += error.message + '<br><br>';
        errorMsg += '<strong>Reddit is blocking or rate-limiting requests.</strong><br><br>';
        errorMsg += 'This protects your personal usage. Wait a few moments and try again.';
    } else if (error.message.includes('404')) {
        errorMsg += 'The subreddit may be private or not exist.';
    } else {
        errorMsg += error.message || 'Unknown error occurred.';
    }

    return errorMsg;
}
