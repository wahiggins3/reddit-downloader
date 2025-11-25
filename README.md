# Reddit Media Downloader

A feature-rich web app to browse and download media from Reddit subreddits with built-in rate limiting for safe personal usage.

## Quick Start

### Option 1: Use the Startup Script (Easiest)

Just double-click `start.sh` or run:
```bash
./start.sh
```

This will:
- Start a local web server
- Open the app in your browser automatically
- Display the URL in case you need it

Press `Ctrl+C` to stop the server when you're done.

### Option 2: Manual Start

1. Open Terminal in this directory
2. Run: `python3 -m http.server 8000`
3. Open your browser and go to: `http://localhost:8000/index.html`

## Features

### Core Features
- 🎨 Clean, dark theme interface
- 📜 Infinite scroll through Reddit posts
- 🖼️ Support for images (JPEG, PNG, GIF, WebP)
- 🎥 Video support (v.redd.it, YouTube, Imgur GIFV, Vimeo)
- ⬇️ One-click media downloads
- 📱 Fully responsive design

### View & Navigation
- 🔲 Grid and list view toggle
- 🔍 Real-time search within loaded results
- ⌨️ Keyboard shortcuts for quick navigation
- ⬆️ Back to top button
- 💫 Image lazy loading with loading states

### Filtering & Sorting
- 🔥 Multiple filter options: Hot, New, Top, Rising, Controversial
- ⏰ Time range filters: Hour, Day, Week, Month, Year, All Time
- ⭐ Favorites/bookmarking system with local storage

### Protection & Safety
- 🛡️ Built-in rate limiting (max 30 requests/minute)
- ⚡ Automatic request throttling (2 second minimum interval)
- 🔄 Exponential backoff on failures
- ⚠️ Rate limit warnings to protect your access
- 🎯 Multiple CORS proxy fallback system

## How to Use

### Basic Usage
1. Enter a subreddit name (e.g., `pics`, `aww`, `videos`)
2. Select your preferred filter (Hot, New, Top, etc.)
3. For Top/Controversial, choose a time range
4. Click "Go" or press Enter
5. Scroll to load more posts
6. Click "Download ⬇" to save any media
7. Click "☆" to favorite posts (saved in browser)

### Keyboard Shortcuts
- `G` - Toggle between grid and list view
- `R` - Reload feed with current filters
- `F` - Focus search box
- `T` - Scroll to top
- `?` - Show keyboard shortcuts help

## Requirements

- Python 3 (for local server)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

## Project Structure

```
reddit-downloader/
├── index.html          # Main HTML file
├── app.js             # Application logic with rate limiting
├── styles.css         # All styling
├── start.sh           # Startup script
├── package.json       # Project metadata
├── README.md          # This file
└── reddit-downloader.html  # Legacy monolithic version (optional)
```

## Rate Limiting & Safety

This app includes built-in rate limiting to protect your personal usage:

- **Maximum**: 30 requests per minute
- **Minimum interval**: 2 seconds between requests
- **Auto-throttling**: Automatically slows down when approaching limits
- **Visual warnings**: Alerts you when rate limits are being approached
- **Exponential backoff**: Automatically retries with increasing delays on failures

The app will automatically pause and resume requests if you hit the rate limit. This prevents Reddit from blocking your IP address.

## Troubleshooting

**"Error loading subreddit"**
- Make sure you're running through the local server (not opening the file directly)
- Check your internet connection
- Try a different subreddit name
- Click the "Retry" button to try again

**"Rate limit approaching" warning**
- This is normal and protects your access
- The app will automatically slow down requests
- Wait a few seconds before loading more content
- Consider reducing scroll speed to avoid rapid requests

**Port already in use**
- The script uses port 8000 by default
- The start.sh script will offer to kill the existing process
- Or manually use a different port: `python3 -m http.server 8080`
- To manually kill: `killall python3` or `lsof -ti:8000 | xargs kill -9`

**Videos not playing**
- Some Reddit videos may require audio/video merging not supported by browsers
- YouTube/Vimeo videos show as links (download may open in new tab)
- Try downloading the video and playing locally

**Images not loading**
- Check browser console (F12) for errors
- Some images may be removed or deleted from Reddit
- Reddit's CDN may be blocking direct access
- Try a different subreddit or filter

## Privacy & Data Storage

- All data is stored locally in your browser (localStorage)
- Favorites and settings persist between sessions
- No data is sent to any server except Reddit's API
- No tracking or analytics
- Clear browser data to reset all settings and favorites

## Advanced Usage

### Custom Port
```bash
python3 -m http.server 9000
# Then open http://localhost:9000/index.html
```

### Clearing Favorites
Open browser console (F12) and run:
```javascript
localStorage.removeItem('favorites')
```

### Adjusting Rate Limits
Edit `app.js` and modify:
```javascript
maxRequestsPerMinute: 30,  // Lower for more conservative use
minRequestInterval: 2000,  // Increase for longer delays (in ms)
```

## Known Limitations

- Reddit videos with separate audio streams require complex merging
- Private or quarantined subreddits are not accessible
- Reddit may block requests during high server load
- Some CORS proxies may be slow or rate-limited
- Gallery posts (multiple images) show only the first image

## Future Improvements

- Bulk download functionality
- Gallery post support (all images)
- Better video player with audio merging
- Export favorites as JSON
- Dark/light theme toggle
- Custom subreddit lists

## Credits

Built with vanilla JavaScript, no frameworks required. Uses Reddit's public JSON API.

