// Coupon Management JavaScript - Premium Version 1.0
// Handles all coupon management functionality
/* ============================================
        MADE BY MD TOUHIDUL ISLAM KANON
   ============================================ */

// ============================================
// COUPON GLOBAL STATE
// ============================================

let coupons = [];
let couponUsage = [];
let currentEditCouponId = null;
let couponFilters = {
  status: 'all',
  package: 'all',
  country: 'all',
  search: ''
};
let couponSortField = 'createdDate';
let couponSortDirection = 'desc';
let selectedAnalyticsCoupon = 'all';

// Chart instances
let usageChart = null;
let packageChart = null;
let countryChart = null;

// Package prices for preview calculation
const packagePrices = {
  BD: {
    basic: 1999,
    professional: 2999,
    executive: 4999
  },
  ID: {
    basic: 199000,
    professional: 299000,
    executive: 499000
  }
};

// ============================================
// COUPON INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize coupon module after main CMS is ready
  setTimeout(() => {
    initCouponModule();
  }, 500);
});

function initCouponModule() {
  loadCoupons();
  loadCouponUsage();
  initCouponPreviewListeners();
  setDefaultCouponExpiry();
   // NEW: Recalculate statuses every minute to catch expiries
  setInterval(() => {
    recalculateCouponStatuses();
    renderCouponsTable();
    renderMobileCoupons();
    updateCouponStats();
  }, 60000); // Check every minute
}

// ============================================
// FIREBASE COUPON API
// ============================================

const CouponAPI = {
  async getAllCoupons() {
    if (!db) return { data: [] };
    const snapshot = await db.collection('coupons').orderBy('createdDate', 'desc').get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return { data };
  },
  
  async getCoupon(code) {
    if (!db) return null;
    const doc = await db.collection('coupons').doc(code).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },
  
  async createCoupon(code, data) {
    if (!db) throw new Error('Database not initialized');
    await db.collection('coupons').doc(code).set(data);
    return { id: code, ...data };
  },
  
  async updateCoupon(code, data) {
    if (!db) throw new Error('Database not initialized');
    await db.collection('coupons').doc(code).update(data);
    return { id: code, ...data };
  },
  
  async deleteCoupon(code) {
    if (!db) throw new Error('Database not initialized');
    await db.collection('coupons').doc(code).delete();
    return { success: true };
  },
  
  async getAllUsage() {
    if (!db) return { data: [] };
    const snapshot = await db.collection('coupon_usage').orderBy('usedAt', 'desc').get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return { data };
  },
  
  async getUsageForCoupon(couponCode) {
    if (!db) return { data: [] };
    const snapshot = await db.collection('coupon_usage')
      .where('couponCode', '==', couponCode)
      .orderBy('usedAt', 'desc')
      .get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return { data };
  }
};

// ============================================
// DATA LOADING
// ============================================

async function loadCoupons() {
  try {
    console.log('🎫 Loading coupons from Firestore...');
    
    // Set up real-time listener
    db.collection('coupons').orderBy('createdDate', 'desc')
      .onSnapshot((snapshot) => {
        coupons = [];
        snapshot.forEach(doc => {
          coupons.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('✅ Loaded', coupons.length, 'coupons (real-time)');
        
        recalculateCouponStatuses();
        syncCouponUsageCounts();
        
        updateCouponStats();
        renderCouponsTable();
        renderMobileCoupons();
        updateCouponNavCount();
        populateAnalyticsCouponDropdown();
      }, (error) => {
        console.error('Error loading coupons:', error);
        showToast('Failed to load coupons', 'error');
      });
    
  } catch (error) {
    console.error('Error setting up coupons listener:', error);
    showToast('Failed to load coupons', 'error');
  }
}

async function loadCouponUsage() {
  try {
    console.log('📊 Loading coupon usage from Firestore...');
    
    // Set up real-time listener
    db.collection('coupon_usage').orderBy('usedAt', 'desc')
      .onSnapshot((snapshot) => {
        couponUsage = [];
        snapshot.forEach(doc => {
          couponUsage.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('✅ Loaded', couponUsage.length, 'usage records (real-time)');
        
        updateCouponStats();
        renderRecentUsage();
        updateAnalyticsCharts();
        
        // Sync counts and re-render table
        syncCouponUsageCounts();
        renderCouponsTable();
        renderMobileCoupons();
      }, (error) => {
        console.error('Error loading coupon usage:', error);
      });
    
  } catch (error) {
    console.error('Error setting up usage listener:', error);
  }
}
// ============================================
// SYNC COUPON USAGE COUNTS WITH ACTUAL DATA
// ============================================

function syncCouponUsageCounts() {
  // Count actual usage for each coupon
  const usageCounts = {};
  
  couponUsage.forEach(usage => {
    const code = usage.couponCode;
    if (code) {
      usageCounts[code] = (usageCounts[code] || 0) + 1;
    }
  });
  
  // Update each coupon's currentUses with actual count
  coupons.forEach(coupon => {
    const actualCount = usageCounts[coupon.code] || 0;
    coupon.currentUses = actualCount;
  });
  
  console.log('✅ Synced usage counts for all coupons');
}

// ============================================
// COUPON STATS UPDATE
// ============================================

function updateCouponStats() {
  const now = new Date();
  
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => {
    const expiry = c.expiryDate?.toDate ? c.expiryDate.toDate() : new Date(c.expiryDate);
    return c.status === 'active' && expiry > now;
  }).length;
  const expiredCoupons = coupons.filter(c => {
    const expiry = c.expiryDate?.toDate ? c.expiryDate.toDate() : new Date(c.expiryDate);
    return expiry <= now;
  }).length;
  const totalUsage = couponUsage.length;
  
  animateValue('total-coupons', totalCoupons);
  animateValue('active-coupons', activeCoupons);
  animateValue('expired-coupons', expiredCoupons);
  animateValue('total-coupon-usage', totalUsage);
  
  // Update nav count
  const navCount = document.getElementById('nav-coupon-count');
  if (navCount) {
    navCount.textContent = totalCoupons;
  }
}

function updateCouponNavCount() {
  const navCount = document.getElementById('nav-coupon-count');
  if (navCount) {
    navCount.textContent = coupons.length;
  }
}

// ============================================
// COUPON MENU TOGGLE
// ============================================

function toggleCouponMenu() {
  const submenu = document.getElementById('coupon-submenu');
  const arrow = document.getElementById('coupon-arrow');
  const parent = arrow?.closest('.nav-item-parent');
  
  if (submenu && arrow) {
    submenu.classList.toggle('open');
    parent?.classList.toggle('expanded');
  }
}

// ============================================
// STATUS RECALCULATION (ADD THIS NEW FUNCTION)
// ============================================

// Force recalculate coupon statuses based on expiry
function recalculateCouponStatuses() {
  const now = new Date();
  
  coupons.forEach(coupon => {
    const expiry = coupon.expiryDate?.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate);
    coupon._isExpired = expiry <= now;
  });
}
// ============================================
// COUPON TABLE RENDERING (UPDATED)
// ============================================

function renderCouponsTable() {
  const tbody = document.getElementById('coupons-table-body');
  const emptyState = document.getElementById('coupons-empty');
  
  // Apply filters
  let filteredCoupons = filterCouponsData(coupons);
  
  // Apply sorting
  filteredCoupons = sortCouponsData(filteredCoupons);
  
  if (!tbody) return;
  
  if (filteredCoupons.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  
  tbody.innerHTML = filteredCoupons.map((coupon, index) => {
    const now = new Date();
    
    const expiry = coupon.expiryDate?.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate);
    
    const isExpired = expiry <= now;
    const statusClass = isExpired ? 'expired' : coupon.status;
    const statusText = isExpired ? 'Expired' : (coupon.status === 'active' ? 'Active' : 'Inactive');
    
    return `
      <tr style="animation: fadeIn 0.2s ease ${index * 30}ms both">
        <td>
          <div class="coupon-code-cell">
            <code class="coupon-code-badge">${coupon.code}</code>
          </div>
        </td>
        <td>
          <span class="coupon-type-badge ${coupon.type}">
            <i class="fas fa-${coupon.type === 'percentage' ? 'percent' : 'dollar-sign'}"></i>
            ${coupon.type === 'percentage' ? 'Percentage' : 'Fixed'}
          </span>
        </td>
        <td>
          <span class="coupon-discount-value">
            ${formatCouponDiscount(coupon)}
          </span>
        </td>
        <td>
          <div class="valid-for-badges">
            ${formatValidFor(coupon.validFor)}
          </div>
        </td>
        <td>
          <span class="usage-count ${coupon.maxUses && coupon.currentUses >= coupon.maxUses ? 'maxed' : ''}">
            ${parseInt(coupon.currentUses) || 0}${coupon.maxUses ? '/' + parseInt(coupon.maxUses) : '/∞'}
          </span>
        </td>
        <td>
          <span class="coupon-status ${statusClass}">
            <i class="fas fa-${isExpired ? 'times-circle' : (coupon.status === 'active' ? 'check-circle' : 'pause-circle')}"></i>
            ${statusText}
          </span>
        </td>
        <td>
          <span class="coupon-created">
          ${formatCouponDate(coupon.createdDate)}
          </span>
        </td>
        <td>
          <span class="coupon-expiry ${isExpired ? 'expired' : ''}">
            ${formatCouponDate(coupon.expiryDate)}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn" onclick="editCoupon('${coupon.code}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn" onclick="viewCouponAnalytics('${coupon.code}')" title="Analytics">
              <i class="fas fa-chart-bar"></i>
            </button>
            <button class="action-btn delete" onclick="deleteCoupon('${coupon.code}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderMobileCoupons() {
  const container = document.getElementById('mobile-coupons-grid');
  if (!container) return;
  
  let filteredCoupons = filterCouponsData(coupons);
  filteredCoupons = sortCouponsData(filteredCoupons);
  
  if (filteredCoupons.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = filteredCoupons.map((coupon, index) => {
    const now = new Date();
    
    const expiry = coupon.expiryDate?.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate);
    
    const isExpired = expiry <= now;
    const statusClass = isExpired ? 'expired' : coupon.status;
    const statusText = isExpired ? 'Expired' : (coupon.status === 'active' ? 'Active' : 'Inactive');
    
    return `
      <div class="mobile-coupon-card" style="animation: fadeIn 0.2s ease ${index * 50}ms both">
        <div class="mobile-coupon-header">
          <code class="coupon-code-badge">${coupon.code}</code>
          <span class="coupon-status ${statusClass}">
            <i class="fas fa-${isExpired ? 'times-circle' : (coupon.status === 'active' ? 'check-circle' : 'pause-circle')}"></i>
            ${statusText}
          </span>
        </div>
        <div class="mobile-coupon-body">
          <div class="mobile-coupon-row">
            <span class="mobile-coupon-label">Type:</span>
            <span class="coupon-type-badge ${coupon.type}">
              ${coupon.type === 'percentage' ? 'Percentage' : 'Fixed'}
            </span>
          </div>
          <div class="mobile-coupon-row">
            <span class="mobile-coupon-label">Discount:</span>
            <span class="coupon-discount-value">${formatCouponDiscount(coupon)}</span>
          </div>
          <div class="mobile-coupon-row">
            <span class="mobile-coupon-label">Uses:</span>
            <span class="usage-count">${parseInt(coupon.currentUses) || 0}${coupon.maxUses ? '/' + parseInt(coupon.maxUses) : '/∞'}</span>
          </div>
          <div class="mobile-coupon-row">
            <span class="mobile-coupon-label">Expires:</span>
            <span class="coupon-expiry ${isExpired ? 'expired' : ''}">${formatCouponDate(coupon.expiryDate)}</span>
          </div>
        </div>
        <div class="mobile-coupon-actions">
          <button class="btn btn-sm btn-secondary" onclick="editCoupon('${coupon.code}')">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-secondary" onclick="viewCouponAnalytics('${coupon.code}')">
            <i class="fas fa-chart-bar"></i> Analytics
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCoupon('${coupon.code}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// FORMATTING HELPERS (UNCHANGED)
// ============================================

function formatCouponDiscount(coupon) {
  if (coupon.type === 'percentage') {
    return `${coupon.value}%`;
  } else {
    if (typeof coupon.value === 'object') {
      return `৳${coupon.value.BD?.toLocaleString() || 0} / Rp ${coupon.value.ID?.toLocaleString() || 0}`;
    }
    return `${coupon.value}`;
  }
}

function formatValidFor(validFor) {
  if (!validFor || validFor.length === 0) return '<span class="package-badge all">All</span>';
  if (validFor.includes('all')) return '<span class="package-badge all">All</span>';
  
  return validFor.map(pkg => {
    return `<span class="package-badge ${pkg}">${pkg.charAt(0).toUpperCase() + pkg.slice(1)}</span>`;
  }).join('');
}

function formatCouponDate(date) {
  if (!date) return 'N/A';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCouponDateTime(date) {
  if (!date) return 'N/A';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================
// FILTERING (UPDATED)
// ============================================

function filterCouponsData(data) {
  return data.filter(coupon => {
    const now = new Date();
    
    const expiry = coupon.expiryDate?.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate);
    
    const isExpired = expiry <= now;
    
    // Status filter
    if (couponFilters.status !== 'all') {
      if (couponFilters.status === 'expired' && !isExpired) return false;
      if (couponFilters.status === 'active' && (isExpired || coupon.status !== 'active')) return false;
      if (couponFilters.status === 'inactive' && (isExpired || coupon.status !== 'inactive')) return false;
    }
    
    // Package filter
    if (couponFilters.package !== 'all') {
      if (!coupon.validFor?.includes('all') && !coupon.validFor?.includes(couponFilters.package)) return false;
    }
    
    // Country filter
    if (couponFilters.country !== 'all') {
      if (!coupon.validCountries?.includes(couponFilters.country)) return false;
    }
    
    // Search filter
    if (couponFilters.search) {
      const search = couponFilters.search.toLowerCase();
      if (!coupon.code.toLowerCase().includes(search) && 
          !coupon.description?.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    return true;
  });
}

function filterCoupons() {
  const searchInput = document.getElementById('coupon-search');
  couponFilters.search = searchInput?.value || '';
  renderCouponsTable();
  renderMobileCoupons();
}

function filterCouponsByStatus(status) {
  couponFilters.status = status;
  
  // Update active state on stat cards
  document.querySelectorAll('.coupon-stats .stat-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`.stat-tab[data-coupon-filter="${status}"]`)?.classList.add('active');
  
  renderCouponsTable();
  renderMobileCoupons();
}
// ============================================
// FILTER DROPDOWNS
// ============================================

function toggleCouponFilterDropdown(type) {
  const dropdown = document.getElementById(`coupon-${type}-filter-dropdown`);
  const menu = document.getElementById(`coupon-${type}-filter-menu`);
  
  // Close other dropdowns
  document.querySelectorAll('.coupon-toolbar .custom-filter-dropdown').forEach(d => {
    if (d !== dropdown) {
      d.classList.remove('open');
    }
  });
  
  dropdown?.classList.toggle('open');
  
  // Close on outside click
  document.addEventListener('click', function closeDropdown(e) {
    if (!dropdown?.contains(e.target)) {
      dropdown?.classList.remove('open');
      document.removeEventListener('click', closeDropdown);
    }
  });
}

function selectCouponStatusFilter(value) {
  couponFilters.status = value;
  
  const valueDisplay = document.getElementById('coupon-status-filter-value');
  const menu = document.getElementById('coupon-status-filter-menu');
  
  const labels = {
    'all': 'All Status',
    'active': 'Active',
    'inactive': 'Inactive',
    'expired': 'Expired'
  };
  
  if (valueDisplay) valueDisplay.textContent = labels[value];
  
  menu?.querySelectorAll('.filter-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === value);
  });
  
  document.getElementById('coupon-status-filter-dropdown')?.classList.remove('open');
  
  renderCouponsTable();
  renderMobileCoupons();
}

function selectCouponPackageFilter(value) {
  couponFilters.package = value;
  
  const valueDisplay = document.getElementById('coupon-package-filter-value');
  const menu = document.getElementById('coupon-package-filter-menu');
  
  const labels = {
    'all': 'All Packages',
    'basic': 'Basic',
    'professional': 'Professional',
    'executive': 'Executive'
  };
  
  if (valueDisplay) valueDisplay.textContent = labels[value];
  
  menu?.querySelectorAll('.filter-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === value);
  });
  
  document.getElementById('coupon-package-filter-dropdown')?.classList.remove('open');
  
  renderCouponsTable();
  renderMobileCoupons();
}

function selectCouponCountryFilter(value) {
  couponFilters.country = value;
  
  const valueDisplay = document.getElementById('coupon-country-filter-value');
  const menu = document.getElementById('coupon-country-filter-menu');
  
  const labels = {
    'all': 'All Countries',
    'BD': 'Bangladesh',
    'ID': 'Indonesia'
  };
  
  if (valueDisplay) valueDisplay.textContent = labels[value];
  
  menu?.querySelectorAll('.filter-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === value);
  });
  
  document.getElementById('coupon-country-filter-dropdown')?.classList.remove('open');
  
  renderCouponsTable();
  renderMobileCoupons();
}

// ============================================
// SORTING
// ============================================

function sortCouponsData(data) {
  return [...data].sort((a, b) => {
    let comparison = 0;
    
    switch (couponSortField) {
      case 'code':
        comparison = a.code.localeCompare(b.code);
        break;
      case 'usage':
        comparison = (a.currentUses || 0) - (b.currentUses || 0);
        break;
      case 'status':
        const statusOrder = { 'active': 0, 'inactive': 1 };
        comparison = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
        break;
      case 'expiry':
        const aExp = a.expiryDate?.toDate ? a.expiryDate.toDate() : new Date(a.expiryDate);
        const bExp = b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
        comparison = aExp - bExp;
        break;
      case 'createdDate':
      default:
        const aCreated = a.createdDate?.toDate ? a.createdDate.toDate() : new Date(a.createdDate);
        const bCreated = b.createdDate?.toDate ? b.createdDate.toDate() : new Date(b.createdDate);
        comparison = aCreated - bCreated;
        break;
    }
    
    return couponSortDirection === 'desc' ? -comparison : comparison;
  });
}

function openCouponSortMenu(event, field) {
  event.stopPropagation();
  
  // Close all other sort menus
  document.querySelectorAll('.coupons-table .sort-dropdown').forEach(menu => {
    menu.classList.remove('active');
  });
  
  const menu = document.getElementById(`coupon-sort-dropdown-${field}`);
  menu?.classList.toggle('active');
  
  // Close on outside click
  document.addEventListener('click', function closeSortMenu(e) {
    menu?.classList.remove('active');
    document.removeEventListener('click', closeSortMenu);
  });
}

function sortCoupons(field, direction) {
  couponSortField = field;
  couponSortDirection = direction;
  
  // Close all sort menus
  document.querySelectorAll('.coupons-table .sort-dropdown').forEach(menu => {
    menu.classList.remove('active');
  });
  
  renderCouponsTable();
  renderMobileCoupons();
}

// ============================================
// COUPON MODAL - CREATE/EDIT
// ============================================

function openCouponModal(couponCode = null) {
  currentEditCouponId = couponCode;
  
  const modal = document.getElementById('coupon-modal');
  const title = document.getElementById('coupon-modal-title');
  const saveBtn = document.getElementById('save-coupon-btn-text');
  const deleteBtn = document.getElementById('delete-coupon-btn');
  
  if (couponCode) {
    // Edit mode
    const coupon = coupons.find(c => c.code === couponCode);
    if (!coupon) {
      showToast('Coupon not found', 'error');
      return;
    }
    
    title.textContent = 'Edit Coupon';
    saveBtn.textContent = 'Update Coupon';
    deleteBtn.style.display = 'inline-flex';
    
    // Populate form
    populateCouponForm(coupon);
  } else {
    // Create mode
    title.textContent = 'Create Coupon';
    saveBtn.textContent = 'Create Coupon';
    deleteBtn.style.display = 'none';
    
    resetCouponForm();
  }
  
  modal.classList.add('active');
  updateDiscountPreview();
}

function editCoupon(code) {
  openCouponModal(code);
}

function populateCouponForm(coupon) {
  // Basic info
  document.getElementById('coupon-code').value = coupon.code;
  document.getElementById('coupon-code').disabled = true; // Can't change code
  document.getElementById('coupon-description').value = coupon.description || '';
  
  // Discount type
  const typeRadios = document.querySelectorAll('input[name="discount-type"]');
  typeRadios.forEach(radio => {
    radio.checked = radio.value === coupon.type;
  });
  toggleDiscountType();
  
  // Discount value
  if (coupon.type === 'percentage') {
    document.getElementById('coupon-percentage').value = coupon.value;
  } else {
    if (typeof coupon.value === 'object') {
      document.getElementById('coupon-amount-bd').value = coupon.value.BD || 0;
      document.getElementById('coupon-amount-id').value = coupon.value.ID || 0;
    }
  }
  
  // Valid packages
  const packageAll = document.getElementById('package-all');
  const isAllPackages = coupon.validFor?.includes('all');
  packageAll.checked = isAllPackages;
  togglePackageAll();
  
  if (!isAllPackages) {
    document.getElementById('package-basic').checked = coupon.validFor?.includes('basic');
    document.getElementById('package-professional').checked = coupon.validFor?.includes('professional');
    document.getElementById('package-executive').checked = coupon.validFor?.includes('executive');
  }
  
  // Valid countries
  document.getElementById('country-bd').checked = coupon.validCountries?.includes('BD');
  document.getElementById('country-id').checked = coupon.validCountries?.includes('ID');
  
  // Expiry
  if (coupon.expiryDate) {
    const expiry = coupon.expiryDate.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate);
    document.getElementById('coupon-expiry').value = expiry.toISOString().slice(0, 16);
  }
  
  // Usage limits
  const usageLimitRadios = document.querySelectorAll('input[name="usage-limit"]');
  usageLimitRadios.forEach(radio => {
    radio.checked = (coupon.maxUses ? 'limited' : 'unlimited') === radio.value;
  });
  toggleUsageLimit();
  
  if (coupon.maxUses) {
    document.getElementById('coupon-max-uses').value = coupon.maxUses;
  }
  
  // Status
  const statusRadios = document.querySelectorAll('input[name="coupon-status"]');
  statusRadios.forEach(radio => {
    radio.checked = radio.value === coupon.status;
  });
}

function resetCouponForm() {
  document.getElementById('coupon-code').value = '';
  document.getElementById('coupon-code').disabled = false;
  document.getElementById('coupon-description').value = '';
  
  document.querySelector('input[name="discount-type"][value="percentage"]').checked = true;
  toggleDiscountType();
  
  document.getElementById('coupon-percentage').value = 10;
  document.getElementById('coupon-amount-bd').value = 0;
  document.getElementById('coupon-amount-id').value = 0;
  
  document.getElementById('package-all').checked = true;
  togglePackageAll();
  
  document.getElementById('country-bd').checked = true;
  document.getElementById('country-id').checked = true;
  
  setDefaultCouponExpiry();
  
  document.querySelector('input[name="usage-limit"][value="unlimited"]').checked = true;
  toggleUsageLimit();
  
  document.getElementById('coupon-max-uses').value = 100;
  
  document.querySelector('input[name="coupon-status"][value="active"]').checked = true;
}

function setDefaultCouponExpiry() {
  const expiryInput = document.getElementById('coupon-expiry');
  if (expiryInput) {
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 1); // 1 month from now
    expiryInput.value = defaultExpiry.toISOString().slice(0, 16);
  }
}

// ============================================
// FORM TOGGLES
// ============================================

function toggleDiscountType() {
  const type = document.querySelector('input[name="discount-type"]:checked')?.value;
  const percentageGroup = document.querySelector('.discount-percentage-group');
  const fixedGroup = document.querySelector('.discount-fixed-group');
  
  if (type === 'percentage') {
    percentageGroup.style.display = 'block';
    fixedGroup.style.display = 'none';
  } else {
    percentageGroup.style.display = 'none';
    fixedGroup.style.display = 'block';
  }
  
  updateDiscountPreview();
}

function togglePackageAll() {
  const packageAll = document.getElementById('package-all');
  const packageCheckboxes = document.querySelectorAll('.package-checkbox');
  
  packageCheckboxes.forEach(checkbox => {
    checkbox.disabled = packageAll.checked;
    if (packageAll.checked) {
      checkbox.checked = false;
    }
  });
}

function toggleUsageLimit() {
  const usageLimit = document.querySelector('input[name="usage-limit"]:checked')?.value;
  const maxUsesGroup = document.querySelector('.max-uses-group');
  
  if (usageLimit === 'limited') {
    maxUsesGroup.style.display = 'block';
  } else {
    maxUsesGroup.style.display = 'none';
  }
}

// ============================================
// DISCOUNT PREVIEW
// ============================================

function initCouponPreviewListeners() {
  const inputs = [
    'coupon-percentage',
    'coupon-amount-bd',
    'coupon-amount-id'
  ];
  
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', updateDiscountPreview);
    }
  });
  
  document.querySelectorAll('input[name="discount-type"]').forEach(radio => {
    radio.addEventListener('change', updateDiscountPreview);
  });
}

function updateDiscountPreview() {
  const type = document.querySelector('input[name="discount-type"]:checked')?.value;
  
  if (type === 'percentage') {
    const percentage = parseFloat(document.getElementById('coupon-percentage')?.value) || 0;
    
    // BD prices
    document.getElementById('preview-bd-basic').textContent = `- ৳${Math.round(packagePrices.BD.basic * percentage / 100).toLocaleString()}`;
    document.getElementById('preview-bd-professional').textContent = `- ৳${Math.round(packagePrices.BD.professional * percentage / 100).toLocaleString()}`;
    document.getElementById('preview-bd-executive').textContent = `- ৳${Math.round(packagePrices.BD.executive * percentage / 100).toLocaleString()}`;
    
    // ID prices
    document.getElementById('preview-id-basic').textContent = `- Rp ${Math.round(packagePrices.ID.basic * percentage / 100).toLocaleString()}`;
    document.getElementById('preview-id-professional').textContent = `- Rp ${Math.round(packagePrices.ID.professional * percentage / 100).toLocaleString()}`;
    document.getElementById('preview-id-executive').textContent = `- Rp ${Math.round(packagePrices.ID.executive * percentage / 100).toLocaleString()}`;
  } else {
    const amountBD = parseFloat(document.getElementById('coupon-amount-bd')?.value) || 0;
    const amountID = parseFloat(document.getElementById('coupon-amount-id')?.value) || 0;
    
    // BD prices (fixed)
    document.getElementById('preview-bd-basic').textContent = `- ৳${amountBD.toLocaleString()}`;
    document.getElementById('preview-bd-professional').textContent = `- ৳${amountBD.toLocaleString()}`;
    document.getElementById('preview-bd-executive').textContent = `- ৳${amountBD.toLocaleString()}`;
    
    // ID prices (fixed)
    document.getElementById('preview-id-basic').textContent = `- Rp ${amountID.toLocaleString()}`;
    document.getElementById('preview-id-professional').textContent = `- Rp ${amountID.toLocaleString()}`;
    document.getElementById('preview-id-executive').textContent = `- Rp ${amountID.toLocaleString()}`;
  }
}

// ============================================
// SAVE COUPON
// ============================================

async function saveCoupon() {
  const code = document.getElementById('coupon-code').value.trim().toUpperCase();
  const description = document.getElementById('coupon-description').value.trim();
  const type = document.querySelector('input[name="discount-type"]:checked')?.value;
  const status = document.querySelector('input[name="coupon-status"]:checked')?.value;
  const usageLimit = document.querySelector('input[name="usage-limit"]:checked')?.value;
  const expiryValue = document.getElementById('coupon-expiry').value;
  
  // Validation
  if (!code) {
    showToast('Please enter a coupon code', 'error');
    return;
  }
  
  if (!code.match(/^[A-Z0-9]+$/)) {
    showToast('Coupon code can only contain letters and numbers', 'error');
    return;
  }
  
  if (!expiryValue) {
    showToast('Please set an expiry date', 'error');
    return;
  }
  
  // Check if code already exists (for new coupons)
  if (!currentEditCouponId) {
    const existingCoupon = coupons.find(c => c.code === code);
    if (existingCoupon) {
      showToast('A coupon with this code already exists', 'error');
      return;
    }
  }
  
  // Build coupon data
  let value;
  if (type === 'percentage') {
    value = parseFloat(document.getElementById('coupon-percentage').value) || 0;
    if (value <= 0 || value > 100) {
      showToast('Percentage must be between 1 and 100', 'error');
      return;
    }
  } else {
    value = {
      BD: parseFloat(document.getElementById('coupon-amount-bd').value) || 0,
      ID: parseFloat(document.getElementById('coupon-amount-id').value) || 0
    };
    if (value.BD <= 0 && value.ID <= 0) {
      showToast('Please enter at least one discount amount', 'error');
      return;
    }
  }
  
  // Valid packages
  let validFor;
  if (document.getElementById('package-all').checked) {
    validFor = ['all'];
  } else {
    validFor = [];
    if (document.getElementById('package-basic').checked) validFor.push('basic');
    if (document.getElementById('package-professional').checked) validFor.push('professional');
    if (document.getElementById('package-executive').checked) validFor.push('executive');
    
    if (validFor.length === 0) {
      showToast('Please select at least one package', 'error');
      return;
    }
  }
  
  // Valid countries
  const validCountries = [];
  if (document.getElementById('country-bd').checked) validCountries.push('BD');
  if (document.getElementById('country-id').checked) validCountries.push('ID');
  
  if (validCountries.length === 0) {
    showToast('Please select at least one country', 'error');
    return;
  }
  
  // Max uses
  const maxUses = usageLimit === 'limited' ? parseInt(document.getElementById('coupon-max-uses').value) : null;
  
  const couponData = {
    code,
    description,
    type,
    value,
    validFor,
    validCountries,
    status,
    maxUses,
    expiryDate: new Date(expiryValue),
    currentUses: currentEditCouponId ? (coupons.find(c => c.code === code)?.currentUses || 0) : 0
  };
  
  // Add created info for new coupons
  if (!currentEditCouponId) {
    couponData.createdDate = new Date();
    couponData.createdBy = document.getElementById('admin-email')?.textContent || 'admin';
  }
  
  try {
    if (currentEditCouponId) {
      await CouponAPI.updateCoupon(code, couponData);
      showToast('Coupon updated successfully', 'success');
    } else {
      await CouponAPI.createCoupon(code, couponData);
      showToast('Coupon created successfully', 'success');
    }
    
    closeModal('coupon-modal');
    loadCoupons();
  } catch (error) {
    console.error('Error saving coupon:', error);
    showToast('Failed to save coupon', 'error');
  }
}

// ============================================
// DELETE COUPON
// ============================================

function deleteCoupon(code) {
  currentEditCouponId = code;
  document.getElementById('delete-coupon-code').textContent = code;
  document.getElementById('delete-coupon-modal').classList.add('active');
}

function showDeleteCouponConfirm() {
  const code = document.getElementById('coupon-code').value;
  deleteCoupon(code);
}

async function confirmDeleteCoupon() {
  if (!currentEditCouponId) return;
  
  try {
    await CouponAPI.deleteCoupon(currentEditCouponId);
    showToast('Coupon deleted successfully', 'success');
    
    closeModal('delete-coupon-modal');
    closeModal('coupon-modal');
    
    currentEditCouponId = null;
    loadCoupons();
  } catch (error) {
    console.error('Error deleting coupon:', error);
    showToast('Failed to delete coupon', 'error');
  }
}

// ============================================
// ANALYTICS
// ============================================

function populateAnalyticsCouponDropdown() {
  const menu = document.getElementById('analytics-coupon-menu');
  if (!menu) return;
  
  // Keep the "All Coupons" option
  let html = `
    <button class="filter-option active" data-value="all" onclick="selectAnalyticsCoupon('all')">
      <i class="fas fa-layer-group"></i>
      <span>All Coupons</span>
    </button>
  `;
  
  // Add each coupon
  coupons.forEach(coupon => {
    html += `
      <button class="filter-option" data-value="${coupon.code}" onclick="selectAnalyticsCoupon('${coupon.code}')">
        <i class="fas fa-ticket-alt"></i>
        <span>${coupon.code}</span>
      </button>
    `;
  });
  
  menu.innerHTML = html;
}

function toggleAnalyticsCouponDropdown() {
  const dropdown = document.getElementById('analytics-coupon-dropdown');
  dropdown?.classList.toggle('open');
  
  document.addEventListener('click', function closeDropdown(e) {
    if (!dropdown?.contains(e.target)) {
      dropdown?.classList.remove('open');
      document.removeEventListener('click', closeDropdown);
    }
  });
}

function selectAnalyticsCoupon(value) {
  selectedAnalyticsCoupon = value;
  
  const valueDisplay = document.getElementById('analytics-coupon-value');
  const menu = document.getElementById('analytics-coupon-menu');
  
  if (valueDisplay) {
    valueDisplay.textContent = value === 'all' ? 'All Coupons' : value;
  }
  
  menu?.querySelectorAll('.filter-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === value);
  });
  
  document.getElementById('analytics-coupon-dropdown')?.classList.remove('open');
  
  updateAnalyticsStats();
  updateAnalyticsCharts();
  renderRecentUsage();
}

function updateAnalyticsStats() {
  let filteredUsage = couponUsage;
  
  if (selectedAnalyticsCoupon !== 'all') {
    filteredUsage = couponUsage.filter(u => u.couponCode === selectedAnalyticsCoupon);
  }
  
  const totalUses = filteredUsage.length;
  
  // Calculate total discount
  let totalDiscountBD = 0;
  let totalDiscountID = 0;
  
  filteredUsage.forEach(usage => {
    if (usage.discountAmount) {
      if (usage.country === 'BD' || usage.discountAmount.currency === 'BDT') {
        totalDiscountBD += usage.discountAmount.amount || 0;
      } else if (usage.country === 'ID' || usage.discountAmount.currency === 'IDR') {
        totalDiscountID += usage.discountAmount.amount || 0;
      }
    }
  });
  
  // Format total discount
  let totalDiscountText = '';
  if (totalDiscountBD > 0 && totalDiscountID > 0) {
    totalDiscountText = `৳${totalDiscountBD.toLocaleString()} + Rp ${totalDiscountID.toLocaleString()}`;
  } else if (totalDiscountBD > 0) {
    totalDiscountText = `৳${totalDiscountBD.toLocaleString()}`;
  } else if (totalDiscountID > 0) {
    totalDiscountText = `Rp ${totalDiscountID.toLocaleString()}`;
  } else {
    totalDiscountText = '$0';
  }
  
  // Average discount
  const avgDiscountBD = totalUses > 0 ? Math.round(totalDiscountBD / totalUses) : 0;
  const avgDiscountID = totalUses > 0 ? Math.round(totalDiscountID / totalUses) : 0;
  
  let avgDiscountText = '';
  if (avgDiscountBD > 0 && avgDiscountID > 0) {
    avgDiscountText = `~৳${avgDiscountBD.toLocaleString()}`;
  } else if (avgDiscountBD > 0) {
    avgDiscountText = `৳${avgDiscountBD.toLocaleString()}`;
  } else if (avgDiscountID > 0) {
    avgDiscountText = `Rp ${avgDiscountID.toLocaleString()}`;
  } else {
    avgDiscountText = '$0';
  }
  
  // Conversion rate (placeholder - would need order data)
  const conversionRate = '0%';
  
  document.getElementById('analytics-total-uses').textContent = totalUses;
  // Format total discount for display
  const totalDiscountElement = document.getElementById('analytics-total-discount');
  if (totalDiscountElement) {
    totalDiscountElement.style.display = 'flex';
    totalDiscountElement.style.flexDirection = 'column';
    totalDiscountElement.style.gap = '2px';
    totalDiscountElement.style.lineHeight = '1.2';
    
    let discountHTML = '';
    if (totalDiscountBD > 0) {
      discountHTML += `<span>৳ ${totalDiscountBD.toLocaleString()}</span>`;
    }
    if (totalDiscountID > 0) {
      discountHTML += `<span>Rp ${totalDiscountID.toLocaleString()}</span>`;
    }
    if (totalDiscountBD === 0 && totalDiscountID === 0) {
      discountHTML = '<span>$0</span>';
    }
    
    totalDiscountElement.innerHTML = discountHTML;
  }
  document.getElementById('analytics-avg-discount').textContent = avgDiscountText;
  document.getElementById('analytics-conversion-rate').textContent = conversionRate;
}

function updateAnalyticsCharts() {
  let filteredUsage = couponUsage;
  
  if (selectedAnalyticsCoupon !== 'all') {
    filteredUsage = couponUsage.filter(u => u.couponCode === selectedAnalyticsCoupon);
  }
  
  // Usage over time chart (last 30 days)
  updateUsageChart(filteredUsage);
  
  // Package breakdown chart
  updatePackageChart(filteredUsage);
  
  // Country distribution chart
  updateCountryChart(filteredUsage);
}

function updateUsageChart(usage) {
  const ctx = document.getElementById('usage-chart');
  if (!ctx) return;
  
  // Destroy existing chart
  if (usageChart) {
    usageChart.destroy();
  }
  
  // Generate last 30 days data
  const days = [];
  const counts = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    const dayUsage = usage.filter(u => {
      const usedAt = u.usedAt?.toDate ? u.usedAt.toDate() : new Date(u.usedAt);
      return usedAt.toISOString().split('T')[0] === dateStr;
    }).length;
    
    counts.push(dayUsage);
  }
  
  usageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Coupon Uses',
        data: counts,
        borderColor: '#0066FF',
        backgroundColor: 'rgba(0, 102, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#A0A0A0',
            maxTicksLimit: 10
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#A0A0A0',
            stepSize: 1
          }
        }
      }
    }
  });
}

function updatePackageChart(usage) {
  const ctx = document.getElementById('package-chart');
  if (!ctx) return;
  
  if (packageChart) {
    packageChart.destroy();
  }
  
  const packageCounts = {
    basic: 0,
    professional: 0,
    executive: 0
  };
  
  usage.forEach(u => {
    const pkg = (u.packageSelected || '').toLowerCase();
    
    // Map the actual package names to the categories
    if (pkg.includes('basic')) {
      packageCounts.basic++;
    } else if (pkg.includes('professional')) {
      packageCounts.professional++;
    } else if (pkg.includes('executive')) {
      packageCounts.executive++;
    }
  });
  
  packageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Basic', 'Professional', 'Executive'],
      datasets: [{
        data: [packageCounts.basic, packageCounts.professional, packageCounts.executive],
        backgroundColor: ['#3B82F6', '#8B5CF6', '#F59E0B'],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#A0A0A0',
            stepSize: 1
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            color: '#A0A0A0'
          }
        }
      }
    }
  });
}

function updateCountryChart(usage) {
  const ctx = document.getElementById('country-chart');
  if (!ctx) return;
  
  if (countryChart) {
    countryChart.destroy();
  }
  
  const countryCounts = {
    BD: 0,
    ID: 0
  };
  
  usage.forEach(u => {
    if (u.country && countryCounts.hasOwnProperty(u.country)) {
      countryCounts[u.country]++;
    }
  });
  
  countryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['🇧🇩 Bangladesh', '🇮🇩 Indonesia'],
      datasets: [{
        data: [countryCounts.BD, countryCounts.ID],
        backgroundColor: ['#10B981', '#EF4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#A0A0A0',
            padding: 15
          }
        }
      }
    }
  });
}

function renderRecentUsage() {
  const tbody = document.getElementById('recent-usage-body');
  const emptyState = document.getElementById('usage-empty');
  
  if (!tbody) return;
  
  let filteredUsage = couponUsage;
  
  if (selectedAnalyticsCoupon !== 'all') {
    filteredUsage = couponUsage.filter(u => u.couponCode === selectedAnalyticsCoupon);
  }
  
  // Get last 10
  const recentUsage = filteredUsage.slice(0, 10);
  
  if (recentUsage.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  
  tbody.innerHTML = recentUsage.map(usage => {
    const usedAt = usage.usedAt?.toDate ? usage.usedAt.toDate() : new Date(usage.usedAt);
    
    return `
      <tr>
        <td>${formatCouponDateTime(usage.usedAt)}</td>
        <td>
          <div class="customer-info">
            <span class="customer-name">${usage.customerName || 'N/A'}</span>
            <span class="customer-email">${usage.customerEmail || ''}</span>
          </div>
        </td>
        <td><code class="coupon-code-badge small">${usage.couponCode}</code></td>
        <td><span class="package-badge ${usage.packageSelected?.toLowerCase()}">${usage.packageSelected || 'N/A'}</span></td>
        <td><span class="country-flag">${usage.country === 'BD' ? '🇧🇩' : '🇮🇩'}</span> ${usage.country || 'N/A'}</td>
        <td class="discount-amount">
          ${usage.discountAmount ? (usage.country === 'BD' ? '৳' : 'Rp ') + (usage.discountAmount.amount?.toLocaleString() || 0) : 'N/A'}
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// VIEW COUPON ANALYTICS MODAL
// ============================================

async function viewCouponAnalytics(code) {
  const coupon = coupons.find(c => c.code === code);
  if (!coupon) {
    showToast('Coupon not found', 'error');
    return;
  }
  
  // Get usage for this coupon
  const usageForCoupon = couponUsage.filter(u => u.couponCode === code);
  
  document.getElementById('analytics-modal-coupon-code').textContent = code;
  
  // Calculate stats
  const totalUses = usageForCoupon.length;
  let totalDiscountBD = 0;
  let totalDiscountID = 0;
  
  usageForCoupon.forEach(usage => {
    if (usage.discountAmount) {
      if (usage.country === 'BD') {
        totalDiscountBD += usage.discountAmount.amount || 0;
      } else if (usage.country === 'ID') {
        totalDiscountID += usage.discountAmount.amount || 0;
      }
    }
  });
  
  // Package breakdown
  const packageBreakdown = { basic: 0, professional: 0, executive: 0 };
  usageForCoupon.forEach(u => {
    const pkg = (u.packageSelected || '').toLowerCase();
  
  // Map the actual package names to the categories
  if (pkg.includes('basic')) {
    packageBreakdown.basic++;
  } else if (pkg.includes('professional')) {
    packageBreakdown.professional++;
  } else if (pkg.includes('executive')) {
    packageBreakdown.executive++;
  }
});
  
  // Country breakdown
  const countryBreakdown = { BD: 0, ID: 0 };
  usageForCoupon.forEach(u => {
    if (u.country && countryBreakdown.hasOwnProperty(u.country)) {
      countryBreakdown[u.country]++;
    }
  });
  
  const modalBody = document.getElementById('coupon-analytics-modal-body');
  modalBody.innerHTML = `
    <div class="coupon-analytics-detail">
      <div class="analytics-detail-header">
        <div class="coupon-detail-info">
          <code class="coupon-code-badge large">${code}</code>
          <span class="coupon-type-badge ${coupon.type}">${coupon.type === 'percentage' ? coupon.value + '%' : formatCouponDiscount(coupon)}</span>
          <span class="coupon-status ${coupon.status}">${coupon.status}</span>
        </div>
        <p class="coupon-description">${coupon.description || 'No description'}</p>
      </div>
      
      <div class="stats-row analytics-detail-stats">
        <div class="stat-card-compact">
          <div class="stat-icon-sm analytics-uses">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">${totalUses}</div>
            <div class="stat-label">Total Uses</div>
          </div>
        </div>
        <div class="stat-card-compact">
        <div class="stat-icon-sm analytics-discount">
          <i class="fas fa-money-bill-wave"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value" style="display: flex; flex-direction: column; gap: 2px; line-height: 1.2;">
            ${totalDiscountBD > 0 ? '<span>৳' + totalDiscountBD.toLocaleString() + '</span>' : ''}
            ${totalDiscountID > 0 ? '<span>Rp ' + totalDiscountID.toLocaleString() + '</span>' : ''}
            ${totalDiscountBD === 0 && totalDiscountID === 0 ? '<span>$0</span>' : ''}
          </div>
          <div class="stat-label">Total Discount</div>
        </div>
      </div>
        <div class="stat-card-compact">
          <div class="stat-icon-sm coupon-usage">
            <i class="fas fa-chart-pie"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">${coupon.currentUses || 0}${coupon.maxUses ? '/' + coupon.maxUses : '/∞'}</div>
            <div class="stat-label">Usage Limit</div>
          </div>
        </div>
      </div>
      
      <div class="analytics-detail-breakdown">
        <div class="breakdown-section">
          <h4><i class="fas fa-box"></i> Package Usage</h4>
          <div class="breakdown-bars">
            <div class="breakdown-item">
              <span class="breakdown-label">Basic</span>
              <div class="breakdown-bar-container">
                <div class="breakdown-bar basic" style="width: ${totalUses > 0 ? (packageBreakdown.basic / totalUses * 100) : 0}%"></div>
              </div>
              <span class="breakdown-count">${packageBreakdown.basic}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Professional</span>
              <div class="breakdown-bar-container">
                <div class="breakdown-bar professional" style="width: ${totalUses > 0 ? (packageBreakdown.professional / totalUses * 100) : 0}%"></div>
              </div>
              <span class="breakdown-count">${packageBreakdown.professional}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Executive</span>
              <div class="breakdown-bar-container">
                <div class="breakdown-bar executive" style="width: ${totalUses > 0 ? (packageBreakdown.executive / totalUses * 100) : 0}%"></div>
              </div>
              <span class="breakdown-count">${packageBreakdown.executive}</span>
            </div>
          </div>
        </div>
        
        <div class="breakdown-section">
          <h4><i class="fas fa-globe"></i> Country Usage</h4>
          <div class="breakdown-bars">
            <div class="breakdown-item">
              <span class="breakdown-label">🇧🇩 Bangladesh</span>
              <div class="breakdown-bar-container">
                <div class="breakdown-bar bd" style="width: ${totalUses > 0 ? (countryBreakdown.BD / totalUses * 100) : 0}%"></div>
              </div>
              <span class="breakdown-count">${countryBreakdown.BD}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">🇮🇩 Indonesia</span>
              <div class="breakdown-bar-container">
                <div class="breakdown-bar id" style="width: ${totalUses > 0 ? (countryBreakdown.ID / totalUses * 100) : 0}%"></div>
              </div>
              <span class="breakdown-count">${countryBreakdown.ID}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="analytics-detail-recent">
        <h4><i class="fas fa-history"></i> Recent Usage</h4>
        <div class="recent-usage-list">
          ${usageForCoupon.slice(0, 5).map(usage => `
            <div class="recent-usage-item">
              <div class="usage-item-info">
                <span class="customer-name">${usage.customerName || 'N/A'}</span>
                <span class="usage-meta">
                  <span class="package-badge ${usage.packageSelected?.toLowerCase()}">${usage.packageSelected || 'N/A'}</span>
                  <span class="country-flag">${usage.country === 'BD' ? '🇧🇩' : '🇮🇩'}</span>
                </span>
              </div>
              <div class="usage-item-discount">
                ${usage.discountAmount ? (usage.country === 'BD' ? '৳' : 'Rp ') + (usage.discountAmount.amount?.toLocaleString() || 0) : 'N/A'}
              </div>
              <div class="usage-item-date">
                ${formatCouponDateTime(usage.usedAt)}
              </div>
            </div>
          `).join('') || '<p class="no-usage">No usage yet</p>'}
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('coupon-analytics-modal').classList.add('active');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportCouponCSV() {
  let filteredUsage = couponUsage;
  
  if (selectedAnalyticsCoupon !== 'all') {
    filteredUsage = couponUsage.filter(u => u.couponCode === selectedAnalyticsCoupon);
  }
  
  if (filteredUsage.length === 0) {
    showToast('No data to export', 'warning');
    return;
  }
  
  // Build CSV
  const headers = ['Date', 'Coupon Code', 'Customer Name', 'Customer Email', 'Package', 'Country', 'Original Price', 'Discount', 'Final Price'];
  const rows = filteredUsage.map(u => {
    const usedAt = u.usedAt?.toDate ? u.usedAt.toDate() : new Date(u.usedAt);
    return [
      usedAt.toISOString(),
      u.couponCode,
      u.customerName || '',
      u.customerEmail || '',
      u.packageSelected || '',
      u.country || '',
      u.originalPrice?.amount || 0,
      u.discountAmount?.amount || 0,
      u.finalPrice?.amount || 0
    ];
  });
  
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `coupon-usage-${selectedAnalyticsCoupon === 'all' ? 'all' : selectedAnalyticsCoupon}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showToast('CSV exported successfully', 'success');
}

function exportCouponPDF() {
  showToast('PDF export coming soon', 'info');
}

function exportSingleCouponReport() {
  const couponCode = document.getElementById('analytics-modal-coupon-code').textContent;
  selectedAnalyticsCoupon = couponCode;
  exportCouponCSV();
}

function showAllUsage() {
  // Switch to coupons view with usage filter
  showToast('Showing all usage records', 'info');
}

// ============================================
// EXTEND SWITCHVIEW FOR COUPONS
// ============================================

// Extend the existing switchView function
const originalSwitchView = window.switchView;
window.switchView = function(view) {
  // Call original function first
  if (originalSwitchView) {
    originalSwitchView(view);
  }
  
  // Handle coupon views
  if (view === 'coupons' || view === 'coupon-analytics') {
    // Update header title
    const headerTitle = document.getElementById('header-title');
    const titles = {
      'coupons': 'Coupon Management',
      'coupon-analytics': 'Coupon Analytics'
    };
    if (headerTitle && titles[view]) {
      headerTitle.textContent = titles[view];
    }
    
    // Update nav active states
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
    
    const navItem = document.querySelector(`.nav-subitem[data-view="${view}"]`);
    if (navItem) {
      navItem.classList.add('active');
      // Also expand the coupon menu
      const couponSubmenu = document.getElementById('coupon-submenu');
      const couponArrow = document.getElementById('coupon-arrow');
      const couponParent = couponArrow?.closest('.nav-item-parent');
      
      couponSubmenu?.classList.add('open');
      couponParent?.classList.add('expanded');
    }
    
    // Show the view
    setTimeout(() => {
      document.querySelectorAll('.cms-view').forEach(v => {
        v.classList.remove('active');
        v.style.opacity = '';
      });
      
      const newView = document.getElementById(`${view}-view`);
      if (newView) {
        newView.classList.add('active');
        newView.style.animation = 'fadeIn 0.2s ease';
      }
    }, 150);
    
    // Initialize charts if analytics view
    if (view === 'coupon-analytics') {
      setTimeout(() => {
        updateAnalyticsStats();
        updateAnalyticsCharts();
        renderRecentUsage();
      }, 200);
    }
  }
};
