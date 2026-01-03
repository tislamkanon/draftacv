// Blog CMS JavaScript - Premium Version 3.0
// Handles all CMS functionality
/* ============================================
        MADE BY MD TOUHIDUL ISLAM KANON
   ============================================ */
// ============================================
// FIREBASE INITIALIZATION - DO NOT MODIFY
// ============================================

// Initialize Firebase for CMS
let db;
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(window.firebaseConfig);
  db = firebase.firestore();
}

// ============================================
// GLOBAL STATE - DO NOT MODIFY
// ============================================

let posts = [];
let currentEditId = null;
let savedSelection = null;
let autoDraftTimer = null;
let calendarTasks = [];
let currentCalendarDate = new Date();
let currentSortField = 'date';
let currentSortDirection = 'desc';
let editingTaskId = null;
let selectedPosts = new Set();
let inactivityTimer = null;
let countdownTimer = null;
let countdownSeconds = 60;
const INACTIVITY_TIMEOUT = 45 * 60 * 1000; // 45 minutes
const WARNING_TIME = 60; // 60 seconds warning

// Category labels mapping
const categoryLabels = {
  'resume-tips': 'Resume Tips',
  'career-advice': 'Career Advice',
  'interview-prep': 'Interview Prep',
  'job-search': 'Job Search'
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Core initialization
  loadPosts();
  setupMetaCharCount();
  setDefaultDate();
  setupFeaturedImagePreview();
  
  // New UI features initialization
  initTheme();
  initKeyboardShortcuts();
  initMobileResponsive();
  initAnimations();
  initToolbarActiveStates();
  initAutoDraft();
  initCalendar();
  loadCalendarTasks();
  initCategoryMenu();
  initEditorKeyboardShortcuts();
  initInactivityDetection();
  updateAdminEmail();
  
  // Initialize read time tracking and category selector
  initReadTimeTracking();
  initMobileInactivityDetection();
  updateWordCount();
  
  // Close sort dropdowns when clicking outside
  document.addEventListener('click', closeSortDropdowns);
});

// ============================================
// FIREBASE API - DO NOT MODIFY
// ============================================

// Firestore API wrapper functions
const FirestoreAPI = {
  async getAll() {
    const snapshot = await db.collection('blog_posts').orderBy('publish_date', 'desc').get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return { data };
  },
  
  async getOne(id) {
    const doc = await db.collection('blog_posts').doc(id).get();
    if (!doc.exists) throw new Error('Not found');
    return { id: doc.id, ...doc.data() };
  },
  
  async create(data) {
    const docRef = await db.collection('blog_posts').add(data);
    return { id: docRef.id, ...data };
  },
  
  async update(id, data) {
    await db.collection('blog_posts').doc(id).update(data);
    return { id, ...data };
  },
  
  async delete(id) {
    await db.collection('blog_posts').doc(id).delete();
    return { success: true };
  }
};

// ============================================
// DATA LOADING - DO NOT MODIFY CORE LOGIC
// ============================================

async function loadPosts() {
  try {
    console.log('🔍 Loading posts from Firestore...');
    showLoadingState();
    
    const data = await FirestoreAPI.getAll();
    posts = data.data || [];
    console.log('✅ Loaded', posts.length, 'posts');
    
    updateDashboardStats();
    updateCategoryCounts();
    renderRecentPosts();
    renderPostsTable();
    renderMobilePosts();
    updateNavCounts();
    
    hideLoadingState();
  } catch (error) {
    console.error('Error loading posts:', error);
    showToast('Failed to load posts', 'error');
    hideLoadingState();
  }
}

// ============================================
// DASHBOARD STATS - DO NOT MODIFY CORE LOGIC
// ============================================

function updateDashboardStats() {
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.published).length;
  const draftPosts = posts.filter(p => !p.published && p.status !== 'pending').length;
  const featuredPosts = posts.filter(p => p.featured).length;
  
  animateValue('total-posts', totalPosts);
  animateValue('published-posts', publishedPosts);
  animateValue('draft-posts', draftPosts);
  animateValue('featured-posts', featuredPosts);
}

function updateCategoryCounts() {
  const categories = ['resume-tips', 'career-advice', 'interview-prep', 'job-search'];
  
  // Update All count
  const allElem = document.getElementById('nav-cat-all');
  if (allElem) {
    allElem.textContent = posts.length;
  }
  
  categories.forEach(cat => {
    const count = posts.filter(p => p.category === cat).length;
    const elem = document.getElementById(`cat-${cat}`);
    if (elem) {
      elem.textContent = `${count} posts`;
    }
    // Update sidebar nav counts
    const navElem = document.getElementById(`nav-cat-${cat}`);
    if (navElem) {
      navElem.textContent = count;
    }
  });
}

// ============================================
// STAT CARD FILTERING (CLICKABLE TABS)
// ============================================

function filterByStatCard(filter) {
  // Update active state
  document.querySelectorAll('.stat-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`.stat-tab[data-filter="${filter}"]`)?.classList.add('active');
  
  // Switch to posts view and apply filter
  switchView('posts');
  
  setTimeout(() => {
    const statusFilter = document.getElementById('posts-filter');
    if (statusFilter) {
      if (filter === 'all') {
        statusFilter.value = 'all';
      } else if (filter === 'published') {
        statusFilter.value = 'published';
      } else if (filter === 'draft') {
        statusFilter.value = 'draft';
      } else if (filter === 'featured') {
        statusFilter.value = 'all';
        // Filter for featured posts specifically
        const originalPosts = posts;
        posts = posts.filter(p => p.featured);
        renderPostsTable();
        renderMobilePosts();
        posts = originalPosts;
        return;
      }
      filterPosts();
    }
  }, 100);
}

// ============================================
// RECENT POSTS RENDERING - ENHANCED
// ============================================

function renderRecentPosts() {
  const container = document.getElementById('recent-posts');
  const recentPosts = posts.slice(0, 5);
  
  if (recentPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-file-alt"></i>
        </div>
        <h3>No posts yet</h3>
        <p>Create your first blog post to get started</p>
        <button class="btn btn-primary" onclick="switchView('editor'); resetEditor();">
          <i class="fas fa-plus"></i>
          Create Post
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = recentPosts.map((post, index) => `
    <div class="recent-post-item" onclick="openPostInPanel('${post.id}')" style="animation-delay: ${index * 50}ms">
      ${post.featured_image ? 
        `<img src="${post.featured_image}" 
             alt="${post.title}" 
             class="recent-post-image"
             loading="lazy"
             onload="this.classList.add('loaded')"
             onerror="handleImageError(this, 'recent')">` :
        `<div class="recent-post-image-placeholder"><i class="fas fa-image"></i></div>`
      }
      <div class="recent-post-info">
        <div class="recent-post-title">${post.title || 'Untitled'}</div>
        <div class="recent-post-meta">
          <span class="category-badge ${post.category || ''}" style="font-size: 10px; padding: 2px 8px;">
            ${categoryLabels[post.category] || 'Uncategorized'}
          </span>
          <span class="post-status ${post.published ? 'published' : (post.status === 'pending' ? 'pending' : 'draft')}">
            ${post.published ? 'Published' : (post.status === 'pending' ? 'Pending' : 'Draft')}
          </span>
          <span>${formatDate(post.publish_date)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// POSTS TABLE RENDERING - WITH DOCUMENT ICON
// ============================================

function renderPostsTable() {
  const tbody = document.getElementById('posts-table-body');
  const emptyState = document.getElementById('posts-empty');
  
  if (posts.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  tbody.innerHTML = posts.map((post, index) => `
    <tr style="animation: fadeIn 0.2s ease ${index * 30}ms both">
      <td>
        <label class="table-checkbox">
          <input type="checkbox" ${selectedPosts.has(post.id) ? 'checked' : ''} onchange="togglePostSelection('${post.id}')">
          <span class="checkbox-custom"></span>
        </label>
      </td>
      <td>
        <div class="post-title-cell">
          <i class="fas fa-file-alt post-title-icon"></i>
          <span class="post-title-link" onclick="openPostInPanel('${post.id}')">${post.title || 'Untitled'}</span>
        </div>
      </td>
      <td>
        ${post.featured_image ? 
          `<img src="${post.featured_image}" 
               alt="" 
               class="post-thumb"
               loading="lazy"
               onload="this.classList.add('loaded')"
               onerror="handleImageError(this, 'thumb')">` :
          `<div class="post-thumb-placeholder"><i class="fas fa-image"></i></div>`
        }
      </td>
      <td>
        <span class="post-date">${formatDate(post.publish_date)}</span>
      </td>
      <td>
        <span class="category-badge ${post.category || ''}">${categoryLabels[post.category] || 'Uncategorized'}</span>
      </td>
      <td>
        <span class="featured-badge ${post.featured ? 'yes' : 'no'}">
          ${post.featured ? '<i class="fas fa-star"></i> Yes' : 'No'}
        </span>
      </td>
      <td>
        <span class="post-edited">${formatDateTime(post.last_edited)}</span>
      </td>
      <td>
        <span class="post-status ${post.published ? 'published' : (post.status === 'pending' ? 'pending' : 'draft')}">
          <i class="fas fa-${post.published ? 'check-circle' : (post.status === 'pending' ? 'clock' : 'file-alt')}"></i>
          ${post.published ? 'Published' : (post.status === 'pending' ? 'Pending' : 'Draft')}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="editPost('${post.id}')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn" onclick="viewPost('${post.id}')" title="View">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn delete" onclick="deletePost('${post.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  updateBatchActionsBar();
}

// ============================================
// BATCH SELECTION FEATURES
// ============================================

function togglePostSelection(id) {
  if (selectedPosts.has(id)) {
    selectedPosts.delete(id);
  } else {
    selectedPosts.add(id);
  }
  updateBatchActionsBar();
}

function toggleSelectAll() {
  const selectAll = document.getElementById('select-all-posts');
  if (selectAll.checked) {
    posts.forEach(p => selectedPosts.add(p.id));
  } else {
    selectedPosts.clear();
  }
  renderPostsTable();
}

function updateBatchActionsBar() {
  const bar = document.getElementById('batch-actions-bar');
  const count = document.getElementById('selected-count');
  
  if (selectedPosts.size > 0) {
    bar.style.display = 'flex';
    count.textContent = selectedPosts.size;
  } else {
    bar.style.display = 'none';
  }
}

function clearBatchSelection() {
  selectedPosts.clear();
  document.getElementById('select-all-posts').checked = false;
  renderPostsTable();
}

async function batchUpdateStatus(status) {
  if (selectedPosts.size === 0) return;
  
  try {
    showToast(`Updating ${selectedPosts.size} posts...`, 'info');
    
    for (const id of selectedPosts) {
      let updateData = { last_edited: Date.now() };
      
      if (status === 'published') {
        updateData.published = true;
        updateData.status = 'published';
      } else if (status === 'draft') {
        updateData.published = false;
        updateData.status = 'draft';
      } else if (status === 'pending') {
        updateData.published = false;
        updateData.status = 'pending';
      }
      
      await FirestoreAPI.update(id, updateData);
    }
    
    showToast(`${selectedPosts.size} posts updated successfully!`, 'success');
    clearBatchSelection();
    await loadPosts();
    
  } catch (error) {
    console.error('Batch update error:', error);
    showToast('Failed to update some posts', 'error');
  }
}

function batchDelete() {
  if (selectedPosts.size === 0) return;
  
  document.getElementById('batch-delete-count').textContent = selectedPosts.size;
  openModal('batch-delete-modal');
}

async function confirmBatchDelete() {
  if (selectedPosts.size === 0) return;
  
  try {
    showToast(`Deleting ${selectedPosts.size} posts...`, 'info');
    
    for (const id of selectedPosts) {
      await FirestoreAPI.delete(id);
    }
    
    showToast(`${selectedPosts.size} posts deleted successfully!`, 'success');
    closeModal('batch-delete-modal');
    clearBatchSelection();
    await loadPosts();
    
  } catch (error) {
    console.error('Batch delete error:', error);
    showToast('Failed to delete some posts', 'error');
  }
}

// ============================================
// MOBILE POSTS RENDERING
// ============================================

function renderMobilePosts() {
  const container = document.getElementById('mobile-posts-grid');
  if (!container) return;
  
  if (posts.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  // List view layout for mobile
  container.innerHTML = posts.map((post, index) => `
    <div class="mobile-post-card" style="animation: fadeIn 0.2s ease ${index * 30}ms both" onclick="openPostInPanel('${post.id}')">
      ${post.featured_image ? 
        `<img src="${post.featured_image}" 
             alt="${post.title}"
             loading="lazy"
             onload="this.classList.add('loaded')"
             onerror="handleImageError(this, 'mobile')">` :
        `<div class="mobile-post-image-placeholder"><i class="fas fa-image"></i></div>`
      }
      <div class="mobile-post-card-content">
        <span class="category-badge ${post.category || ''}">${categoryLabels[post.category] || 'Uncategorized'}</span>
        <h3>${post.title || 'Untitled'}</h3>
        <span class="post-date">${formatDate(post.publish_date)}</span>
      </div>
      <div class="mobile-post-card-footer" onclick="event.stopPropagation()">
        <div class="action-btns">
          <button class="action-btn" onclick="editPost('${post.id}')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="deletePost('${post.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// SORT DROPDOWN MENU
// ============================================

function openSortMenu(event, field) {
  event.stopPropagation();
  
  // Close all dropdowns first
  document.querySelectorAll('.sort-dropdown').forEach(d => d.classList.remove('active'));
  
  // Open the clicked one
  const dropdown = document.getElementById(`sort-dropdown-${field}`);
  if (dropdown) {
    dropdown.classList.add('active');
  }
}

function closeSortDropdowns(event) {
  if (!event.target.closest('.sortable')) {
    document.querySelectorAll('.sort-dropdown').forEach(d => d.classList.remove('active'));
  }
}

// ============================================
// CUSTOM FILTER DROPDOWNS
// ============================================

function toggleFilterDropdown(type) {
  const dropdown = document.getElementById(`${type}-filter-dropdown`);
  const button = dropdown.querySelector('.custom-filter-btn');
  const menu = dropdown.querySelector('.custom-filter-menu');
  const wasOpen = dropdown.classList.contains('open');
  
  // Close all dropdowns first
  document.querySelectorAll('.custom-filter-dropdown').forEach(d => {
    d.classList.remove('open');
  });
  
  // Toggle the clicked one
  if (!wasOpen) {
    dropdown.classList.add('open');
    
    // Position the menu below the button on mobile
    if (window.innerWidth <= 768) {
      const rect = button.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.left = `${rect.left}px`;
      menu.style.right = `${window.innerWidth - rect.right}px`;
      menu.style.width = 'auto';
      menu.style.minWidth = `${rect.width}px`;
    }
  }
}

function selectStatusFilter(value) {
  // Update hidden input
  document.getElementById('posts-filter').value = value;
  
  // Update button display
  const valueDisplay = document.getElementById('status-filter-value');
  const labels = {
    'all': 'All Status',
    'published': 'Published',
    'draft': 'Drafts',
    'pending': 'Pending Review'
  };
  valueDisplay.textContent = labels[value] || 'All Status';
  
  // Update active state
  document.querySelectorAll('#status-filter-menu .filter-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === value);
  });
  
  // Close dropdown
  document.getElementById('status-filter-dropdown').classList.remove('open');
  
  // Trigger filter
  filterPosts();
}

function selectCategoryFilter(value) {
  // Update hidden input
  document.getElementById('category-filter').value = value;
  
  // Update button display
  const valueDisplay = document.getElementById('category-filter-value');
  const labels = {
    'all': 'All Categories',
    'resume-tips': 'Resume Tips',
    'career-advice': 'Career Advice',
    'interview-prep': 'Interview Prep',
    'job-search': 'Job Search'
  };
  valueDisplay.textContent = labels[value] || 'All Categories';
  
  // Update active state
  document.querySelectorAll('#category-filter-menu .filter-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === value);
  });
  
  // Close dropdown
  document.getElementById('category-filter-dropdown').classList.remove('open');
  
  // Trigger filter
  filterPosts();
}

// Enhanced click-outside handler for mobile dropdowns
document.addEventListener('click', function(e) {
  // Close custom filter dropdowns when clicking outside
  if (!e.target.closest('.custom-filter-dropdown')) {
    document.querySelectorAll('.custom-filter-dropdown').forEach(d => {
      d.classList.remove('open');
    });
  }
  
  // Close category selector when clicking outside
  if (!e.target.closest('.category-selector')) {
    const selector = document.getElementById('category-selector');
    if (selector) {
      selector.classList.remove('open');
    }
  }
});

// ============================================
// FILTER AND SORT POSTS
// ============================================

function filterPosts() {
  const search = document.getElementById('posts-search').value.toLowerCase();
  const statusFilter = document.getElementById('posts-filter').value;
  const categoryFilter = document.getElementById('category-filter')?.value || 'all';
  
  let filtered = posts;
  
  if (search) {
    filtered = filtered.filter(p => 
      (p.title || '').toLowerCase().includes(search) ||
      (p.excerpt || '').toLowerCase().includes(search)
    );
  }
  
  if (statusFilter === 'published') {
    filtered = filtered.filter(p => p.published);
  } else if (statusFilter === 'draft') {
    filtered = filtered.filter(p => !p.published && p.status !== 'pending');
  } else if (statusFilter === 'pending') {
    filtered = filtered.filter(p => p.status === 'pending');
  }
  
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(p => p.category === categoryFilter);
  }
  
  // Sort
  filtered = sortPostsArray(filtered);
  
  const originalPosts = posts;
  posts = filtered;
  renderPostsTable();
  renderMobilePosts();
  posts = originalPosts;
}

function sortPosts(field, direction) {
  currentSortField = field;
  currentSortDirection = direction;
  
  // Close dropdown
  document.querySelectorAll('.sort-dropdown').forEach(d => d.classList.remove('active'));
  
  filterPosts();
}

function sortPostsArray(arr) {
  return [...arr].sort((a, b) => {
    let valA, valB;
    
    switch (currentSortField) {
      case 'title':
        valA = (a.title || '').toLowerCase();
        valB = (b.title || '').toLowerCase();
        break;
      case 'date':
        valA = getTimestamp(a.publish_date);
        valB = getTimestamp(b.publish_date);
        break;
      case 'category':
        valA = a.category || '';
        valB = b.category || '';
        break;
      case 'edited':
        valA = a.last_edited || 0;
        valB = b.last_edited || 0;
        break;
      case 'status':
        valA = a.published ? 1 : 0;
        valB = b.published ? 1 : 0;
        break;
      case 'featured':
        valA = a.featured ? 1 : 0;
        valB = b.featured ? 1 : 0;
        break;
      default:
        valA = getTimestamp(a.publish_date);
        valB = getTimestamp(b.publish_date);
    }
    
    if (currentSortDirection === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
}

function filterByCategory(category) {
  // Update active state in submenu
  document.querySelectorAll('.nav-subitem').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`.nav-subitem[data-category="${category}"]`)?.classList.add('active');
  
  switchView('posts');
  setTimeout(() => {
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.value = category;
      
      // Update the visual display of the category filter button
      selectCategoryFilter(category);
    }
    filterPosts();
  }, 100);
}

// ============================================
// VIEW SWITCHING - ENHANCED
// ============================================

function switchView(view) {
  document.querySelectorAll('.cms-view').forEach(v => {
    if (v.classList.contains('active')) {
      v.style.opacity = '0';
      setTimeout(() => {
        v.classList.remove('active');
        v.style.opacity = '';
      }, 150);
    }
  });
  
  setTimeout(() => {
    const newView = document.getElementById(`${view}-view`);
    if (newView) {
      newView.classList.add('active');
      newView.style.animation = 'fadeIn 0.2s ease';
    }
  }, 150);
  
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(n => n.classList.remove('active'));
  
  const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
  const mobileNavItem = document.querySelector(`.mobile-nav-btn[data-view="${view}"]`);
  
  if (navItem) navItem.classList.add('active');
  if (mobileNavItem) mobileNavItem.classList.add('active');
  
  const headerTitle = document.getElementById('header-title');
  const titles = {
    'dashboard': 'Dashboard',
    'posts': 'All Articles',
    'editor': currentEditId ? 'Edit Post' : 'New Post',
    'categories': 'Categories',
    'calendar': 'Content Calendar'
  };
  if (headerTitle) {
    headerTitle.textContent = titles[view] || view;
  }
  
  // Close mobile sidebar if open
  closeMobileSidebar();
}

/* ============================================
        MADE BY MD TOUHIDUL ISLAM KANON
   ============================================ */

// ============================================
// SLIDE-IN PANEL FOR POST EDITING
// ============================================

function openPostInPanel(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  
  const panel = document.getElementById('slide-panel');
  const overlay = document.getElementById('slide-panel-overlay');
  const content = document.getElementById('slide-panel-content');
  const title = document.getElementById('slide-panel-title');
  
  title.textContent = post.title || 'Edit Post';
  
  content.innerHTML = `
    <div class="panel-post-details">
      <div class="panel-image">
        ${post.featured_image ? 
          `<img src="${post.featured_image}" 
               alt="${post.title}"
               loading="lazy"
               onload="this.classList.add('loaded')"
               onerror="handleImageError(this, 'panel')">` :
          `<div class="panel-image-placeholder"><i class="fas fa-image"></i></div>`
        }
      </div>
      <div class="panel-meta">
        <div class="panel-meta-item">
          <span class="panel-label">Status</span>
          <span class="post-status ${post.published ? 'published' : (post.status === 'pending' ? 'pending' : 'draft')}">
            <i class="fas fa-${post.published ? 'check-circle' : (post.status === 'pending' ? 'clock' : 'file-alt')}"></i>
            ${post.published ? 'Published' : (post.status === 'pending' ? 'Pending' : 'Draft')}
          </span>
        </div>
        <div class="panel-meta-item">
          <span class="panel-label">Category</span>
          <span class="category-badge ${post.category || ''}">${categoryLabels[post.category] || 'Uncategorized'}</span>
        </div>
        <div class="panel-meta-item">
          <span class="panel-label">Date</span>
          <span>${formatDate(post.publish_date)}</span>
        </div>
        <div class="panel-meta-item">
          <span class="panel-label">Featured</span>
          <span>${post.featured ? 'Yes' : 'No'}</span>
        </div>
        <div class="panel-meta-item">
          <span class="panel-label">Last Edited</span>
          <span>${formatDateTime(post.last_edited)}</span>
        </div>
      </div>
      <div class="panel-excerpt">
        <span class="panel-label">Excerpt</span>
        <p>${post.excerpt || 'No excerpt'}</p>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" onclick="editPost('${post.id}'); closeSlidePanel();">
          <i class="fas fa-edit"></i>
          Edit
        </button>
        <button class="btn btn-secondary" onclick="viewPost('${post.id}')">
          <i class="fas fa-eye"></i>
          View
        </button>
        <button class="btn btn-danger" onclick="deletePost('${post.id}'); closeSlidePanel();">
          <i class="fas fa-trash"></i>
          Delete
        </button>
      </div>
    </div>
  `;
  
  panel.classList.add('active');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSlidePanel() {
  const panel = document.getElementById('slide-panel');
  const overlay = document.getElementById('slide-panel-overlay');
  
  panel.classList.remove('active', 'fullscreen');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  
  const icon = document.getElementById('panel-fullscreen-icon');
  if (icon) {
    icon.classList.remove('fa-compress');
    icon.classList.add('fa-expand');
  }
}

function togglePanelFullscreen() {
  const panel = document.getElementById('slide-panel');
  const icon = document.getElementById('panel-fullscreen-icon');
  
  panel.classList.toggle('fullscreen');
  
  if (panel.classList.contains('fullscreen')) {
    icon.classList.remove('fa-expand');
    icon.classList.add('fa-compress');
  } else {
    icon.classList.remove('fa-compress');
    icon.classList.add('fa-expand');
  }
}

// ============================================
// EDITOR FUNCTIONS - DO NOT MODIFY CORE LOGIC
// ============================================

function resetEditor() {
  currentEditId = null;
  document.getElementById('editor-mode-label').textContent = 'New Post';
  document.getElementById('post-title').value = '';
  document.getElementById('post-excerpt').value = '';
  document.getElementById('post-content').innerHTML = '';
  document.getElementById('post-category').value = '';
  document.getElementById('post-read-time').value = '5';
  document.getElementById('post-featured').checked = false;
  document.getElementById('post-author').value = 'DraftaCV Team';
  document.getElementById('post-meta').value = '';
  document.getElementById('post-tags').value = '';
  document.getElementById('featured-image-url').value = '';
  
  const preview = document.getElementById('featured-image-preview');
  preview.innerHTML = `
    <i class="fas fa-cloud-upload-alt"></i>
    <span>Click to add image</span>
  `;
  
  document.getElementById('delete-card').style.display = 'none';
  document.getElementById('auto-draft-indicator').style.display = 'none';
  setDefaultDate();
  updateMetaCharCount();
  
  // Reset category selector
  resetCategorySelector();
  
  // Reset auto read time
  const autoReadTimeCheckbox = document.getElementById('auto-read-time');
  if (autoReadTimeCheckbox) {
    autoReadTimeCheckbox.checked = true;
    toggleAutoReadTime();
  }
  updateWordCount();
}

function setDefaultDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('post-date').value = now.toISOString().slice(0, 16);
}

async function editPost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) {
    showToast('Post not found', 'error');
    return;
  }
  
  currentEditId = id;
  switchView('editor');
  
  document.getElementById('editor-mode-label').textContent = 'Edit Post';
  document.getElementById('post-title').value = post.title || '';
  document.getElementById('post-excerpt').value = post.excerpt || '';
  document.getElementById('post-content').innerHTML = post.content || '';
  document.getElementById('post-category').value = post.category || '';
  document.getElementById('post-read-time').value = parseInt(post.read_time) || 5;
  document.getElementById('post-featured').checked = post.featured || false;
  document.getElementById('post-author').value = post.author || 'DraftaCV Team';
  document.getElementById('post-meta').value = post.meta_description || '';
  document.getElementById('post-tags').value = (post.tags || []).join(', ');
  document.getElementById('featured-image-url').value = post.featured_image || '';
  
  if (post.publish_date) {
    let date;
    if (post.publish_date.seconds) {
      date = new Date(post.publish_date.seconds * 1000);
    } else {
      date = new Date(post.publish_date);
    }
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    document.getElementById('post-date').value = date.toISOString().slice(0, 16);
  }
  
  const preview = document.getElementById('featured-image-preview');
  if (post.featured_image) {
    preview.innerHTML = `<img src="${post.featured_image}" alt="Featured image">`;
  } else {
    preview.innerHTML = `
      <i class="fas fa-cloud-upload-alt"></i>
      <span>Click to add image</span>
    `;
  }
  
  document.getElementById('delete-card').style.display = 'block';
  updateMetaCharCount();
  
  // Update category selector display
  updateCategorySelectorDisplay(post.category || '');
  
  // Update word count and potentially auto read time
  updateWordCount();
}

function getPostData() {
  const title = document.getElementById('post-title').value.trim();
  const excerpt = document.getElementById('post-excerpt').value.trim();
  const content = document.getElementById('post-content').innerHTML;
  const category = document.getElementById('post-category').value;
  const readTime = document.getElementById('post-read-time').value;
  const featured = document.getElementById('post-featured').checked;
  const publishDate = document.getElementById('post-date').value;
  const author = document.getElementById('post-author').value.trim();
  const metaDescription = document.getElementById('post-meta').value.trim();
  const tagsStr = document.getElementById('post-tags').value.trim();
  const featuredImage = document.getElementById('featured-image-url').value.trim();
  
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
  
  return {
    title,
    slug,
    excerpt,
    content,
    category,
    category_label: categoryLabels[category] || '',
    featured_image: featuredImage,
    read_time: `${readTime} min read`,
    featured,
    publish_date: publishDate ? new Date(publishDate).getTime() : Date.now(),
    author,
    meta_description: metaDescription,
    tags
  };
}

function validatePost(data) {
  if (!data.title) {
    showToast('Please enter a post title', 'warning');
    return false;
  }
  if (!data.category) {
    showToast('Please select a category', 'warning');
    return false;
  }
  return true;
}

async function saveDraft() {
  const data = getPostData();
  if (!data.title) {
    showToast('Please enter a post title', 'warning');
    return;
  }
  
  data.published = false;
  data.status = 'draft';
  await savePost(data);
}

async function publishPost() {
  const data = getPostData();
  if (!validatePost(data)) return;
  
  data.published = true;
  data.status = 'published';
  await savePost(data);
}

// ============================================
// SAVE/DELETE POSTS - DO NOT MODIFY CORE LOGIC
// ============================================

async function savePost(data) {
  try {
    console.log('💾 Saving post...', data);
    showToast('Saving...', 'info');
    let savedPost;
    
    const enrichedData = {
      ...data,
      last_edited: Date.now(),
      edited_by: 'Admin'
    };
    
    if (currentEditId) {
      savedPost = await FirestoreAPI.update(currentEditId, enrichedData);
      console.log('✅ Post updated');
      showToast('Post updated successfully!', 'success');
    } else {
      enrichedData.created_at = Date.now();
      savedPost = await FirestoreAPI.create(enrichedData);
      console.log('✅ Post created');
      showToast('Post created successfully!', 'success');
    }
    
    await loadPosts();
    switchView('posts');
    
  } catch (error) {
    console.error('Error saving post:', error);
    showToast('Failed to save post. Please try again.', 'error');
  }
}

async function deletePost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  
  currentEditId = id;
  openModal('delete-modal');
}

function deleteCurrentPost() {
  if (!currentEditId) return;
  openModal('delete-modal');
}

async function confirmDeletePost() {
  if (!currentEditId) return;
  
  try {
    const post = posts.find(p => p.id === currentEditId);
    console.log('🗑️ Deleting post:', currentEditId);
    await FirestoreAPI.delete(currentEditId);
    console.log('✅ Post deleted');
    
    showToast('Post deleted successfully', 'success');
    closeModal('delete-modal');
    
    currentEditId = null;
    await loadPosts();
    switchView('posts');
    
  } catch (error) {
    console.error('Error deleting post:', error);
    showToast('Failed to delete post', 'error');
  }
}

function viewPost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  
  window.open(`../blog-post.html?id=${id}`, '_blank');
}

// ============================================
// RICH TEXT EDITOR - ENHANCED WITH SHORTCUTS
// ============================================

function execCommand(command, value = null) {
  document.getElementById('post-content').focus();
  
  if (command === 'formatBlock') {
    document.execCommand('formatBlock', false, `<${value}>`);
  } else {
    document.execCommand(command, false, value);
  }
  
  // Update toolbar active states
  updateToolbarActiveStates();
}

function clearFormatting() {
  document.getElementById('post-content').focus();
  document.execCommand('removeFormat', false, null);
  updateToolbarActiveStates();
  showToast('Formatting cleared', 'info');
}

function initToolbarActiveStates() {
  const editor = document.getElementById('post-content');
  
  editor.addEventListener('keyup', updateToolbarActiveStates);
  editor.addEventListener('mouseup', updateToolbarActiveStates);
  editor.addEventListener('input', function() {
    updateToolbarActiveStates();
    triggerAutoDraft();
  });
  
  // Also monitor title and excerpt for auto-draft
  document.getElementById('post-title').addEventListener('input', triggerAutoDraft);
  document.getElementById('post-excerpt').addEventListener('input', triggerAutoDraft);
}

function updateToolbarActiveStates() {
  const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'];
  
  commands.forEach(cmd => {
    const btn = document.querySelector(`[data-command="${cmd}"]`);
    if (btn) {
      if (document.queryCommandState(cmd)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
}

// ============================================
// EDITOR KEYBOARD SHORTCUTS
// ============================================

function initEditorKeyboardShortcuts() {
  const editor = document.getElementById('post-content');
  
  editor.addEventListener('keydown', function(e) {
    // Only handle shortcuts when editor is focused
    if (document.activeElement !== editor) return;
    
    const ctrlKey = e.ctrlKey || e.metaKey;
    
    // Prevent browser defaults for our shortcuts
    if (ctrlKey) {
      // Alignment shortcuts
      if (e.shiftKey) {
        if (e.key === 'L' || e.key === 'l') {
          e.preventDefault();
          execCommand('justifyLeft');
          return;
        }
        if (e.key === 'E' || e.key === 'e') {
          e.preventDefault();
          execCommand('justifyCenter');
          return;
        }
        if (e.key === 'R' || e.key === 'r') {
          e.preventDefault();
          execCommand('justifyRight');
          return;
        }
        if (e.key === 'U' || e.key === 'u') {
          e.preventDefault();
          execCommand('insertUnorderedList');
          return;
        }
        if (e.key === 'O' || e.key === 'o') {
          e.preventDefault();
          execCommand('insertOrderedList');
          return;
        }
        if (e.key === 'I' || e.key === 'i') {
          e.preventDefault();
          insertImage();
          return;
        }
        if (e.key === 'Q' || e.key === 'q') {
          e.preventDefault();
          execCommand('formatBlock', 'blockquote');
          return;
        }
        if (e.key === 'C' || e.key === 'c') {
          e.preventDefault();
          insertCodeBlock();
          return;
        }
      }
      
      // Clear formatting
      if (e.key === '\\') {
        e.preventDefault();
        clearFormatting();
        return;
      }
      
      // Heading shortcuts
      if (e.key === '2') {
        e.preventDefault();
        execCommand('formatBlock', 'h2');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        execCommand('formatBlock', 'h3');
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        execCommand('formatBlock', 'h4');
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        execCommand('formatBlock', 'p');
        return;
      }
    }
    
    // Tab for indent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        execCommand('outdent');
      } else {
        execCommand('indent');
      }
    }
  });
}

function insertLink() {
  saveSelection();
  document.getElementById('modal-link-url').value = '';
  document.getElementById('modal-link-text').value = '';
  openModal('link-modal');
}

function confirmInsertLink() {
  const url = document.getElementById('modal-link-url').value.trim();
  const text = document.getElementById('modal-link-text').value.trim() || url;
  
  if (!url) {
    showToast('Please enter a URL', 'warning');
    return;
  }
  
  restoreSelection();
  document.execCommand('insertHTML', false, `<a href="${url}" target="_blank">${text}</a>`);
  closeModal('link-modal');
}

function insertImage() {
  saveSelection();
  document.getElementById('modal-image-url').value = '';
  document.getElementById('modal-image-alt').value = '';
  openModal('image-modal');
}

function confirmInsertImage() {
  const url = document.getElementById('modal-image-url').value.trim();
  const alt = document.getElementById('modal-image-alt').value.trim() || 'Image';
  
  if (!url) {
    showToast('Please enter an image URL', 'warning');
    return;
  }
  
  restoreSelection();
  document.execCommand('insertHTML', false, `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;">`);
  closeModal('image-modal');
}

// ============================================
// YOUTUBE EMBED FEATURE
// ============================================

function insertYouTube() {
  saveSelection();
  document.getElementById('modal-youtube-url').value = '';
  openModal('youtube-modal');
}

function confirmInsertYouTube() {
  const url = document.getElementById('modal-youtube-url').value.trim();
  
  if (!url) {
    showToast('Please enter a YouTube URL', 'warning');
    return;
  }
  
  // Extract video ID
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    showToast('Invalid YouTube URL', 'error');
    return;
  }
  
  restoreSelection();
  const embedHtml = `
    <div class="youtube-embed">
      <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
    </div>
  `;
  document.execCommand('insertHTML', false, embedHtml);
  closeModal('youtube-modal');
  showToast('YouTube video embedded!', 'success');
}

function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function insertCodeBlock() {
  document.getElementById('post-content').focus();
  document.execCommand('insertHTML', false, '<pre><code>// Your code here</code></pre>');
}

function setFeaturedImage() {
  const currentUrl = document.getElementById('featured-image-url').value;
  document.getElementById('modal-featured-url').value = currentUrl;
  
  const previewModal = document.getElementById('modal-featured-preview');
  if (currentUrl) {
    previewModal.innerHTML = `<img src="${currentUrl}" alt="Preview">`;
  } else {
    previewModal.innerHTML = '';
  }
  
  openModal('featured-image-modal');
}

function confirmFeaturedImage() {
  const url = document.getElementById('modal-featured-url').value.trim();
  document.getElementById('featured-image-url').value = url;
  
  const preview = document.getElementById('featured-image-preview');
  if (url) {
    preview.innerHTML = `<img src="${url}" alt="Featured image">`;
  } else {
    preview.innerHTML = `
      <i class="fas fa-cloud-upload-alt"></i>
      <span>Click to add image</span>
    `;
  }
  
  closeModal('featured-image-modal');
}

function setupFeaturedImagePreview() {
  const urlInput = document.getElementById('modal-featured-url');
  urlInput.addEventListener('input', debounce(function() {
    const url = this.value.trim();
    const preview = document.getElementById('modal-featured-preview');
    if (url) {
      preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span style=\\'color: var(--danger)\\'>Invalid image URL</span>'">`;
    } else {
      preview.innerHTML = '';
    }
  }, 500));
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    savedSelection = sel.getRangeAt(0);
  }
}

function restoreSelection() {
  const editor = document.getElementById('post-content');
  editor.focus();
  if (savedSelection) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelection);
  }
}

// ============================================
// AUTO-DRAFT FEATURE
// ============================================

function initAutoDraft() {
  // Auto-draft is triggered on content changes
}

function triggerAutoDraft() {
  if (autoDraftTimer) {
    clearTimeout(autoDraftTimer);
  }
  
  autoDraftTimer = setTimeout(async () => {
    const title = document.getElementById('post-title').value.trim();
    if (!title) return;
    
    // Show indicator
    const indicator = document.getElementById('auto-draft-indicator');
    indicator.style.display = 'flex';
    indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Saving...</span>';
    
    // Auto-save as draft
    try {
      const data = getPostData();
      data.published = currentEditId ? 
        (posts.find(p => p.id === currentEditId)?.published || false) : false;
      data.status = data.published ? 'published' : 'draft';
      
      const enrichedData = {
        ...data,
        last_edited: Date.now(),
        edited_by: 'Admin'
      };
      
      if (currentEditId) {
        await FirestoreAPI.update(currentEditId, enrichedData);
      } else {
        enrichedData.created_at = Date.now();
        const saved = await FirestoreAPI.create(enrichedData);
        currentEditId = saved.id;
      }
      
      indicator.innerHTML = '<i class="fas fa-cloud"></i><span>Auto-saved</span>';
      
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 2000);
      
    } catch (error) {
      indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Failed</span>';
      indicator.style.background = 'var(--danger-light)';
      indicator.style.color = 'var(--danger)';
    }
  }, 3000);
}

// ============================================
// INACTIVITY DETECTION & AUTO-LOGOUT
// ============================================

function initInactivityDetection() {
  // Reset timer on any user activity
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
  });
  
  // Start the timer
  resetInactivityTimer();
}

function resetInactivityTimer() {
  // Clear existing timers
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  
  // Close warning modal if open
  const modal = document.getElementById('inactivity-modal');
  if (modal && modal.classList.contains('active')) {
    modal.classList.remove('active');
  }
  
  // Set new inactivity timer
  inactivityTimer = setTimeout(showInactivityWarning, INACTIVITY_TIMEOUT);
}

function showInactivityWarning() {
  countdownSeconds = WARNING_TIME;
  
  // Open warning modal
  openModal('inactivity-modal');
  updateCountdown();
  
  // Start countdown
  countdownTimer = setInterval(() => {
    countdownSeconds--;
    updateCountdown();
    
    if (countdownSeconds <= 0) {
      clearInterval(countdownTimer);
      autoSaveAndLogout();
    }
  }, 1000);
}

function updateCountdown() {
  const timerElement = document.getElementById('countdown-timer');
  if (timerElement) {
    timerElement.textContent = countdownSeconds;
  }
}

async function autoSaveAndLogout() {
  // Save any unsaved work
  const title = document.getElementById('post-title')?.value.trim();
  if (title) {
    try {
      const data = getPostData();
      data.published = false;
      data.status = 'draft';
      
      const enrichedData = {
        ...data,
        last_edited: Date.now(),
        edited_by: 'Admin',
        auto_saved: true
      };
      
      if (currentEditId) {
        await FirestoreAPI.update(currentEditId, enrichedData);
      } else {
        enrichedData.created_at = Date.now();
        await FirestoreAPI.create(enrichedData);
      }
      
      showToast('Draft saved before logout', 'info');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }
  
  // Logout
  setTimeout(() => {
    logout();
  }, 500);
}

function logoutNow() {
  clearInterval(countdownTimer);
  closeModal('inactivity-modal');
  autoSaveAndLogout();
}

// ============================================
// META CHARACTER COUNT
// ============================================

function setupMetaCharCount() {
  const metaInput = document.getElementById('post-meta');
  metaInput.addEventListener('input', updateMetaCharCount);
}

function updateMetaCharCount() {
  const metaInput = document.getElementById('post-meta');
  const countSpan = document.getElementById('meta-char-count');
  countSpan.textContent = metaInput.value.length;
  
  if (metaInput.value.length > 160) {
    countSpan.style.color = 'var(--danger)';
  } else {
    countSpan.style.color = 'var(--text-tertiary)';
  }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================
// THEME SYSTEM - ENHANCED
// ============================================

function initTheme() {
  const savedTheme = localStorage.getItem('cms-theme') || 'dark';
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cms-theme', theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// ============================================
// SIDEBAR FUNCTIONS
// ============================================

function toggleSidebar() {
  const sidebar = document.getElementById('cms-sidebar');
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

function initCategoryMenu() {
  // Category menu starts collapsed
}

function toggleCategoryMenu() {
  const parent = document.querySelector('.nav-item-parent');
  const submenu = document.getElementById('category-submenu');
  
  parent.classList.toggle('expanded');
  submenu.classList.toggle('open');
}

// Mobile sidebar
function openMobileSidebar() {
  const sidebar = document.getElementById('cms-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.add('mobile-open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('cms-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================
// UPDATE ADMIN EMAIL
// ============================================

function updateAdminEmail() {
  // This will be called after auth check
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        const emailElem = document.getElementById('admin-email');
        if (emailElem) {
          emailElem.textContent = user.email || 'admin@draftacv.com';
        }
      }
    });
  }
}

// ============================================
// KEYBOARD SHORTCUTS - WINDOWS FOCUSED
// ============================================

function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    const modifier = e.ctrlKey;
    
    // Don't trigger global shortcuts if in editor
    const editor = document.getElementById('post-content');
    if (document.activeElement === editor) {
      // Only handle save/publish in editor
      if (modifier && e.key === 's') {
        e.preventDefault();
        saveDraft();
        return;
      }
      if (modifier && e.key === 'Enter') {
        e.preventDefault();
        publishPost();
        return;
      }
      return;
    }
    
    // Ctrl + S - Save Draft
    if (modifier && e.key === 's') {
      e.preventDefault();
      const editorView = document.getElementById('editor-view');
      if (editorView.classList.contains('active')) {
        saveDraft();
      }
    }
    
    // Ctrl + Enter - Publish
    if (modifier && e.key === 'Enter') {
      e.preventDefault();
      const editorView = document.getElementById('editor-view');
      if (editorView.classList.contains('active')) {
        publishPost();
      }
    }
    
    // Ctrl + N - New Post
    if (modifier && e.key === 'n') {
      e.preventDefault();
      switchView('editor');
      resetEditor();
    }
    
    // Ctrl + K - Insert Link
    if (modifier && e.key === 'k') {
      e.preventDefault();
      const editorView = document.getElementById('editor-view');
      if (editorView.classList.contains('active')) {
        insertLink();
      }
    }
    
    // Ctrl + / - Show Shortcuts
    if (modifier && e.key === '/') {
      e.preventDefault();
      toggleKeyboardShortcuts();
    }
    
    // Escape - Close modals/shortcuts/panels
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => {
        m.classList.remove('active');
        document.body.style.overflow = '';
      });
      hideKeyboardShortcuts();
      closeSlidePanel();
    }
  });
}

function showKeyboardShortcuts() {
  const panel = document.getElementById('shortcuts-panel');
  panel.classList.add('active');
}

function hideKeyboardShortcuts() {
  const panel = document.getElementById('shortcuts-panel');
  panel.classList.remove('active');
}

function toggleKeyboardShortcuts() {
  const panel = document.getElementById('shortcuts-panel');
  panel.classList.toggle('active');
}

// ============================================
// CONTENT CALENDAR
// ============================================

function initCalendar() {
  renderCalendar();
}

function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  // Update header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // Today
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  
  // Build calendar days
  const container = document.getElementById('calendar-days');
  let html = '';
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = isCurrentMonth && today.getDate() === day;
    const dayTasks = calendarTasks.filter(t => t.date === dateStr);
    const hasTasksClass = dayTasks.length > 0 ? 'has-tasks' : '';
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasTasksClass}" onclick="openCalendarDayModal('${dateStr}')">
        <span class="day-number">${day}</span>
        <div class="day-tasks">
          ${dayTasks.slice(0, 2).map(t => `
            <div class="day-task ${t.type}">${t.title}</div>
          `).join('')}
          ${dayTasks.length > 2 ? `<div class="day-task">+${dayTasks.length - 2} more</div>` : ''}
        </div>
      </div>
    `;
  }
  
  // Next month days
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
  for (let day = 1; day <= remaining; day++) {
    html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
  }
  
  container.innerHTML = html;
  
  // Render tasks list
  renderCalendarTasks();
}

function changeMonth(delta) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  renderCalendar();
}

function goToToday() {
  currentCalendarDate = new Date();
  renderCalendar();
}

function openCalendarDayModal(dateStr) {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'Add Task';
  document.getElementById('task-title').value = '';
  document.getElementById('task-date').value = dateStr;
  document.getElementById('task-type').value = 'content';
  document.getElementById('task-description').value = '';
  document.getElementById('delete-task-btn').style.display = 'none';
  openModal('calendar-task-modal');
}

function openCalendarTaskModal() {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'Add Task';
  document.getElementById('task-title').value = '';
  document.getElementById('task-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('task-type').value = 'content';
  document.getElementById('task-description').value = '';
  document.getElementById('delete-task-btn').style.display = 'none';
  openModal('calendar-task-modal');
}

function editCalendarTask(id) {
  const task = calendarTasks.find(t => t.id === id);
  if (!task) return;
  
  editingTaskId = id;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-date').value = task.date;
  document.getElementById('task-type').value = task.type;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('delete-task-btn').style.display = 'block';
  openModal('calendar-task-modal');
}

// ============================================
// CALENDAR TASKS - FIREBASE INTEGRATION
// ============================================

async function saveCalendarTask() {
  const title = document.getElementById('task-title').value.trim();
  const date = document.getElementById('task-date').value;
  const type = document.getElementById('task-type').value;
  const description = document.getElementById('task-description').value.trim();
  
  if (!title || !date) {
    showToast('Please enter a title and date', 'warning');
    return;
  }
  
  try {
    showToast('Saving task...', 'info');
    
    // Get current user email
    let createdBy = 'admin@draftacv.com';
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const user = firebase.auth().currentUser;
      if (user) {
        createdBy = user.email;
      }
    }
    
    const taskData = {
      title,
      date,
      type,
      description,
      updated_at: Date.now()
    };
    
    if (editingTaskId) {
      // Update existing task in Firebase
      await db.collection('calendar_tasks').doc(editingTaskId).update(taskData);
      
      // Update local array
      const index = calendarTasks.findIndex(t => t.id === editingTaskId);
      if (index !== -1) {
        calendarTasks[index] = { id: editingTaskId, ...taskData, created_by: calendarTasks[index].created_by };
      }
      
      showToast('Task updated', 'success');
    } else {
      // Add new task to Firebase
      taskData.created_at = Date.now();
      taskData.created_by = createdBy;
      
      const docRef = await db.collection('calendar_tasks').add(taskData);
      
      // Add to local array
      calendarTasks.push({ id: docRef.id, ...taskData });
      
      showToast('Task created', 'success');
    }
    
    // Also save to localStorage as backup
    saveCalendarTasksToLocalStorage();
    
    // Re-render calendar and tasks
    renderCalendar();
    renderCalendarTasks();
    
    closeModal('calendar-task-modal');
    
  } catch (error) {
    console.error('Error saving calendar task:', error);
    showToast('Failed to save task. Saving locally...', 'warning');
    
    // Fallback to local storage if Firebase fails
    if (editingTaskId) {
      const index = calendarTasks.findIndex(t => t.id === editingTaskId);
      if (index !== -1) {
        calendarTasks[index] = { id: editingTaskId, title, date, type, description };
      }
    } else {
      const newTask = {
        id: 'local_' + Date.now().toString(),
        title,
        date,
        type,
        description,
        created_at: Date.now()
      };
      calendarTasks.push(newTask);
    }
    
    saveCalendarTasksToLocalStorage();
    renderCalendar();
    renderCalendarTasks();
    closeModal('calendar-task-modal');
  }
}

async function deleteCalendarTask() {
  if (!editingTaskId) return;
  
  try {
    showToast('Deleting task...', 'info');
    
    // Delete from Firebase
    await db.collection('calendar_tasks').doc(editingTaskId).delete();
    
    // Remove from local array
    calendarTasks = calendarTasks.filter(t => t.id !== editingTaskId);
    
    // Update localStorage backup
    saveCalendarTasksToLocalStorage();
    
    // Re-render
    renderCalendar();
    renderCalendarTasks();
    
    closeModal('calendar-task-modal');
    showToast('Task deleted', 'success');
    
  } catch (error) {
    console.error('Error deleting calendar task:', error);
    showToast('Failed to delete from server. Removing locally...', 'warning');
    
    // Fallback to local removal
    calendarTasks = calendarTasks.filter(t => t.id !== editingTaskId);
    saveCalendarTasksToLocalStorage();
    renderCalendar();
    renderCalendarTasks();
    closeModal('calendar-task-modal');
  }
}

function renderCalendarTasks() {
  const container = document.getElementById('calendar-tasks-list');
  if (!container) return;
  
  // Get upcoming tasks (next 14 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
  
  const upcoming = calendarTasks
    .filter(t => {
      const taskDate = new Date(t.date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate >= today && taskDate <= twoWeeksLater;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (upcoming.length === 0) {
    container.innerHTML = `
      <div class="empty-state small">
        <i class="fas fa-tasks"></i>
        <p>No upcoming tasks</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = upcoming.map(task => `
    <div class="task-item" onclick="editCalendarTask('${task.id}')">
      <div class="task-type-dot ${task.type}"></div>
      <div class="task-info">
        <div class="task-title">${task.title}</div>
        <div class="task-date">${formatDate(task.date)}</div>
      </div>
    </div>
  `).join('');
}

async function loadCalendarTasks() {
  try {
    // Show loading state
    const container = document.getElementById('calendar-tasks-list');
    if (container) {
      container.innerHTML = `
        <div class="empty-state small">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading tasks...</p>
        </div>
      `;
    }
    
    // Try to load from Firebase first
    if (typeof db !== 'undefined') {
      const snapshot = await db.collection('calendar_tasks')
        .orderBy('date', 'asc')
        .get();
      
      calendarTasks = [];
      snapshot.forEach(doc => {
        calendarTasks.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('✅ Loaded', calendarTasks.length, 'calendar tasks from Firebase');
      
      // Save to localStorage as backup
      saveCalendarTasksToLocalStorage();
    } else {
      // Fallback to localStorage
      loadCalendarTasksFromLocalStorage();
    }
    
    // Render after loading
    renderCalendarTasks();
    
  } catch (error) {
    console.error('Error loading calendar tasks from Firebase:', error);
    
    // Fallback to localStorage
    loadCalendarTasksFromLocalStorage();
    renderCalendarTasks();
  }
}

function loadCalendarTasksFromLocalStorage() {
  const saved = localStorage.getItem('cms-calendar-tasks');
  if (saved) {
    try {
      calendarTasks = JSON.parse(saved);
      console.log('📦 Loaded', calendarTasks.length, 'calendar tasks from localStorage');
    } catch (e) {
      console.error('Error parsing localStorage tasks:', e);
      calendarTasks = [];
    }
  }
}

function saveCalendarTasksToLocalStorage() {
  try {
    localStorage.setItem('cms-calendar-tasks', JSON.stringify(calendarTasks));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

// Legacy function for backward compatibility
function saveCalendarTasks() {
  saveCalendarTasksToLocalStorage();
}

// ============================================
// MOBILE RESPONSIVE
// ============================================

function initMobileResponsive() {
  handleResponsive();
  window.addEventListener('resize', debounce(handleResponsive, 250));
}

function handleResponsive() {
  const isMobile = window.innerWidth <= 768;
  const mobileNav = document.getElementById('mobile-bottom-nav');
  const mobileGrid = document.getElementById('mobile-posts-grid');
  const desktopTable = document.querySelector('.posts-table');
  
  if (mobileNav) {
    mobileNav.style.display = isMobile ? 'flex' : 'none';
  }
  
  if (mobileGrid && desktopTable) {
    mobileGrid.style.display = isMobile ? 'grid' : 'none';
    desktopTable.style.display = isMobile ? 'none' : 'table';
  }
}

// ============================================
// ANIMATIONS
// ============================================

function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeIn 0.3s ease forwards';
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.stat-card-compact, .widget').forEach(el => {
    observer.observe(el);
  });
}

function animateValue(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const current = parseInt(el.textContent) || 0;
  const diff = value - current;
  const duration = 500;
  const steps = 20;
  const increment = diff / steps;
  let step = 0;
  
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(current + increment * step);
    if (step >= steps) {
      clearInterval(timer);
      el.textContent = value;
    }
  }, duration / steps);
}

// ============================================
// LOADING STATES
// ============================================

function showLoadingState() {
  const recentPosts = document.getElementById('recent-posts');
  if (recentPosts && posts.length === 0) {
    recentPosts.innerHTML = Array(3).fill(`
      <div class="recent-post-item">
        <div class="skeleton" style="width: 48px; height: 48px; border-radius: var(--radius-md);"></div>
        <div class="recent-post-info" style="flex: 1;">
          <div class="skeleton" style="height: 16px; width: 80%; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 12px; width: 50%;"></div>
        </div>
      </div>
    `).join('');
  }
}

function hideLoadingState() {
  // Loading state is replaced by actual content
}

// ============================================
// NAV COUNTS
// ============================================

function updateNavCounts() {
  const navCount = document.getElementById('nav-posts-count');
  if (navCount) {
    navCount.textContent = posts.length;
  }
}

// ============================================
// IMAGE ERROR HANDLING
// ============================================

function handleImageError(img, type) {
  // Replace broken image with placeholder
  const placeholder = document.createElement('div');
  
  switch (type) {
    case 'recent':
      placeholder.className = 'recent-post-image-placeholder';
      break;
    case 'thumb':
      placeholder.className = 'post-thumb-placeholder';
      break;
    case 'mobile':
      placeholder.className = 'mobile-post-image-placeholder';
      break;
    case 'panel':
      placeholder.className = 'panel-image-placeholder';
      break;
    default:
      placeholder.className = 'image-placeholder';
  }
  
  placeholder.innerHTML = '<i class="fas fa-image"></i>';
  
  // Replace the image with placeholder
  if (img.parentNode) {
    img.parentNode.replaceChild(placeholder, img);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(timestamp) {
  if (!timestamp) return 'No date';
  
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTimestamp(value) {
  if (!value) return 0;
  if (value.seconds) return value.seconds * 1000;
  return new Date(value).getTime();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Panel CSS styles (added inline since they're component-specific)
const panelStyles = document.createElement('style');
panelStyles.textContent = `
  .panel-post-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .panel-image img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: var(--radius-lg);
  }
  
  .panel-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }
  
  .panel-meta-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .panel-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }
  
  .panel-excerpt {
    padding: var(--space-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
  }
  
  .panel-excerpt p {
    margin-top: var(--space-sm);
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
  
  .panel-actions {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }
  
  .panel-actions .btn {
    flex: 1;
    min-width: 100px;
  }
  
  .skeleton {
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
  }
  
  @keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
document.head.appendChild(panelStyles);

// ============================================
// CATEGORY SELECTOR - EXPANDABLE MENU
// ============================================

function toggleCategorySelector() {
  const selector = document.getElementById('category-selector');
  selector.classList.toggle('open');
}

function selectCategory(value) {
  const hiddenInput = document.getElementById('post-category');
  hiddenInput.value = value;
  
  updateCategorySelectorDisplay(value);
  
  // Close dropdown
  const selector = document.getElementById('category-selector');
  selector.classList.remove('open');
  
  // Trigger auto-draft if needed
  triggerAutoDraft();
}

function updateCategorySelectorDisplay(value) {
  const valueDisplay = document.getElementById('category-selector-value');
  const options = document.querySelectorAll('.category-option');
  
  // Remove selected class from all options
  options.forEach(opt => opt.classList.remove('selected'));
  
  if (value && categoryLabels[value]) {
    // Show selected category with dot
    const dotColor = value;
    valueDisplay.innerHTML = `<span class="category-dot ${dotColor}"></span>${categoryLabels[value]}`;
    
    // Mark selected option
    const selectedOption = document.querySelector(`.category-option[data-value="${value}"]`);
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
  } else {
    valueDisplay.innerHTML = 'Select category';
  }
}

function resetCategorySelector() {
  const selector = document.getElementById('category-selector');
  if (selector) {
    selector.classList.remove('open');
  }
  updateCategorySelectorDisplay('');
}

// Close category selector when clicking outside
document.addEventListener('click', function(e) {
  const selector = document.getElementById('category-selector');
  if (selector && !selector.contains(e.target)) {
    selector.classList.remove('open');
  }
});

// ============================================
// AUTO READ TIME CALCULATION - ENHANCED
// ============================================

// Debounced word count update
let wordCountDebounceTimer = null;

function toggleAutoReadTime() {
  const autoCheckbox = document.getElementById('auto-read-time');
  const readTimeInput = document.getElementById('post-read-time');
  const readTimeInputContainer = readTimeInput?.parentElement;
  
  if (autoCheckbox && readTimeInput) {
    if (autoCheckbox.checked) {
      // Enable auto-calculation
      readTimeInputContainer?.classList.add('disabled');
      readTimeInput.readOnly = true;
      // Immediately calculate
      updateWordCountImmediate();
    } else {
      // Enable manual input
      readTimeInputContainer?.classList.remove('disabled');
      readTimeInput.readOnly = false;
    }
  }
}

function calculateReadTime(wordCount) {
  // Average reading speed: 200-250 words per minute
  // Using 200 for a more conservative estimate
  const wordsPerMinute = 200;
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, readTime); // Minimum 1 minute
}

function getWordCount(htmlContent) {
  if (!htmlContent) return 0;
  
  // Strip HTML tags and get text content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Count words (split by whitespace and filter empty strings)
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

// Immediate update (non-debounced)
function updateWordCountImmediate() {
  const content = document.getElementById('post-content');
  const excerpt = document.getElementById('post-excerpt');
  const wordCountDisplay = document.getElementById('word-count-display');
  const readTimeInput = document.getElementById('post-read-time');
  const autoCheckbox = document.getElementById('auto-read-time');
  
  if (!content || !wordCountDisplay) return;
  
  // Calculate total word count (content + excerpt)
  const contentWords = getWordCount(content.innerHTML);
  const excerptWords = excerpt ? getWordCount(excerpt.value) : 0;
  const totalWords = contentWords + excerptWords;
  
  // Update display
  wordCountDisplay.textContent = `${totalWords} words`;
  
  // Auto-update read time if enabled
  if (autoCheckbox && autoCheckbox.checked && readTimeInput) {
    const calculatedReadTime = calculateReadTime(totalWords);
    readTimeInput.value = calculatedReadTime;
  }
}

// Debounced update for performance
function updateWordCount() {
  if (wordCountDebounceTimer) {
    clearTimeout(wordCountDebounceTimer);
  }
  
  wordCountDebounceTimer = setTimeout(() => {
    updateWordCountImmediate();
  }, 300);
}

// Initialize read time tracking
function initReadTimeTracking() {
  const content = document.getElementById('post-content');
  const excerpt = document.getElementById('post-excerpt');
  const title = document.getElementById('post-title');
  
  // Content editor - use input event with debounce
  if (content) {
    // Remove existing listeners to avoid duplicates
    content.removeEventListener('input', updateWordCount);
    content.removeEventListener('keyup', updateWordCount);
    content.removeEventListener('paste', updateWordCount);
    
    // Add fresh listeners
    content.addEventListener('input', updateWordCount);
    content.addEventListener('keyup', updateWordCount);
    content.addEventListener('paste', function() {
      // Delay paste handling to let content update
      setTimeout(updateWordCount, 100);
    });
  }
  
  // Excerpt textarea
  if (excerpt) {
    excerpt.removeEventListener('input', updateWordCount);
    excerpt.addEventListener('input', updateWordCount);
  }
  
  // Also listen for title changes (for completeness)
  if (title) {
    title.removeEventListener('input', updateWordCount);
    title.addEventListener('input', updateWordCount);
  }
  
  // Initialize toggle state
  toggleAutoReadTime();
  
  // Initial calculation
  updateWordCountImmediate();
}

// ============================================
// MOBILE INACTIVITY DETECTION ENHANCEMENT
// ============================================

function initMobileInactivityDetection() {
  // Add touch events for mobile inactivity detection
  const touchEvents = ['touchstart', 'touchmove', 'touchend'];
  
  touchEvents.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  });
  
  // Also detect visibility change (when user switches tabs or apps)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      resetInactivityTimer();
    }
  });
}

// ============================================

/* ============================================
        MADE BY MD TOUHIDUL ISLAM KANON
   ============================================ */