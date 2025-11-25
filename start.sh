#!/bin/bash

# Reddit Downloader - Local Server Startup Script

PORT=8000
HTML_FILE="index.html"
FALLBACK_HTML="reddit-downloader.html"

echo "🚀 Starting Reddit Downloader..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python is not installed."
    echo "Please install Python 3 to run this script."
    exit 1
fi

# Check if the HTML file exists (try new index.html first, then fallback)
if [ -f "$HTML_FILE" ]; then
    echo "✓ Using $HTML_FILE"
elif [ -f "$FALLBACK_HTML" ]; then
    HTML_FILE="$FALLBACK_HTML"
    echo "✓ Using legacy $HTML_FILE"
else
    echo "❌ Error: No HTML file found in current directory."
    echo "Looking for: $HTML_FILE or $FALLBACK_HTML"
    exit 1
fi

# Check if required files exist (for new version)
if [ "$HTML_FILE" = "index.html" ]; then
    if [ ! -f "app.js" ] || [ ! -f "styles.css" ]; then
        echo "⚠️  Warning: Missing app.js or styles.css files."
        echo "The application may not work correctly."
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if port is already in use
if command -v lsof &> /dev/null; then
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $PORT is already in use."
        read -p "Try to kill existing process? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti:$PORT | xargs kill -9 2>/dev/null
            sleep 1
        else
            echo "Please use a different port or close the application using port $PORT"
            exit 1
        fi
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":$PORT "; then
        echo "⚠️  Port $PORT appears to be in use."
        echo "If the server fails to start, try: killall python3"
    fi
fi

# Start the server in the background
echo "📡 Starting local web server on port $PORT..."
$PYTHON_CMD -m http.server $PORT > /tmp/reddit-downloader.log 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Error: Failed to start server."
    echo "Port $PORT may be in use or there was an error."
    echo ""
    echo "Server log:"
    cat /tmp/reddit-downloader.log 2>/dev/null
    echo ""
    echo "Try: killall python3"
    echo "Or use a different port: python3 -m http.server 8080"
    exit 1
fi

# Open browser
URL="http://localhost:$PORT/$HTML_FILE"
echo "🌐 Opening browser at $URL"
echo ""
echo "✅ Server is running! Press Ctrl+C to stop."
echo ""

# Open browser (works on macOS and Linux with xdg-open)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$URL" 2>/dev/null || sensible-browser "$URL" 2>/dev/null
else
    echo "Please open this URL in your browser: $URL"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping server..."
    kill $SERVER_PID 2>/dev/null
    rm -f /tmp/reddit-downloader.log 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Keep script running
wait $SERVER_PID

