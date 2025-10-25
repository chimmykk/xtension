// Background script for X Post Tracker
console.log('X Post Tracker: Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('X Post Tracker: Extension installed/updated');
  
  if (details.reason === 'install') {
    // Initialize storage with empty array
    chrome.storage.local.set({ likedPosts: [] });
    console.log('X Post Tracker: Storage initialized');
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('X Post Tracker: Message received:', request);
  
  if (request.action === 'savePost') {
    savePost(request.data)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error saving post:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getPosts') {
    getPosts()
      .then((posts) => {
        sendResponse({ success: true, posts: posts });
      })
      .catch((error) => {
        console.error('Error getting posts:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
});

// Save a liked post
async function savePost(postData) {
  try {
    const result = await chrome.storage.local.get(['likedPosts']);
    const likedPosts = result.likedPosts || [];
    
    // Check if post already exists
    const existingIndex = likedPosts.findIndex(post => post.id === postData.id);
    
    if (existingIndex !== -1) {
      // Update existing post
      likedPosts[existingIndex] = postData;
    } else {
      // Add new post to the beginning
      likedPosts.unshift(postData);
    }
    
    // Limit to 1000 posts to prevent storage issues
    if (likedPosts.length > 1000) {
      likedPosts.splice(1000);
    }
    
    await chrome.storage.local.set({ likedPosts: likedPosts });
    console.log('Post saved successfully:', postData.id);
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
}

// Get all liked posts
async function getPosts() {
  try {
    const result = await chrome.storage.local.get(['likedPosts']);
    return result.likedPosts || [];
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.likedPosts) {
    console.log('X Post Tracker: Storage updated');
  }
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('twitter.com') || tab.url.includes('x.com')) {
      console.log('X Post Tracker: X/Twitter page loaded');
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This is handled by the popup, but we can add additional logic here if needed
  console.log('X Post Tracker: Extension icon clicked');
});
