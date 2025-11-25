# Reddit Media Downloader

A simple, clean web app to browse and download images from Reddit subreddits.

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
3. Open your browser and go to: `http://localhost:8000/reddit-downloader.html`

## Features

- 🎨 Clean, dark theme interface
- 📜 Infinite scroll through Reddit posts
- ⬇️ One-click image downloads
- 🔍 Search any subreddit
- 📱 Responsive design

## How to Use

1. Enter a subreddit name (e.g., `pics`, `aww`, `funny`)
2. Click "Go" or press Enter
3. Scroll to load more posts
4. Click "Download ⬇" to save any image

## Requirements

- Python 3 (for local server)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Troubleshooting

**"Error loading subreddit"**
- Make sure you're running through the local server (not opening the file directly)
- Check your internet connection
- Try a different subreddit name

**Port already in use**
- The script uses port 8000 by default
- If it's busy, you can manually use a different port: `python3 -m http.server 8080`

## Notes

- Only displays image posts (JPEG, PNG, GIF)
- Videos (v.redd.it) are not supported in this version
- Reddit may rate-limit requests if you make too many too quickly

