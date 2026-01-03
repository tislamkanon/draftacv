// Form Script for DraftaCV with Google Sheets & Drive Integration

// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Handles text data + file uploads (profile photo & CV)
// ========== CONFIGURATION ==========
// Use the secure Netlify function proxy to hide the Apps Script URL
const NETLIFY_FUNCTIONS_BASE = "https://scansentry-proxy.netlify.app/.netlify/functions";
const APPSCRIPT_PROXY_ENDPOINT = `${NETLIFY_FUNCTIONS_BASE}/appscript-proxy`;

// Package data with both currencies
const packages = {
  basic: { 
    name: 'Basic Starter', 
    price: { BD: '৳999', ID: 'Rp 129,000' }
  },
  professional: { 
    name: 'Professional', 
    price: { BD: '৳1,999', ID: 'Rp 259,000' }
  },
  executive: { 
    name: 'Executive Elite', 
    price: { BD: '৳3,999', ID: 'Rp 519,000' }
  },
  custom: { 
    name: 'Custom Package', 
    price: { BD: 'Custom', ID: 'Custom' }
  }
};

// Track entry counts
let workExperienceCount = 1;
let educationCount = 1;
let certificationCount = 1;
let referenceCount = 1;

// ADD THIS VALIDATION FUNCTION HERE ↓↓↓
function validateFileSize(file, maxSizeMB, fileType) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    alert(`${fileType} exceeds the ${maxSizeMB}MB limit.\nCurrent size: ${(file.size / (1024 * 1024)).toFixed(2)}MB\nPlease choose a smaller file.`);
    return false;
  }
  return true;
}

// Store submission data for WhatsApp confirmation
let lastSubmissionData = {
  invoiceId: '',
  fullName: '',
  phone: ''
};

// Generate Invoice ID
function generateInvoiceId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DC-${timestamp}-${random}`;
}

// Get current country
function getCurrentCountry() {
  if (window.countryDetect && typeof window.countryDetect.getCurrent === 'function') {
    return window.countryDetect.getCurrent();
  }
  return localStorage.getItem('draftacv_country') || 'BD';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPlan = urlParams.get('package') || 'professional';
  
  // Wait for country detection to initialize
  setTimeout(() => {
    updatePackageDisplay(selectedPlan);
  }, 100);
  
// Mobile Menu Toggle - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-cta');
  
  // Toggle menu on button click
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      mobileMenuBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      
      // Toggle body scroll lock - using classList instead of style
      document.documentElement.classList.toggle('menu-open');
      document.body.classList.toggle('menu-open');
    });
    
    // Close menu when clicking on a link
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileMenuBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.documentElement.classList.remove('menu-open');
        document.body.classList.remove('menu-open');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (mobileMenu.classList.contains('active') && 
          !mobileMenu.contains(e.target) && 
          !mobileMenuBtn.contains(e.target)) {
        mobileMenuBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.documentElement.classList.remove('menu-open');
        document.body.classList.remove('menu-open');
      }
    });
  }
});
  
  const form = document.getElementById('cvForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  setupFileUploads();
  
  // Ensure we have a hidden iframe for submission
  let iframe = document.getElementById('hidden_iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'hidden_iframe';
    iframe.name = 'hidden_iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  
  // Add listener for iframe load to detect submission completion
  iframe.onload = handleIframeLoad;
});

function handleIframeLoad() {
  console.log("Iframe loaded - Submission attempt finished.");
  
  const submitBtn = document.querySelector('.submit-btn');
  if (submitBtn && submitBtn.disabled) {
    setTimeout(() => {
      showSuccessModal();
      document.getElementById('cvForm').reset();
    }, 500);
  }
}

// Update package display with country-specific pricing
function updatePackageDisplay(planKey) {
  const plan = packages[planKey] || packages.professional;
  const country = getCurrentCountry();
  const price = plan.price[country] || plan.price.BD;
  
  document.getElementById('selectedPackageName').textContent = plan.name;
  document.getElementById('selectedPackagePrice').textContent = price;
  document.getElementById('submitPackageName').textContent = plan.name;
  document.getElementById('submitPackagePrice').textContent = price;
  document.getElementById('modalPackageName').textContent = plan.name;
}

// Toggle job application fields
function toggleJobApplicationFields(show) {
  const jobApplicationFields = document.getElementById('jobApplicationFields');
  const jobTitleInput = document.getElementById('targetJobTitle');
  
  if (jobApplicationFields) {
    jobApplicationFields.style.display = show ? 'block' : 'none';
    
    // Make job title required when showing
    if (jobTitleInput) {
      if (show) {
        jobTitleInput.setAttribute('required', 'required');
      } else {
        jobTitleInput.removeAttribute('required');
        jobTitleInput.value = '';
        const jobDescInput = document.getElementById('targetJobDescription');
        if (jobDescInput) {
          jobDescInput.value = '';
        }
      }
    }
  }
}

// Toggle current job checkbox
function toggleCurrentJob(index) {
  const endDateInput = document.getElementById(`workEndDate_${index}`);
  const checkbox = document.querySelector(`input[name="workCurrent_${index}"]`);
  
  if (checkbox && checkbox.checked) {
    endDateInput.value = '';
    endDateInput.disabled = true;
  } else {
    endDateInput.disabled = false;
  }
}

// Add Work Experience
function addWorkExperience() {
  const container = document.getElementById('workExperienceContainer');
  const newIndex = workExperienceCount;
  const country = getCurrentCountry();
  const examples = window.countryDetect ? window.countryDetect.getExamples() : null;
  
  const jobTitlePlaceholder = examples ? examples.jobTitle : 'e.g., Senior Software Engineer';
  const companyPlaceholder = examples ? examples.company : 'e.g., Tech Corp Ltd.';
  const locationPlaceholder = examples ? examples.location : 'e.g., Dhaka, Bangladesh';
  
  if (workExperienceCount === 1) {
    document.querySelector('.experience-entry[data-index="0"] .remove-entry-btn').style.display = 'flex';
  }
  
  const html = `
    <div class="experience-entry" data-index="${newIndex}">
      <div class="entry-header">
        <span class="entry-number">Experience #${newIndex + 1}</span>
        <button type="button" class="remove-entry-btn" onclick="removeWorkExperience(${newIndex})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          Remove
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Job Title <span class="required-star">*</span></label>
          <input type="text" name="workTitle_${newIndex}" required placeholder="${jobTitlePlaceholder}">
        </div>
        <div class="form-group">
          <label>Company Name <span class="required-star">*</span></label>
          <input type="text" name="workCompany_${newIndex}" required placeholder="${companyPlaceholder}">
        </div>
        <div class="form-group full-width">
          <label>Company Address / Location</label>
          <input type="text" name="workLocation_${newIndex}" placeholder="${locationPlaceholder}">
        </div>
        <div class="form-group">
          <label>Start Date <span class="required-star">*</span></label>
          <input type="month" name="workStartDate_${newIndex}" required>
        </div>
        <div class="form-group">
          <label>End Date</label>
          <div class="date-with-checkbox">
            <input type="month" name="workEndDate_${newIndex}" id="workEndDate_${newIndex}">
            <label class="checkbox-label">
              <input type="checkbox" name="workCurrent_${newIndex}" onchange="toggleCurrentJob(${newIndex})">
              Currently working here
            </label>
          </div>
        </div>
        <div class="form-group full-width">
          <label>Key Responsibilities & Achievements</label>
          <textarea name="workDescription_${newIndex}" rows="4" placeholder="Describe your key responsibilities, achievements, and impact in this role..."></textarea>
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', html);
  workExperienceCount++;
}

function removeWorkExperience(index) {
  const entry = document.querySelector(`.experience-entry[data-index="${index}"]`);
  if (entry) {
    entry.remove();
    updateEntryNumbers('.experience-entry', 'Experience');
    
    const entries = document.querySelectorAll('.experience-entry');
    if (entries.length === 1) {
      entries[0].querySelector('.remove-entry-btn').style.display = 'none';
    }
  }
}

function addEducation() {
  const container = document.getElementById('educationContainer');
  const newIndex = educationCount;
  const examples = window.countryDetect ? window.countryDetect.getExamples() : null;
  
  const degreePlaceholder = examples ? examples.degree : 'e.g., Bachelor of Science in Computer Science';
  const institutionPlaceholder = examples ? examples.institution : 'e.g., University of Dhaka';
  const locationPlaceholder = examples ? examples.eduLocation : 'e.g., Dhaka, Bangladesh';
  const gpaPlaceholder = examples ? examples.gpa : 'e.g., 3.8 / 4.0';
  
  if (educationCount === 1) {
    document.querySelector('.education-entry[data-index="0"] .remove-entry-btn').style.display = 'flex';
  }
  
  const html = `
    <div class="education-entry" data-index="${newIndex}">
      <div class="entry-header">
        <span class="entry-number">Education #${newIndex + 1}</span>
        <button type="button" class="remove-entry-btn" onclick="removeEducation(${newIndex})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          Remove
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Degree / Certificate <span class="required-star">*</span></label>
          <input type="text" name="eduDegree_${newIndex}" required placeholder="${degreePlaceholder}">
        </div>
        <div class="form-group">
          <label>Institution Name <span class="required-star">*</span></label>
          <input type="text" name="eduInstitution_${newIndex}" required placeholder="${institutionPlaceholder}">
        </div>
        <div class="form-group">
          <label>Location</label>
          <input type="text" name="eduLocation_${newIndex}" placeholder="${locationPlaceholder}">
        </div>
        <div class="form-group">
          <label>GPA / Grade (optional)</label>
          <input type="text" name="eduGrade_${newIndex}" placeholder="${gpaPlaceholder}">
        </div>
        <div class="form-group">
          <label>Start Year</label>
          <input type="number" name="eduStartYear_${newIndex}" min="1950" max="2030" placeholder="e.g., 2018">
        </div>
        <div class="form-group">
          <label>End Year (or Expected)</label>
          <input type="number" name="eduEndYear_${newIndex}" min="1950" max="2030" placeholder="e.g., 2022">
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', html);
  educationCount++;
}

function removeEducation(index) {
  const entry = document.querySelector(`.education-entry[data-index="${index}"]`);
  if (entry) {
    entry.remove();
    updateEntryNumbers('.education-entry', 'Education');
    
    const entries = document.querySelectorAll('.education-entry');
    if (entries.length === 1) {
      entries[0].querySelector('.remove-entry-btn').style.display = 'none';
    }
  }
}

function addCertification() {
  const container = document.getElementById('certificationsContainer');
  const newIndex = certificationCount;
  const examples = window.countryDetect ? window.countryDetect.getExamples() : null;
  
  const certNamePlaceholder = examples ? examples.certName : 'e.g., AWS Solutions Architect';
  const certOrgPlaceholder = examples ? examples.certOrg : 'e.g., Amazon Web Services';
  const certIdPlaceholder = examples ? examples.certId : 'e.g., ABC123XYZ';
  
  if (certificationCount === 1) {
    document.querySelector('.certification-entry[data-index="0"] .remove-entry-btn').style.display = 'flex';
  }
  
  const html = `
    <div class="certification-entry" data-index="${newIndex}">
      <div class="entry-header">
        <span class="entry-number">Certification #${newIndex + 1}</span>
        <button type="button" class="remove-entry-btn" onclick="removeCertification(${newIndex})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          Remove
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Certification Name</label>
          <input type="text" name="certName_${newIndex}" placeholder="${certNamePlaceholder}">
        </div>
        <div class="form-group">
          <label>Issuing Organization</label>
          <input type="text" name="certOrg_${newIndex}" placeholder="${certOrgPlaceholder}">
        </div>
        <div class="form-group">
          <label>Issue Date</label>
          <input type="month" name="certDate_${newIndex}">
        </div>
        <div class="form-group">
          <label>Credential ID (optional)</label>
          <input type="text" name="certId_${newIndex}" placeholder="${certIdPlaceholder}">
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', html);
  certificationCount++;
}

function removeCertification(index) {
  const entry = document.querySelector(`.certification-entry[data-index="${index}"]`);
  if (entry) {
    entry.remove();
    updateEntryNumbers('.certification-entry', 'Certification');
    
    const entries = document.querySelectorAll('.certification-entry');
    if (entries.length === 1) {
      entries[0].querySelector('.remove-entry-btn').style.display = 'none';
    }
  }
}

function addReference() {
  const container = document.getElementById('referencesContainer');
  const newIndex = referenceCount;
  const examples = window.countryDetect ? window.countryDetect.getExamples() : null;
  
  const refNamePlaceholder = examples ? examples.refName : 'e.g., Dr. Jane Smith';
  const refTitlePlaceholder = examples ? examples.refTitle : 'e.g., Senior Manager at Tech Corp';
  const refEmailPlaceholder = examples ? examples.refEmail : 'e.g., jane.smith@techcorp.com';
  const refPhonePlaceholder = examples ? examples.refPhone : 'e.g., +880 1234 567890';
  
  if (referenceCount === 1) {
    document.querySelector('.reference-entry[data-index="0"] .remove-entry-btn').style.display = 'flex';
  }
  
  const html = `
    <div class="reference-entry" data-index="${newIndex}">
      <div class="entry-header">
        <span class="entry-number">Reference #${newIndex + 1}</span>
        <button type="button" class="remove-entry-btn" onclick="removeReference(${newIndex})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          Remove
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Reference Name</label>
          <input type="text" name="refName_${newIndex}" placeholder="${refNamePlaceholder}">
        </div>
        <div class="form-group">
          <label>Job Title / Relationship</label>
          <input type="text" name="refTitle_${newIndex}" placeholder="${refTitlePlaceholder}">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="refEmail_${newIndex}" placeholder="${refEmailPlaceholder}">
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" name="refPhone_${newIndex}" placeholder="${refPhonePlaceholder}">
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', html);
  referenceCount++;
}

function removeReference(index) {
  const entry = document.querySelector(`.reference-entry[data-index="${index}"]`);
  if (entry) {
    entry.remove();
    updateEntryNumbers('.reference-entry', 'Reference');
    
    const entries = document.querySelectorAll('.reference-entry');
    if (entries.length === 1) {
      entries[0].querySelector('.remove-entry-btn').style.display = 'none';
    }
  }
}

function updateEntryNumbers(selector, prefix) {
  const entries = document.querySelectorAll(selector);
  entries.forEach((entry, index) => {
    entry.setAttribute('data-index', index);
    
    const numberSpan = entry.querySelector('.entry-number');
    if (numberSpan) {
      numberSpan.textContent = `${prefix} #${index + 1}`;
    }
    
    const removeBtn = entry.querySelector('.remove-entry-btn');
    if (removeBtn) {
      if (prefix === 'Experience') removeBtn.setAttribute('onclick', `removeWorkExperience(${index})`);
      if (prefix === 'Education') removeBtn.setAttribute('onclick', `removeEducation(${index})`);
      if (prefix === 'Certification') removeBtn.setAttribute('onclick', `removeCertification(${index})`);
      if (prefix === 'Reference') removeBtn.setAttribute('onclick', `removeReference(${index})`);
    }
  });
  
  if (selector === '.experience-entry') workExperienceCount = entries.length;
  if (selector === '.education-entry') educationCount = entries.length;
  if (selector === '.certification-entry') certificationCount = entries.length;
  if (selector === '.reference-entry') referenceCount = entries.length;
}

function toggleCVUpload(show) {
  const uploadSection = document.getElementById('cvUploadSection');
  if (uploadSection) {
    uploadSection.style.display = show ? 'block' : 'none';
  }
}

function setupFileUploads() {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  
  fileInputs.forEach(input => {
    input.addEventListener('change', function() {
      const wrapper = this.closest('.file-upload-wrapper');
      const display = wrapper.querySelector('.file-upload-display span:first-of-type');
      
      if (this.files && this.files[0]) {
        const file = this.files[0];
        let isValid = true;
        
        // Validate file size based on input ID
        if (this.id === 'profilePhoto') {
          isValid = validateFileSize(file, 2, 'Profile photo');
        } else if (this.id === 'existingCV') {
          isValid = validateFileSize(file, 4, 'CV file');
        }
        
        if (isValid) {
          display.textContent = file.name;
          wrapper.classList.add('has-file');
        } else {
          // Clear the input if validation fails
          this.value = '';
          display.textContent = 'Click to upload or drag and drop';
          wrapper.classList.remove('has-file');
        }
      } else {
        display.textContent = 'Click to upload or drag and drop';
        wrapper.classList.remove('has-file');
      }
    });
  });
}

// ========== FILE CONVERSION TO BASE64 ==========
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========== FORM DATA COLLECTION ==========
async function collectFormData() {
  const formData = new FormData(document.getElementById('cvForm'));
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPackage = urlParams.get('package') || 'professional';
  const country = getCurrentCountry();
  
  const data = {
    selectedPackage: packages[selectedPackage] ? packages[selectedPackage].name : packages.professional.name,
    selectedCountry: country,
        // Coupon data
    couponCode: appliedCoupon ? appliedCoupon.code : '',
    couponApplied: appliedCoupon ? true : false,
    originalPrice: calculateOriginalPrice(selectedPackage, country),
    discountAmount: appliedCoupon ? calculateDiscount(selectedPackage, country) : 0,
    finalPrice: calculateFinalPrice(selectedPackage, country),
    fullName: formData.get('fullName') || '',
    email: formData.get('email') || '',
    phone: formData.get('phone') || '',
    address: formData.get('address') || '',
    linkedin: formData.get('linkedin') || '',
    portfolio: formData.get('portfolio') || '',
    professionalSummary: formData.get('professionalSummary') || '',
    applyingForJob: formData.get('applyingForJob') || 'no',
    targetJobTitle: formData.get('targetJobTitle') || '',
    targetJobDescription: formData.get('targetJobDescription') || '',
    technicalSkills: formData.get('technicalSkills') || '',
    softSkills: formData.get('softSkills') || '',
    languages: formData.get('languages') || '',
    interests: formData.get('interests') || '',
    hasExistingCV: formData.get('hasExistingCV') || 'no',
    additionalNotes: formData.get('additionalNotes') || '',
    workExperience: [],
    education: [],
    certifications: [],
    references: []
  };
  
// Handle Profile Photo upload - MAX 2MB
  const profilePhotoFile = formData.get('profilePhoto');
  if (profilePhotoFile && profilePhotoFile.size > 0) {
    // Validate file size (2MB limit)
    if (!validateFileSize(profilePhotoFile, 2, 'Profile photo')) {
      throw new Error('Profile photo exceeds 2MB limit');
    }
    
    const base64Data = await fileToBase64(profilePhotoFile);
    data.profilePhoto = {
      data: base64Data,
      name: profilePhotoFile.name,
      mimeType: profilePhotoFile.type
    };
  }
  /*Made by MD Touhidul Islam Kanon*/
  // Handle Existing CV upload - MAX 4MB
  const existingCVFile = formData.get('existingCV');
  if (existingCVFile && existingCVFile.size > 0) {
    // Validate file size (4MB limit)
    if (!validateFileSize(existingCVFile, 4, 'CV file')) {
      throw new Error('CV file exceeds 4MB limit');
    }
    
    const base64Data = await fileToBase64(existingCVFile);
    data.existingCV = {
      data: base64Data,
      name: existingCVFile.name,
      mimeType: existingCVFile.type
    };
  }
  
  // Collect all work experience entries
  const workEntries = document.querySelectorAll('.experience-entry');
  workEntries.forEach((entry) => {
    const title = formData.get(`workTitle_${entry.dataset.index}`);
    if (title) {
      const endDate = formData.get(`workEndDate_${entry.dataset.index}`);
      const isCurrent = formData.get(`workCurrent_${entry.dataset.index}`);
      
      data.workExperience.push({
        title: title,
        company: formData.get(`workCompany_${entry.dataset.index}`) || '',
        location: formData.get(`workLocation_${entry.dataset.index}`) || '',
        startDate: formData.get(`workStartDate_${entry.dataset.index}`) || '',
        endDate: (isCurrent || !endDate) ? 'Present' : endDate,
        description: formData.get(`workDescription_${entry.dataset.index}`) || ''
      });
    }
  });
  
  // Collect all education entries
  const eduEntries = document.querySelectorAll('.education-entry');
  eduEntries.forEach((entry) => {
    const degree = formData.get(`eduDegree_${entry.dataset.index}`);
    if (degree) {
      data.education.push({
        degree: degree,
        institution: formData.get(`eduInstitution_${entry.dataset.index}`) || '',
        location: formData.get(`eduLocation_${entry.dataset.index}`) || '',
        grade: formData.get(`eduGrade_${entry.dataset.index}`) || '',
        startYear: formData.get(`eduStartYear_${entry.dataset.index}`) || '',
        endYear: formData.get(`eduEndYear_${entry.dataset.index}`) || ''
      });
    }
  });
  
  // Collect all certification entries
  const certEntries = document.querySelectorAll('.certification-entry');
  certEntries.forEach((entry) => {
    const name = formData.get(`certName_${entry.dataset.index}`);
    if (name) {
      data.certifications.push({
        name: name,
        organization: formData.get(`certOrg_${entry.dataset.index}`) || '',
        date: formData.get(`certDate_${entry.dataset.index}`) || '',
        credentialId: formData.get(`certId_${entry.dataset.index}`) || ''
      });
    }
  });
  
  // Collect all reference entries
  const refEntries = document.querySelectorAll('.reference-entry');
  refEntries.forEach((entry) => {
    const name = formData.get(`refName_${entry.dataset.index}`);
    if (name) {
      data.references.push({
        name: name,
        title: formData.get(`refTitle_${entry.dataset.index}`) || '',
        email: formData.get(`refEmail_${entry.dataset.index}`) || '',
        phone: formData.get(`refPhone_${entry.dataset.index}`) || ''
      });
    }
  });
  
  return data;
}

// ========== FORM SUBMISSION ==========
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('.submit-btn');
  const originalBtnText = submitBtn.innerHTML;
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
    <style>@keyframes spin { to { transform: rotate(360deg); }}</style>
    Uploading files and submitting...
  `;
  
  try {
    const formDataObj = await collectFormData();
    
    console.log('Submitting data with files...');
    console.log('Data size:', JSON.stringify(formDataObj).length, 'bytes');
    
    // Send data via fetch to get the response with invoice ID
    const response = await fetch(APPSCRIPT_PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formDataObj)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Store the invoice ID from server response
      lastSubmissionData.invoiceId = result.invoiceId;
      lastSubmissionData.fullName = formDataObj.fullName;
      lastSubmissionData.phone = formDataObj.phone;
      
      console.log('Submission successful! Invoice ID:', result.invoiceId);

            // Track coupon usage in Firestore
      if (appliedCoupon) {
        await trackCouponUsage(result.invoiceId, formDataObj);
      }
      
      // Show success modal with the correct invoice ID
      showSuccessModal();
      
      // Reset form
      form.reset();
      
    } else {
      throw new Error(result.message || 'Submission failed');
    }
    
  } catch (error) {
    console.error('Submission error:', error);
    alert('There was an error submitting your form. Please try again or contact support.\n\nError: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

function showSuccessModal() {
  // Update Invoice ID in modal with the server-generated ID
  const invoiceIdElement = document.getElementById('modalInvoiceId');
  if (invoiceIdElement && lastSubmissionData.invoiceId) {
    invoiceIdElement.textContent = lastSubmissionData.invoiceId;
  }
  
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  window.location.href = 'index.html';
}

// WhatsApp confirmation redirect
function confirmOrderWhatsApp() {
  const invoiceId = lastSubmissionData.invoiceId || '-';
  const packageName = document.getElementById('modalPackageName').textContent || '-';
  const fullName = lastSubmissionData.fullName || '-';
  const phone = lastSubmissionData.phone || '-';
  
  // Get country and package info for price formatting
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPackage = urlParams.get('package') || 'professional';
  const country = getCurrentCountry();
  
  const originalPrice = calculateOriginalPrice(selectedPackage, country);
  const discount = appliedCoupon ? calculateDiscount(selectedPackage, country) : 0;
  const finalPrice = calculateFinalPrice(selectedPackage, country);
  
  // Format price line
  let priceMessage = `Price: ${formatPrice(originalPrice, country)}`;
  
  if (appliedCoupon && discount > 0) {
    // Add strikethrough effect using Unicode combining characters
    const originalPriceStr = formatPrice(originalPrice, country);
    const strikethroughPrice = originalPriceStr.split('').join('\u0336') + '\u0336'; // Adds strikethrough
    priceMessage = `Price: ${strikethroughPrice} ${formatPrice(finalPrice, country)} (Discounted)`;
  }
  
  // Create WhatsApp message
  const message = `Invoice ID: ${invoiceId}
Package Name: ${packageName}
${priceMessage}
Full Name: ${fullName}
Phone: ${phone}

Hi, Please confirm my order.`;
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // WhatsApp URL
  const whatsappUrl = `https://wa.me/628112087181?text=${encodedMessage}`;
  
  // Open WhatsApp in new tab
  window.open(whatsappUrl, '_blank');
}

// ========================================== //
// WHATSAPP SUPPORT WIDGET JAVASCRIPT
// ADD THIS TO THE END OF form-script.js
// ========================================== //

// WhatsApp Widget State
let isOpen = false;
    let hasNewMessage = true;

    function toggleWidget() {
      const card = document.getElementById('whatsappCard');
      const floatBtn = document.getElementById('whatsappFloatBtn');
      const badge = document.getElementById('whatsappBadge');
      const tooltip = document.getElementById('whatsappTooltip');
      
      isOpen = !isOpen;
      
      if (isOpen) {
        card.classList.add('active');
        floatBtn.classList.add('active');
        badge.classList.add('hidden');
        tooltip.classList.remove('show');
        hasNewMessage = false;
      } else {
        card.classList.remove('active');
        floatBtn.classList.remove('active');
      }
    }

    function openWhatsApp() {
      const phoneNumber = '628112087181';
      const message = encodeURIComponent('Hi! I need help with form submission on DraftaCV.');
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
      
      document.getElementById('whatsappBadge').classList.add('hidden');
      
      setTimeout(() => {
        toggleWidget();
      }, 300);
    }

    // Tooltip hover
    const floatBtn = document.getElementById('whatsappFloatBtn');
    const tooltip = document.getElementById('whatsappTooltip');

    floatBtn.addEventListener('mouseenter', () => {
      if (!isOpen) {
        tooltip.classList.add('show');
      }
    });

    floatBtn.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });

    // Close on outside click
    document.addEventListener('click', (event) => {
      const widget = document.getElementById('whatsappWidget');
      if (isOpen && !widget.contains(event.target)) {
        toggleWidget();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen) {
        toggleWidget();
      }
    });

// ========== END OF WHATSAPP WIDGET SCRIPT ==========

// ========================================== 
// COUPON/PROMO CODE SYSTEM
// ========================================== 

// Store applied coupon data
let appliedCoupon = null;

// Apply coupon function
async function applyCoupon() {
  const couponInput = document.getElementById('couponCode');
  const couponCode = couponInput.value.trim().toUpperCase();
  const statusDiv = document.getElementById('couponStatus');
  const applyBtn = document.querySelector('.apply-coupon-btn');
  
  // Validation
  if (!couponCode) {
    showCouponStatus('Please enter a coupon code', 'error');
    return;
  }
  
  // Show loading state
  applyBtn.disabled = true;
  applyBtn.innerHTML = 'Checking...';
  showCouponStatus('Validating coupon...', 'loading');
  
  try {
    // Get coupon from Firestore
    const couponDoc = await db.collection('coupons').doc(couponCode).get();
    
    if (!couponDoc.exists) {
      showCouponStatus('Invalid coupon code', 'error');
      applyBtn.disabled = false;
      applyBtn.innerHTML = 'Apply';
      return;
    }
    
    const couponData = couponDoc.data();
    
    // Validate coupon
    const validation = validateCoupon(couponData);
    
    if (!validation.valid) {
      showCouponStatus(validation.message, 'error');
      applyBtn.disabled = false;
      applyBtn.innerHTML = 'Apply';
      return;
    }
    
    // Apply the coupon
    appliedCoupon = {
      code: couponCode,
      ...couponData
    };
    
    // Calculate and update price
    updatePriceBreakdown();
    
    // Show success message
    showCouponStatus(`✓ Coupon "${couponCode}" applied successfully!`, 'success');
    
    // Update button
    applyBtn.innerHTML = 'Applied ✓';
    applyBtn.disabled = true;
    couponInput.disabled = true;
    
    // Add remove button
    if (!document.getElementById('removeCouponBtn')) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.id = 'removeCouponBtn';
      removeBtn.className = 'remove-coupon-btn';
      removeBtn.innerHTML = 'Remove';
      removeBtn.onclick = removeCoupon;
      applyBtn.parentNode.appendChild(removeBtn);
    }
    
  } catch (error) {
    console.error('Error applying coupon:', error);
    showCouponStatus('Error validating coupon. Please try again.', 'error');
    applyBtn.disabled = false;
    applyBtn.innerHTML = 'Apply';
  }
}

// Validate coupon
function validateCoupon(couponData) {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPackage = urlParams.get('package') || 'professional';
  const userCountry = getCurrentCountry();
  
  // Check if active
  if (couponData.status !== 'active') {
    return { valid: false, message: 'This coupon is no longer active' };
  }
  
  // Check expiry date
  const now = new Date();
  const expiryDate = couponData.expiryDate.toDate();
  if (now > expiryDate) {
    return { valid: false, message: 'This coupon has expired' };
  }
  
  // Check usage limit
  if (couponData.currentUses >= couponData.maxUses) {
    return { valid: false, message: 'This coupon has reached its usage limit' };
  }
  
  // Check if valid for selected package
  const validFor = couponData.validFor || [];
  if (!validFor.includes('all') && !validFor.includes(selectedPackage)) {
    return { valid: false, message: 'This coupon is not valid for the selected package' };
  }
  
  // Check if valid for user's country
  const validCountries = couponData.validCountries || [];
  if (validCountries.length > 0 && !validCountries.includes(userCountry)) {
    return { valid: false, message: 'This coupon is not valid in your country' };
  }
  
  return { valid: true };
}

// Update price breakdown
function updatePriceBreakdown() {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPackage = urlParams.get('package') || 'professional';
  const country = getCurrentCountry();
  const packageData = packages[selectedPackage] || packages.professional;
  
  // Get original price (remove currency symbol and convert to number)
  const priceString = packageData.price[country];
  const originalPrice = parseFloat(priceString.replace(/[^\d]/g, ''));
  
  let discount = 0;
  let finalPrice = originalPrice;
  
  if (appliedCoupon) {
    // Calculate discount
    if (appliedCoupon.type === 'percentage') {
      discount = Math.round((originalPrice * appliedCoupon.value) / 100);
    } else if (appliedCoupon.type === 'fixed') {
      // Handle fixed discount (object with BD/ID keys or single number)
      if (typeof appliedCoupon.value === 'object') {
        discount = appliedCoupon.value[country] || 0;
      } else {
        discount = appliedCoupon.value;
      }
    }
    
    finalPrice = originalPrice - discount;
    
    // Show discount row
    document.getElementById('discountRow').style.display = 'flex';
    document.getElementById('discountLabel').textContent = appliedCoupon.code;
    document.getElementById('breakdownDiscount').textContent = `-${formatPrice(discount, country)}`;
  } else {
    // Hide discount row
    document.getElementById('discountRow').style.display = 'none';
  }
  
  // Update display
  document.getElementById('breakdownPackage').textContent = packageData.name;
  document.getElementById('breakdownOriginal').textContent = formatPrice(originalPrice, country);
  document.getElementById('breakdownFinal').textContent = formatPrice(finalPrice, country);
  // ========== ADD THIS NEW CODE BELOW ========== 
  // Update package reminder section (before submit button)
  updatePackageReminder(packageData.name, originalPrice, discount, finalPrice, country);
}

// Update package reminder in submit section
function updatePackageReminder(packageName, originalPrice, discount, finalPrice, country) {
  const packageReminderElement = document.querySelector('.package-reminder');
  
  if (packageReminderElement) {
    if (appliedCoupon && discount > 0) {
      // Show with discount
      packageReminderElement.innerHTML = `
        Your selected package: <strong>${packageName}</strong> - 
        <span style="text-decoration: line-through; color: #888;">${formatPrice(originalPrice, country)}</span> 
        <strong style="color: #48bb78;">${formatPrice(finalPrice, country)}</strong> 
        <span style="color: #48bb78; font-size: 0.875rem;">(${appliedCoupon.code} applied)</span>
      `;
    } else {
      // Show without discount (original)
      packageReminderElement.innerHTML = `
        Your selected package: <strong>${packageName}</strong> - <strong>${formatPrice(originalPrice, country)}</strong>
      `;
    }
  }
  
  // Also update the modal and other price displays
  const submitPackagePrice = document.getElementById('submitPackagePrice');
  if (submitPackagePrice) {
    if (appliedCoupon && discount > 0) {
      submitPackagePrice.innerHTML = `
        <span style="text-decoration: line-through; color: #888;">${formatPrice(originalPrice, country)}</span> 
        ${formatPrice(finalPrice, country)}
      `;
    } else {
      submitPackagePrice.textContent = formatPrice(originalPrice, country);
    }
  }
}

// Format price with currency
function formatPrice(amount, country) {
  if (country === 'BD') {
    return `৳${amount.toLocaleString('en-BD')}`;
  } else {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
}

// Remove coupon
function removeCoupon() {
  appliedCoupon = null;
  
  // Reset input
  const couponInput = document.getElementById('couponCode');
  const applyBtn = document.querySelector('.apply-coupon-btn');
  
  couponInput.value = '';
  couponInput.disabled = false;
  applyBtn.disabled = false;
  applyBtn.innerHTML = 'Apply';
  
  // Remove the remove button
  const removeBtn = document.getElementById('removeCouponBtn');
  if (removeBtn) {
    removeBtn.remove();
  }
  
  // Hide status message
  document.getElementById('couponStatus').style.display = 'none';
  
  // Update price
  updatePriceBreakdown();
}

// Show coupon status message
function showCouponStatus(message, type) {
  const statusDiv = document.getElementById('couponStatus');
  statusDiv.style.display = 'flex';
  statusDiv.className = `coupon-status ${type}`;
  
  let icon = '';
  if (type === 'success') {
    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  } else if (type === 'error') {
    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else if (type === 'loading') {
    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>';
  }
  
  statusDiv.innerHTML = `${icon}<span>${message}</span>`;
}
// Calculate original price
function calculateOriginalPrice(packageKey, country) {
  const packageData = packages[packageKey] || packages.professional;
  const priceString = packageData.price[country];
  return parseFloat(priceString.replace(/[^\d]/g, ''));
}

// Calculate discount amount
function calculateDiscount(packageKey, country) {
  if (!appliedCoupon) return 0;
  
  const originalPrice = calculateOriginalPrice(packageKey, country);
  
  if (appliedCoupon.type === 'percentage') {
    return Math.round((originalPrice * appliedCoupon.value) / 100);
  } else if (appliedCoupon.type === 'fixed') {
    if (typeof appliedCoupon.value === 'object') {
      return appliedCoupon.value[country] || 0;
    } else {
      return appliedCoupon.value;
    }
  }
  
  return 0;
}

// Calculate final price
function calculateFinalPrice(packageKey, country) {
  const originalPrice = calculateOriginalPrice(packageKey, country);
  const discount = calculateDiscount(packageKey, country);
  return originalPrice - discount;
}

// Track coupon usage in Firestore
async function trackCouponUsage(invoiceId, formData) {
  try {
    const country = getCurrentCountry();
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPackage = urlParams.get('package') || 'professional';
    const packageData = packages[selectedPackage] || packages.professional;
    
    // Create usage record
    const usageData = {
      couponCode: appliedCoupon.code,
      customerName: formData.fullName,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      packageSelected: packageData.name,
      originalPrice: {
        currency: country,
        amount: calculateOriginalPrice(selectedPackage, country)
      },
      discountAmount: {
        currency: country,
        amount: calculateDiscount(selectedPackage, country)
      },
      finalPrice: {
        currency: country,
        amount: calculateFinalPrice(selectedPackage, country)
      },
      country: country,
      usedAt: firebase.firestore.FieldValue.serverTimestamp(),
      invoiceId: invoiceId
    };
    
    // Add to coupon_usage collection
    await db.collection('coupon_usage').add(usageData);
    
    // Increment coupon's currentUses
    await db.collection('coupons').doc(appliedCoupon.code).update({
      currentUses: firebase.firestore.FieldValue.increment(1)
    });
    
    console.log('Coupon usage tracked successfully');
    
  } catch (error) {
    console.error('Error tracking coupon usage:', error);
    // Don't block form submission if tracking fails
  }
}

// Initialize price breakdown on page load
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for country detection
  setTimeout(() => {
    updatePriceBreakdown();
  }, 200);
});

// ========================================== 
// END OF COUPON SYSTEM
// ========================================== 

// ========== END OF SCRIPT ==========


// ========== END OF SCRIPT ==========
