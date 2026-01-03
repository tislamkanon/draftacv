// Blog Post Page JavaScript
// Handles individual blog post display with Firebase

// Initialize Firebase
let db;
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(window.firebaseConfig);
  db = firebase.firestore();
}

// Global state
let currentPost = null;
let allPosts = [];

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  // Get post ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  
  if (!postId) {
    showError();
    return;
  }
  
  // Load the post
  await loadPost(postId);
  
  // Setup mobile menu
  setupMobileMenu();
});

// Load single post from Firestore
async function loadPost(postId) {
  try {
    console.log('🔍 Loading post:', postId);
    
    const docRef = db.collection('blog_posts').doc(postId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error('Post not found');
    }
    
    currentPost = {
      id: doc.id,
      ...doc.data()
    };
    
    console.log('📄 Post loaded:', currentPost);
    
    // Check if post is published
    if (!currentPost.published) {
      throw new Error('Post not published');
    }
    
    // Display the post
    displayPost(currentPost);
    
    // Load related posts
    await loadRelatedPosts(currentPost.category, postId);
    
  } catch (error) {
    console.error('❌ Error loading post:', error);
    showError();
  }
}
/*Made by MD Touhidul Islam Kanon*/ 

// Display post content
function displayPost(post) {
  // Hide loading, show content
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('post-content').style.display = 'block';
  
  // Update page title and meta
  document.getElementById('page-title').textContent = `${post.title} - DraftaCV Blog`;
  document.getElementById('meta-description').content = post.meta_description || post.excerpt || '';
  
  // Update breadcrumb
  document.getElementById('breadcrumb-title').textContent = truncateText(post.title, 30);
  
  // Update post header
  document.getElementById('post-category').textContent = post.category_label || getCategoryLabel(post.category);
  document.getElementById('post-title').textContent = post.title;
  document.getElementById('post-author').textContent = post.author || 'DraftaCV Team';
  document.getElementById('post-date').textContent = formatDate(post.publish_date);
  document.getElementById('post-read-time').textContent = post.read_time || '5 min read';
  
  // Update featured image
  const imageEl = document.getElementById('post-image');
  imageEl.src = post.featured_image || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80';
  imageEl.alt = post.title;
  imageEl.onerror = function() {
    this.src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80';
  };
  
  // Update post body
  document.getElementById('post-body').innerHTML = post.content || '<p>No content available.</p>';
  
  // Update tags
  const tagsContainer = document.getElementById('post-tags');
  if (post.tags && post.tags.length > 0) {
    tagsContainer.innerHTML = post.tags.map(tag => 
      `<span class="post-tag">${tag}</span>`
    ).join('');
  } else {
    tagsContainer.style.display = 'none';
  }
}

// Load related posts from Firestore
async function loadRelatedPosts(category, currentId) {
  try {
    console.log('🔍 Loading related posts...');
    
    const postsSnapshot = await db.collection('blog_posts')
      .where('published', '==', true)
      .orderBy('publish_date', 'desc')
      .limit(20)
      .get();
    
    allPosts = [];
    postsSnapshot.forEach((doc) => {
      allPosts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📦 All posts loaded:', allPosts.length);
    
    // Find related posts (same category, excluding current)
    let relatedPosts = allPosts.filter(p => 
      p.category === category && p.id !== currentId
    ).slice(0, 3);
    
    // If not enough related posts, fill with recent posts
    if (relatedPosts.length < 3) {
      const additionalPosts = allPosts.filter(p => 
        p.id !== currentId && !relatedPosts.find(rp => rp.id === p.id)
      ).slice(0, 3 - relatedPosts.length);
      
      relatedPosts = [...relatedPosts, ...additionalPosts];
    }
    
    console.log('🎯 Related posts:', relatedPosts.length);
    
    // Display related posts if we have any
    if (relatedPosts.length > 0) {
      displayRelatedPosts(relatedPosts);
    }
    
  } catch (error) {
    console.error('❌ Error loading related posts:', error);
  }
}

// Display related posts
function displayRelatedPosts(posts) {
  const container = document.getElementById('related-posts');
  const section = document.getElementById('related-section');
  
  container.innerHTML = posts.map(post => `
    <a href="blog-post.html?id=${post.id}" class="related-post-card">
      <div class="related-post-image">
        <img src="${post.featured_image || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80'}" 
             alt="${post.title}" 
             loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80'">
      </div>
      <div class="related-post-content">
        <span class="related-post-category">${post.category_label || getCategoryLabel(post.category)}</span>
        <h3 class="related-post-title">${post.title}</h3>
        <span class="related-post-date">${formatDate(post.publish_date)}</span>
      </div>
    </a>
  `).join('');
  
  section.style.display = 'block';
}

// Show error state
function showError() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'flex';
}

// Get category label from slug
function getCategoryLabel(category) {
  const labels = {
    'resume-tips': 'Resume Tips',
    'career-advice': 'Career Advice',
    'interview-prep': 'Interview Prep',
    'job-search': 'Job Search'
  };
  return labels[category] || category || 'Uncategorized';
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'No date';
  
  // Handle Firestore timestamp
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Share functions
function shareTwitter() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(currentPost?.title || 'Check out this article');
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=550,height=420');
}

function shareLinkedIn() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=550,height=420');
}

function shareFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=550,height=420');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    // Show copied feedback
    const btn = document.querySelector('.share-btn.copy');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20 6L9 17l-5-5"/></svg>`;
    btn.style.background = '#10b981';
    btn.style.color = 'white';
    btn.style.borderColor = '#10b981';
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy link. Please copy from the address bar.');
  });
}

// Setup mobile menu
function setupMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });
  }
}