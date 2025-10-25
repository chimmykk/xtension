// Popup script for X Post Tracker
document.addEventListener('DOMContentLoaded', function() {
  const postsList = document.getElementById('postsList');
  const totalPosts = document.getElementById('totalPosts');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const clearAllBtn = document.getElementById('clearAll');
  const exportDataBtn = document.getElementById('exportData');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let allPosts = [];
  let filteredPosts = [];
  let currentFilter = 'all';

  // Load and display posts
  async function loadPosts() {
    try {
      const result = await chrome.storage.local.get(['interactedPosts']);
      allPosts = result.interactedPosts || [];
      filteredPosts = [...allPosts];
      
      updateUI();
    } catch (error) {
      console.error('Error loading posts:', error);
      showError('Failed to load posts');
    }
  }

  // Update UI with current posts
  function updateUI() {
    totalPosts.textContent = allPosts.length;
    
    if (filteredPosts.length === 0) {
      postsList.style.display = 'none';
      emptyState.style.display = 'block';
    } else {
      postsList.style.display = 'block';
      emptyState.style.display = 'none';
      renderPosts();
    }
  }

  // Render posts in the UI
  function renderPosts() {
    postsList.innerHTML = '';
    
    filteredPosts.forEach(post => {
      const postElement = createPostElement(post);
      postsList.appendChild(postElement);
    });
  }

  // Create a post element
  function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-item';
    
    const interactedDate = new Date(post.interactedAt).toLocaleDateString();
    const interactedTime = new Date(post.interactedAt).toLocaleTimeString();
    
    // Get interaction type display info
    const interactionInfo = {
      'like': { icon: '❤️', label: 'Liked', color: '#f4212e' },
      'bookmark': { icon: '🔖', label: 'Bookmarked', color: '#1d9bf0' },
      'repost': { icon: '🔄', label: 'Reposted', color: '#00ba7c' },
      'unrepost': { icon: '↩️', label: 'Undo Reposted', color: '#ff6b35' },
      'comment': { icon: '💬', label: 'Commented', color: '#1d9bf0' }
    };
    
    const interaction = interactionInfo[post.interactionType] || { icon: '📝', label: 'Interacted', color: '#536471' };
    
    postDiv.innerHTML = `
      <div class="post-header">
        <span class="post-author">${escapeHtml(post.author)}</span>
        <span class="post-handle">@${escapeHtml(post.handle)}</span>
        <span class="post-timestamp">${interactedDate} ${interactedTime}</span>
      </div>
      <div class="interaction-badge" style="background-color: ${interaction.color}20; border-left: 3px solid ${interaction.color};">
        <span class="interaction-icon">${interaction.icon}</span>
        <span class="interaction-label">${interaction.label}</span>
      </div>
      <div class="post-text">${escapeHtml(post.text)}</div>
      <div class="post-actions">
        <button class="post-action-btn view" onclick="viewPost('${post.url}')">View Post</button>
        <button class="post-action-btn delete" onclick="deletePost('${post.id}', '${post.interactionType}')">Delete</button>
      </div>
    `;
    
    return postDiv;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // View post in new tab
  window.viewPost = function(url) {
    if (url) {
      chrome.tabs.create({ url: url });
    }
  };

  // Delete a post
  window.deletePost = async function(postId, interactionType) {
    if (confirm('Are you sure you want to delete this post from your tracker?')) {
      try {
        allPosts = allPosts.filter(post => !(post.id === postId && post.interactionType === interactionType));
        filteredPosts = filteredPosts.filter(post => !(post.id === postId && post.interactionType === interactionType));
        
        await chrome.storage.local.set({ interactedPosts: allPosts });
        updateUI();
      } catch (error) {
        console.error('Error deleting post:', error);
        showError('Failed to delete post');
      }
    }
  };

  // Clear all posts
  clearAllBtn.addEventListener('click', async function() {
    if (confirm('Are you sure you want to clear all tracked posts? This action cannot be undone.')) {
      try {
        await chrome.storage.local.set({ interactedPosts: [] });
        allPosts = [];
        filteredPosts = [];
        updateUI();
      } catch (error) {
        console.error('Error clearing posts:', error);
        showError('Failed to clear posts');
      }
    }
  });

  // Export data
  exportDataBtn.addEventListener('click', function() {
    if (allPosts.length === 0) {
      alert('No posts to export');
      return;
    }

    const dataStr = JSON.stringify(allPosts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `x-liked-posts-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  });

  // Filter functionality
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Set current filter
      currentFilter = this.getAttribute('data-filter');
      
      // Apply filters
      applyFilters();
    });
  });

  // Search functionality
  searchInput.addEventListener('input', function() {
    applyFilters();
  });

  // Apply both search and filter
  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    
    // Start with all posts
    let posts = [...allPosts];
    
    // Apply interaction type filter
    if (currentFilter !== 'all') {
      posts = posts.filter(post => post.interactionType === currentFilter);
    }
    
    // Apply search filter
    if (query !== '') {
      posts = posts.filter(post => 
        post.text.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query) ||
        post.handle.toLowerCase().includes(query)
      );
    }
    
    filteredPosts = posts;
    updateUI();
  }

  // Show error message
  function showError(message) {
    postsList.innerHTML = `<div class="loading" style="color: #f4212e;">${message}</div>`;
  }

  // Initialize
  loadPosts();
});
