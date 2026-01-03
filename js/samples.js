// Samples Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize page
  initCategoryToggle();
  initLightbox();
  initMobileMenu();
  initScrollAnimations();
});

// Category Toggle Functionality
function initCategoryToggle() {
  const atsBtn = document.getElementById('atsBtn');
  const nonAtsBtn = document.getElementById('nonAtsBtn');
  const toggleIndicator = document.getElementById('toggleIndicator');
  const atsGrid = document.getElementById('atsGrid');
  const nonAtsGrid = document.getElementById('nonAtsGrid');
  const bannerIcon = document.getElementById('bannerIcon');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerDescription = document.getElementById('bannerDescription');

  const atsContent = {
    title: 'ATS Compatible Resumes',
    description: 'Optimized to pass Applicant Tracking Systems. Clean, structured layouts that recruiters and software can easily parse.',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>`
  };

  const nonAtsContent = {
    title: 'Non-ATS Creative Resumes',
    description: 'Visually stunning designs that showcase your personality. Perfect for direct applications, portfolios, and creative industries.',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>`
  };

  function switchToATS() {
    // Update buttons
    atsBtn.classList.add('active');
    nonAtsBtn.classList.remove('active');
    
    // Update indicator
    toggleIndicator.classList.remove('creative');
    
    // Handle mobile vertical toggle
    if (window.innerWidth <= 768) {
      toggleIndicator.style.top = '6px';
      toggleIndicator.style.bottom = 'auto';
    } else {
      toggleIndicator.style.left = '6px';
    }
    
    // Update grids with animation
    nonAtsGrid.classList.remove('active');
    setTimeout(() => {
      atsGrid.classList.add('active');
      animateCards(atsGrid);
    }, 100);
    
    // Update banner
    updateBanner(atsContent, false);
  }

  function switchToNonATS() {
    // Update buttons
    nonAtsBtn.classList.add('active');
    atsBtn.classList.remove('active');
    
    // Update indicator
    toggleIndicator.classList.add('creative');
    
    // Handle mobile vertical toggle
    if (window.innerWidth <= 768) {
      toggleIndicator.style.top = 'auto';
      toggleIndicator.style.bottom = '6px';
    } else {
      toggleIndicator.style.left = 'calc(50% + 2px)';
    }
    
    // Update grids with animation
    atsGrid.classList.remove('active');
    setTimeout(() => {
      nonAtsGrid.classList.add('active');
      animateCards(nonAtsGrid);
    }, 100);
    
    // Update banner
    updateBanner(nonAtsContent, true);
  }

  function updateBanner(content, isCreative) {
    // Animate out
    bannerIcon.style.transform = 'scale(0.8)';
    bannerIcon.style.opacity = '0';
    bannerTitle.style.opacity = '0';
    bannerDescription.style.opacity = '0';
    
    setTimeout(() => {
      bannerIcon.innerHTML = content.icon;
      bannerTitle.textContent = content.title;
      bannerDescription.textContent = content.description;
      
      if (isCreative) {
        bannerIcon.classList.add('creative');
      } else {
        bannerIcon.classList.remove('creative');
      }
      
      // Animate in
      bannerIcon.style.transform = 'scale(1)';
      bannerIcon.style.opacity = '1';
      bannerTitle.style.opacity = '1';
      bannerDescription.style.opacity = '1';
    }, 200);
  }

  function animateCards(grid) {
    const cards = grid.querySelectorAll('.sample-card');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      setTimeout(() => {
        card.style.transition = 'all 0.5s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }

  // Event listeners
  atsBtn.addEventListener('click', switchToATS);
  nonAtsBtn.addEventListener('click', switchToNonATS);

  // Handle resize for toggle indicator
  window.addEventListener('resize', () => {
    if (atsBtn.classList.contains('active')) {
      if (window.innerWidth <= 768) {
        toggleIndicator.style.top = '6px';
        toggleIndicator.style.bottom = 'auto';
        toggleIndicator.style.left = '6px';
      } else {
        toggleIndicator.style.left = '6px';
      }
    } else {
      if (window.innerWidth <= 768) {
        toggleIndicator.style.top = 'auto';
        toggleIndicator.style.bottom = '6px';
        toggleIndicator.style.left = '6px';
      } else {
        toggleIndicator.style.left = 'calc(50% + 2px)';
      }
    }
  });

  // Initial animation
  animateCards(atsGrid);
}

// Lightbox Functionality
let currentImages = [];
let currentIndex = 0;

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  
  // Close on background click
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeLightbox();
    }
    if (e.key === 'ArrowLeft') {
      navigateLightbox(-1);
    }
    if (e.key === 'ArrowRight') {
      navigateLightbox(1);
    }
  });
}

function openLightbox(src, title) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  
  // Get all images from active grid
  const activeGrid = document.querySelector('.samples-grid.active');
  const images = activeGrid.querySelectorAll('.sample-image');
  currentImages = Array.from(images).map(img => ({
    src: img.src,
    title: img.closest('.sample-card').querySelector('h4').textContent
  }));
  
  // Find current index
  currentIndex = currentImages.findIndex(img => img.src.includes(src.split('/').pop()));
  if (currentIndex === -1) currentIndex = 0;
  
  // Set image
  lightboxImage.src = src;
  lightboxTitle.textContent = title;
  
  // Show lightbox
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  if (currentImages.length === 0) return;
  
  currentIndex = (currentIndex + direction + currentImages.length) % currentImages.length;
  
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  
  // Animate transition
  lightboxImage.style.opacity = '0';
  lightboxImage.style.transform = direction > 0 ? 'translateX(20px)' : 'translateX(-20px)';
  
  setTimeout(() => {
    lightboxImage.src = currentImages[currentIndex].src;
    lightboxTitle.textContent = currentImages[currentIndex].title;
    lightboxImage.style.transform = direction > 0 ? 'translateX(-20px)' : 'translateX(20px)';
    
    setTimeout(() => {
      lightboxImage.style.transition = 'all 0.3s ease';
      lightboxImage.style.opacity = '1';
      lightboxImage.style.transform = 'translateX(0)';
    }, 50);
  }, 200);
}

// Mobile Menu
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      mobileMenuBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });
    
    // Close menu when clicking on links
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileMenuBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
      });
    });
  }
}

// Scroll Animations
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe comparison cards
  document.querySelectorAll('.comparison-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'all 0.6s ease-out';
    observer.observe(card);
  });

  // Add animate-visible styles
  const style = document.createElement('style');
  style.textContent = `
    .animate-visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);
}

// Parallax effect for hero shapes
document.addEventListener('mousemove', function(e) {
  const shapes = document.querySelectorAll('.hero-shape');
  const mouseX = e.clientX / window.innerWidth;
  const mouseY = e.clientY / window.innerHeight;
  
  shapes.forEach((shape, index) => {
    const speed = (index + 1) * 10;
    const x = (mouseX - 0.5) * speed;
    const y = (mouseY - 0.5) * speed;
    shape.style.transform = `translate(${x}px, ${y}px)`;
  });
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
