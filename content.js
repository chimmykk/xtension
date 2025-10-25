// Content script for X Post Tracker
console.log('X Post Tracker: Content script loaded');

// Network monitoring for repost detection
let originalXHROpen, originalXHRSend;
let originalFetch;

// Store the last reposted tweet data
let lastRepostedTweet = null;

// Store tweet data when repost button is clicked
let pendingRepostData = null;

// Function to monitor network requests for repost actions
function setupNetworkMonitoring() {
  console.log('X Post Tracker: Setting up network monitoring for reposts');
  
  // Monitor XMLHttpRequest
  originalXHROpen = XMLHttpRequest.prototype.open;
  originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(data) {
    if (this._url && this._url.includes('CreateRetweet') || this._url.includes('DeleteRetweet')) {
      console.log('X Post Tracker: Repost API call detected:', this._method, this._url);
      
      // Store the request data for processing
      this._requestData = data;
      
      // Add response handler
      this.addEventListener('load', function() {
        if (this.status >= 200 && this.status < 300) {
          handleRepostResponse(this._url, this._method, this._requestData, this.responseText);
        }
      });
    }
    
    return originalXHRSend.apply(this, [data]);
  };
  
  // Monitor fetch requests
  originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    const fullUrl = typeof url === 'string' ? url : url.url;
    
    if (fullUrl && (fullUrl.includes('CreateRetweet') || fullUrl.includes('DeleteRetweet'))) {
      console.log('X Post Tracker: Repost fetch call detected:', options.method || 'GET', fullUrl);
      
      return originalFetch.apply(this, [url, options]).then(response => {
        if (response.ok) {
          // Clone the response to read it without consuming it
          const clonedResponse = response.clone();
          clonedResponse.text().then(responseText => {
            handleRepostResponse(fullUrl, options.method || 'GET', options.body, responseText);
          });
        }
        return response;
      });
    }
    
    return originalFetch.apply(this, [url, options]);
  };
}

// Function to handle repost API responses
function handleRepostResponse(url, method, requestData, responseText) {
  try {
    console.log('X Post Tracker: Processing repost response:', url, method);
    
    if (url.includes('CreateRetweet')) {
      console.log('X Post Tracker: CreateRetweet detected - processing repost');
      
      // Try to extract tweet ID from the request data
      let tweetId = null;
      if (requestData) {
        try {
          const data = typeof requestData === 'string' ? JSON.parse(requestData) : requestData;
          tweetId = data.variables?.tweet_id || data.tweet_id;
        } catch (e) {
          console.log('X Post Tracker: Could not parse request data:', e);
        }
      }
      
      // If we have a tweet ID, try to find the tweet element and extract data
      if (tweetId) {
        setTimeout(() => {
          const tweetElement = document.querySelector(`article[data-testid="tweet"] a[href*="/status/${tweetId}"]`)?.closest('article[data-testid="tweet"]');
          if (tweetElement) {
            const postData = extractPostDataFromElement(tweetElement, 'repost');
            if (postData) {
              console.log('X Post Tracker: Repost data extracted:', postData);
              saveInteractedPost(postData);
            }
          } else {
            console.log('X Post Tracker: Could not find tweet element for ID:', tweetId);
          }
        }, 1000); // Wait a bit for the UI to update
      } else {
        console.log('X Post Tracker: No tweet ID found in request data');
      }
    } else if (url.includes('DeleteRetweet')) {
      console.log('X Post Tracker: DeleteRetweet detected - ignoring (unrepost)');
    }
  } catch (error) {
    console.error('X Post Tracker: Error handling repost response:', error);
  }
}

// Function to extract post data from a tweet element
function extractPostDataFromElement(article, interactionType) {
  try {
    if (!article) return null;

    // Extract post text
    const textElement = article.querySelector('[data-testid="tweetText"]');
    const postText = textElement ? textElement.innerText : '';

    // Extract author info
    const authorElement = article.querySelector('[data-testid="User-Name"]');
    const authorName = authorElement ? authorElement.innerText.split('\n')[0] : '';
    const authorHandle = authorElement ? authorElement.innerText.split('\n')[1] : '';

    // Extract post URL
    const linkElement = article.querySelector('a[href*="/status/"]');
    const postUrl = linkElement ? linkElement.href : '';

    // Extract timestamp
    const timeElement = article.querySelector('time');
    const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

    // Extract post ID from URL
    const postId = postUrl.match(/\/status\/(\d+)/)?.[1] || '';

    return {
      id: postId,
      text: postText,
      author: authorName,
      handle: authorHandle,
      url: postUrl,
      timestamp: timestamp,
      interactionType: interactionType,
      interactedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting post data from element:', error);
    return null;
  }
}

// Function to extract post data
function extractPostData(element, interactionType) {
  try {
    // Find the article element (post container)
    let article = element.closest('article[data-testid="tweet"]');
    
    // If we can't find the article from the current element (e.g., repost confirmation text),
    // try to find it from the modal or look for the original post
    if (!article) {
      // For repost confirmations, the article might be in a different part of the DOM
      // Look for the tweet article in the modal or nearby
      const modal = element.closest('[role="dialog"]');
      if (modal) {
        article = modal.querySelector('article[data-testid="tweet"]');
      }
      
      // If still not found, try to find any tweet article on the page
      if (!article) {
        article = document.querySelector('article[data-testid="tweet"]');
      }
    }
    
    if (!article) {
      console.log('X Post Tracker: Could not find tweet article');
      return null;
    }

    // Extract post text
    const textElement = article.querySelector('[data-testid="tweetText"]');
    const postText = textElement ? textElement.innerText : '';

    // Extract author info
    const authorElement = article.querySelector('[data-testid="User-Name"]');
    const authorName = authorElement ? authorElement.innerText.split('\n')[0] : '';
    const authorHandle = authorElement ? authorElement.innerText.split('\n')[1] : '';

    // Extract post URL
    const linkElement = article.querySelector('a[href*="/status/"]');
    const postUrl = linkElement ? linkElement.href : '';

    // Extract timestamp
    const timeElement = article.querySelector('time');
    const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

    // Extract post ID from URL
    const postId = postUrl.match(/\/status\/(\d+)/)?.[1] || '';

    return {
      id: postId,
      text: postText,
      author: authorName,
      handle: authorHandle,
      url: postUrl,
      timestamp: timestamp,
      interactionType: interactionType,
      interactedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting post data:', error);
    return null;
  }
}

// Function to save interacted post
async function saveInteractedPost(postData) {
  try {
    // Check if extension context is still valid
    if (!chrome.storage) {
      console.log('X Post Tracker: Extension context invalidated, skipping save');
      return;
    }

    // Get existing posts
    const result = await chrome.storage.local.get(['interactedPosts']);
    const interactedPosts = result.interactedPosts || [];

    // Check if post already exists with same interaction type
    const existingIndex = interactedPosts.findIndex(post => 
      post.id === postData.id && post.interactionType === postData.interactionType
    );
    
    if (existingIndex !== -1) {
      // Update existing post
      interactedPosts[existingIndex] = postData;
    } else {
      // Add new post
      interactedPosts.unshift(postData);
    }

    // Save back to storage
    await chrome.storage.local.set({ interactedPosts: interactedPosts });
    
    console.log('Post saved:', postData);
    
    // Show notification
    const interactionMessages = {
      'like': 'Post liked and saved!',
      'bookmark': 'Post bookmarked and saved!',
      'repost': 'Post reposted and saved!',
      'unrepost': 'Post unreposted and saved!',
      'comment': 'Post commented and saved!'
    };
    
    showNotification(interactionMessages[postData.interactionType] || 'Post saved!');
  } catch (error) {
    console.error('Error saving post:', error);
    if (error.message.includes('Extension context invalidated')) {
      console.log('X Post Tracker: Extension was reloaded, please refresh the page');
    }
  }
}

// Function to show notification
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1d9bf0;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.textContent = message;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Function to handle interaction button clicks
function handleInteractionClick(event) {
  console.log('X Post Tracker: Click detected on:', event.target);
  console.log('X Post Tracker: Clicked element classes:', event.target.className);
  console.log('X Post Tracker: Clicked element tag:', event.target.tagName);
  

  // Check for repost confirmation click first - target the retweetConfirm div
  const repostConfirmDiv = event.target.closest('[data-testid="retweetConfirm"]');
  if (repostConfirmDiv) {
    console.log('X Post Tracker: Repost confirmation div clicked!');
    console.log('X Post Tracker: Clicked element:', event.target);
    console.log('X Post Tracker: Repost confirm div:', repostConfirmDiv);
    console.log('X Post Tracker: Pending repost data:', pendingRepostData);
    
    // Use the stored tweet data from when the repost button was clicked
    if (pendingRepostData) {
      console.log('X Post Tracker: Using stored tweet data for repost:', pendingRepostData);
      saveInteractedPost(pendingRepostData);
      pendingRepostData = null; // Clear the stored data
    } else {
      console.log('X Post Tracker: No pending repost data found - this might be an issue');
    }
    return;
  }

  // Check for undo repost confirmation click - target the unretweetConfirm div
  const unretweetConfirmDiv = event.target.closest('[data-testid="unretweetConfirm"]');
  if (unretweetConfirmDiv) {
    console.log('X Post Tracker: Undo repost confirmation div clicked!');
    console.log('X Post Tracker: Pending repost data:', pendingRepostData);
    
    // Use the stored tweet data from when the repost button was clicked
    if (pendingRepostData) {
      console.log('X Post Tracker: Using stored tweet data for undo repost:', pendingRepostData);
      const postData = { ...pendingRepostData, interactionType: 'unrepost' };
      saveInteractedPost(postData);
      pendingRepostData = null; // Clear the stored data
    } else {
      console.log('X Post Tracker: No pending repost data found for undo repost');
    }
    return;
  }
  
  // Check for different interaction types
  const likeButton = event.target.closest('[data-testid="like"]');
  const bookmarkButton = event.target.closest('[data-testid="bookmark"]');
  const repostButton = event.target.closest('[data-testid="retweet"]') || event.target.closest('[data-testid="unretweet"]');
  const commentButton = event.target.closest('[data-testid="reply"]');
  
  let interactionType = null;
  let button = null;
  
  if (likeButton) {
    interactionType = 'like';
    button = likeButton;
  } else if (bookmarkButton) {
    interactionType = 'bookmark';
    button = bookmarkButton;
  } else if (repostButton) {
    // For repost button click, store the tweet data for later use
    console.log('X Post Tracker: Repost button clicked - storing tweet data for confirmation');
    const tweetData = extractPostData(repostButton, 'repost');
    if (tweetData) {
      pendingRepostData = tweetData;
      console.log('X Post Tracker: Tweet data stored for repost confirmation:', tweetData);
    }
    return;
  } else if (commentButton) {
    interactionType = 'comment';
    button = commentButton;
  }
  
  if (!button) {
    console.log('X Post Tracker: Not an interaction button');
    return;
  }

  console.log('X Post Tracker: Interaction button found:', interactionType, button);
  
  // For like and bookmark, check if already interacted
  if (interactionType === 'like' || interactionType === 'bookmark') {
    const wasInteracted = button.getAttribute('aria-pressed') === 'true';
    console.log(`X Post Tracker: Was ${interactionType}ed before click:`, wasInteracted);
    
    // If it was already interacted, this is an undo action
    if (wasInteracted) {
      console.log(`X Post Tracker: This is an un${interactionType} action, ignoring`);
      return;
    }
  }

  // This is an interaction action, wait a bit for the UI to update then extract data
  setTimeout(() => {
    console.log(`X Post Tracker: Processing ${interactionType} action...`);
    const postData = extractPostData(button, interactionType);
    if (postData) {
      console.log('X Post Tracker: Post data extracted:', postData);
      saveInteractedPost(postData);
    } else {
      console.log('X Post Tracker: Failed to extract post data');
    }
  }, 100);
}

// Function to observe DOM changes for dynamically loaded content
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Re-attach event listeners to new content
            attachEventListeners(node);
            

            // Check for repost confirmation div elements
            const repostConfirmElements = node.querySelectorAll ? 
              node.querySelectorAll('[data-testid="retweetConfirm"]') : [];
            
            repostConfirmElements.forEach(element => {
              console.log('X Post Tracker: Found repost confirmation div element');
              // Add specific click listener for this element
              element.addEventListener('click', function(event) {
                console.log('X Post Tracker: Repost confirmation div clicked via observer!');
                console.log('X Post Tracker: Observer click - element:', element);
                console.log('X Post Tracker: Observer click - text content:', element.textContent);
                
                setTimeout(() => {
                  // Try to find the tweet article in the modal or nearby
                  let article = element.closest('article[data-testid="tweet"]');
                  if (!article) {
                    const modal = element.closest('[role="dialog"]');
                    if (modal) {
                      article = modal.querySelector('article[data-testid="tweet"]');
                    }
                  }
                  
                  // If still not found, try to find the original tweet that was being reposted
                  if (!article) {
                    const dropdown = element.closest('[data-testid="Dropdown"]');
                    if (dropdown) {
                      article = dropdown.closest('article[data-testid="tweet"]');
                    }
                  }
                  
                  if (article) {
                    const postData = extractPostDataFromElement(article, 'repost');
                    if (postData) {
                      console.log('X Post Tracker: Repost data extracted from observer click:', postData);
                      saveInteractedPost(postData);
                    }
                  } else {
                    console.log('X Post Tracker: Could not find tweet article for repost confirmation');
                  }
                }, 500);
              });
            });

            // Check for undo repost confirmation div elements
            const unretweetConfirmElements = node.querySelectorAll ? 
              node.querySelectorAll('[data-testid="unretweetConfirm"]') : [];
            
            unretweetConfirmElements.forEach(element => {
              console.log('X Post Tracker: Found undo repost confirmation div element');
              // Add specific click listener for this element
              element.addEventListener('click', function(event) {
                console.log('X Post Tracker: Undo repost confirmation div clicked via observer!');
                
                setTimeout(() => {
                  // Try to find the tweet article in the modal or nearby
                  let article = element.closest('article[data-testid="tweet"]');
                  if (!article) {
                    const modal = element.closest('[role="dialog"]');
                    if (modal) {
                      article = modal.querySelector('article[data-testid="tweet"]');
                    }
                  }
                  
                  if (article) {
                    const postData = extractPostDataFromElement(article, 'unrepost');
                    if (postData) {
                      console.log('X Post Tracker: Undo repost data extracted from observer click:', postData);
                      saveInteractedPost(postData);
                    }
                  } else {
                    console.log('X Post Tracker: Could not find tweet article for undo repost confirmation');
                  }
                }, 500);
              });
            });
          }
        });
      }
      
      // Also watch for attribute changes on interaction buttons
      if (mutation.type === 'attributes' && 
          (mutation.target.matches('[data-testid="like"]') || 
           mutation.target.matches('[data-testid="bookmark"]'))) {
        if (mutation.attributeName === 'aria-pressed') {
          const isInteracted = mutation.target.getAttribute('aria-pressed') === 'true';
          const interactionType = mutation.target.matches('[data-testid="like"]') ? 'like' : 'bookmark';
          console.log(`X Post Tracker: ${interactionType} button state changed to:`, isInteracted);
          
          // If it just became interacted, extract and save the post
          if (isInteracted) {
            setTimeout(() => {
              const postData = extractPostData(mutation.target, interactionType);
              if (postData) {
                console.log(`X Post Tracker: Post ${interactionType}ed via DOM observer:`, postData);
                saveInteractedPost(postData);
              }
            }, 100);
          }
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-pressed']
  });
}

// Function to attach event listeners
function attachEventListeners(container = document) {
  // Remove existing listeners to avoid duplicates
  container.removeEventListener('click', handleInteractionClick);
  
  // Add click listener for all interaction buttons
  container.addEventListener('click', handleInteractionClick, true); // Use capture phase
  
  // Also add specific listeners for interaction buttons
  const likeButtons = container.querySelectorAll('[data-testid="like"]');
  const bookmarkButtons = container.querySelectorAll('[data-testid="bookmark"]');
  const repostButtons = container.querySelectorAll('[data-testid="retweet"], [data-testid="unretweet"]');
  const commentButtons = container.querySelectorAll('[data-testid="reply"]');
  
  [...likeButtons, ...bookmarkButtons, ...repostButtons, ...commentButtons].forEach(button => {
    button.addEventListener('click', handleInteractionClick, true);
  });
  

  // Add specific listeners for repost confirmation div elements
  const repostConfirmElements = container.querySelectorAll('[data-testid="retweetConfirm"]');
  repostConfirmElements.forEach(element => {
    console.log('X Post Tracker: Found existing repost confirmation div element');
    element.addEventListener('click', function(event) {
      console.log('X Post Tracker: Repost confirmation div clicked via direct listener!');
      console.log('X Post Tracker: Direct listener - element:', element);
      console.log('X Post Tracker: Direct listener - text content:', element.textContent);
      
      setTimeout(() => {
        // Try to find the tweet article in the modal or nearby
        let article = element.closest('article[data-testid="tweet"]');
        if (!article) {
          const modal = element.closest('[role="dialog"]');
          if (modal) {
            article = modal.querySelector('article[data-testid="tweet"]');
          }
        }
        
        // If still not found, try to find the original tweet that was being reposted
        if (!article) {
          const dropdown = element.closest('[data-testid="Dropdown"]');
          if (dropdown) {
            article = dropdown.closest('article[data-testid="tweet"]');
          }
        }
        
        if (article) {
          const postData = extractPostDataFromElement(article, 'repost');
          if (postData) {
            console.log('X Post Tracker: Repost data extracted from direct listener:', postData);
            saveInteractedPost(postData);
          }
        } else {
          console.log('X Post Tracker: Could not find tweet article for repost confirmation');
        }
      }, 500);
    });
  });

  // Add specific listeners for undo repost confirmation div elements
  const unretweetConfirmElements = container.querySelectorAll('[data-testid="unretweetConfirm"]');
  unretweetConfirmElements.forEach(element => {
    console.log('X Post Tracker: Found existing undo repost confirmation div element');
    element.addEventListener('click', function(event) {
      console.log('X Post Tracker: Undo repost confirmation div clicked via direct listener!');
      
      setTimeout(() => {
        // Try to find the tweet article in the modal or nearby
        let article = element.closest('article[data-testid="tweet"]');
        if (!article) {
          const modal = element.closest('[role="dialog"]');
          if (modal) {
            article = modal.querySelector('article[data-testid="tweet"]');
          }
        }
        
        if (article) {
          const postData = extractPostDataFromElement(article, 'unrepost');
          if (postData) {
            console.log('X Post Tracker: Undo repost data extracted from direct listener:', postData);
            saveInteractedPost(postData);
          }
        } else {
          console.log('X Post Tracker: Could not find tweet article for undo repost confirmation');
        }
      }, 500);
    });
  });
  
  console.log('X Post Tracker: Attached listeners to', 
    likeButtons.length, 'like buttons,',
    bookmarkButtons.length, 'bookmark buttons,',
    repostButtons.length, 'repost buttons,',
    commentButtons.length, 'comment buttons,',
    repostConfirmElements.length, 'repost confirmation elements,',
    unretweetConfirmElements.length, 'undo repost confirmation elements'
  );
}

// Initialize the extension
function init() {
  console.log('X Post Tracker: Initializing...');
  console.log('X Post Tracker: Current URL:', window.location.href);
  console.log('X Post Tracker: Document ready state:', document.readyState);
  
  // Set up network monitoring for reposts
  setupNetworkMonitoring();
  
  // Attach event listeners to existing content
  attachEventListeners();
  
  // Start observing DOM changes
  observeDOM();
  
  // Test if we can find interaction buttons
  const likeButtons = document.querySelectorAll('[data-testid="like"]');
  const bookmarkButtons = document.querySelectorAll('[data-testid="bookmark"]');
  const repostButtons = document.querySelectorAll('[data-testid="retweet"], [data-testid="unretweet"]');
  const commentButtons = document.querySelectorAll('[data-testid="reply"]');
  
  console.log('X Post Tracker: Found interaction buttons on page:');
  console.log('  - Like buttons:', likeButtons.length);
  console.log('  - Bookmark buttons:', bookmarkButtons.length);
  console.log('  - Repost buttons:', repostButtons.length);
  console.log('  - Comment buttons:', commentButtons.length);
  
  console.log('X Post Tracker: Ready to track all interactions!');
  
  // Add test function to global scope for debugging
  window.testXPostTracker = function() {
    console.log('X Post Tracker: Test function called');
    const likeButtons = document.querySelectorAll('[data-testid="like"]');
    const repostButtons = document.querySelectorAll('[data-testid="retweet"]');
    const repostConfirmButtons = document.querySelectorAll('[data-testid="retweetConfirm"]');
    console.log('Found', likeButtons.length, 'like buttons');
    console.log('Found', repostButtons.length, 'repost buttons');
    console.log('Found', repostConfirmButtons.length, 'repost confirm buttons');
    
    // Test current user detection
    const currentUser = getCurrentUser();
    console.log('Current user detected:', currentUser);
    
    if (likeButtons.length > 0) {
      const firstButton = likeButtons[0];
      console.log('First like button:', firstButton);
      console.log('Current state:', firstButton.getAttribute('aria-pressed'));
      
      const postData = extractPostData(firstButton);
      console.log('Extracted post data:', postData);
    }
    
    if (repostConfirmButtons.length > 0) {
      console.log('Repost confirm buttons found:', repostConfirmButtons);
      repostConfirmButtons.forEach((btn, index) => {
        console.log(`Repost confirm button ${index}:`, btn);
        console.log(`Text content:`, btn.textContent);
      });
    }
  };
  
  console.log('X Post Tracker: Test function available as window.testXPostTracker()');
}


// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
