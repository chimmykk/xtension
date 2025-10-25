# X Post Tracker - Installation Guide

## Quick Installation Steps

### 1. Load the Extension in Chrome

1. **Open Chrome** and go to `chrome://extensions/`
2. **Enable Developer Mode** (toggle in top-right corner)
3. **Click "Load unpacked"**
4. **Select this folder** (`/Users/yeiterilsosingkoireng/Desktop/poctest`)
5. **Pin the extension** to your toolbar

### 2. Start Using the Extension

1. **Visit X.com or Twitter.com**
2. **Like some posts** (click the heart button)
3. **Click the extension icon** in your toolbar
4. **View your tracked posts** in the popup

## What the Extension Does

- **Automatically tracks** posts you like on X/Twitter
- **Saves post data** including text, author, timestamp, and URL
- **Provides a clean interface** to view and search your liked posts
- **Allows export** of your data as JSON
- **Works completely offline** - no data sent to external servers

## Features

✅ **Automatic Detection**: Detects when you like posts  
✅ **Beautiful UI**: Clean, modern popup interface  
✅ **Search**: Find posts by content, author, or handle  
✅ **Export**: Download your data as JSON  
✅ **Privacy**: All data stored locally on your device  
✅ **Real-time**: Instant notifications when posts are saved  

## Troubleshooting

### Extension not working?
- Make sure you're on X.com or Twitter.com
- Check that Developer Mode is enabled
- Try refreshing the page

### Posts not being saved?
- Ensure you're actually liking posts (heart should be filled)
- Check browser console for errors (F12 → Console)
- Verify extension permissions

### Can't see the popup?
- Click the extension icon in your toolbar
- Make sure the extension is pinned
- Check that the extension is enabled in chrome://extensions/

## File Structure

```
poctest/
├── manifest.json          # Extension configuration
├── content.js            # Detects likes on X/Twitter
├── background.js         # Background service worker
├── popup.html           # Extension popup interface
├── popup.css            # Popup styling
├── popup.js             # Popup functionality
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md           # Detailed documentation
└── INSTALLATION.md     # This file
```

## Next Steps

1. **Test the extension** by liking some posts on X
2. **Customize the code** if needed (all files are well-commented)
3. **Share feedback** or report any issues
4. **Consider publishing** to Chrome Web Store if you want to distribute it

## Privacy & Security

- ✅ No external data transmission
- ✅ All data stored locally
- ✅ No tracking or analytics
- ✅ Open source code
- ✅ Minimal permissions required

---

**Ready to start tracking your liked posts!** 🚀
