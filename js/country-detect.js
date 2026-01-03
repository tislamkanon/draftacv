// Country Detection and Currency Switching for DraftaCV
// Supports Bangladesh (BD) and Indonesia (ID)

// Country-specific pricing data
const countryPricing = {
  BD: {
    currency: '৳',
    currencyName: 'BDT',
    basic: '999',
    professional: '1,999',
    executive: '3,999',
    custom: 'Custom',
    phone: '+880 1234 567890',
    whatsapp: '628112087181',
    phoneDisplay: '(+62) 8112087181'
  },
  ID: {
    currency: 'Rp',
    currencyName: 'IDR',
    basic: '129,000',
    professional: '259,000',
    executive: '519,000',
    custom: 'Custom',
    phone: '+62 8112087181',
    whatsapp: '628112087181',
    phoneDisplay: '(+62) 8112087181'
  }
};

// Country-specific form examples
const countryExamples = {
  BD: {
    fullName: 'e.g., John Doe',
    email: 'e.g., john@example.com',
    phone: 'e.g., +880 1234 567890',
    address: 'e.g., 123 Main Street, Dhaka, Bangladesh',
    linkedin: 'e.g., https://linkedin.com/in/johndoe',
    portfolio: 'e.g., https://johndoe.com',
    jobTitle: 'e.g., Senior Software Engineer',
    company: 'e.g., Tech Corp Ltd.',
    location: 'e.g., Dhaka, Bangladesh',
    degree: 'e.g., Bachelor of Science in Computer Science',
    institution: 'e.g., University of Dhaka',
    eduLocation: 'e.g., Dhaka, Bangladesh',
    gpa: 'e.g., 3.8 / 4.0',
    certName: 'e.g., AWS Solutions Architect',
    certOrg: 'e.g., Amazon Web Services',
    certId: 'e.g., ABC123XYZ',
    refName: 'e.g., Dr. Jane Smith',
    refTitle: 'e.g., Senior Manager at Tech Corp',
    refEmail: 'e.g., jane.smith@techcorp.com',
    refPhone: 'e.g., +880 1234 567890',
    technicalSkills: 'e.g., JavaScript, Python, React, Node.js, SQL, AWS, Git...',
    softSkills: 'e.g., Leadership, Communication, Problem Solving, Team Management...',
    languages: 'e.g., English (Fluent), Bengali (Native), Hindi (Conversational)...',
    interests: 'e.g., Reading, Photography, Open Source Contributing, Traveling, Playing Chess...',
    targetJobTitle: 'e.g., Senior Software Engineer',
    targetJobDescription: 'e.g., Paste the job description here or describe the role requirements...'
  },
  ID: {
    fullName: 'e.g., Budi Santoso',
    email: 'e.g., budi@example.com',
    phone: 'e.g., +62 812 3456 7890',
    address: 'e.g., Jl. Sudirman No. 123, Jakarta, Indonesia',
    linkedin: 'e.g., https://linkedin.com/in/budisantoso',
    portfolio: 'e.g., https://budisantoso.com',
    jobTitle: 'e.g., Senior Software Engineer',
    company: 'e.g., PT Teknologi Indonesia',
    location: 'e.g., Jakarta, Indonesia',
    degree: 'e.g., Sarjana Teknik Informatika',
    institution: 'e.g., Universitas Indonesia',
    eduLocation: 'e.g., Depok, Indonesia',
    gpa: 'e.g., 3.8 / 4.0',
    certName: 'e.g., AWS Solutions Architect',
    certOrg: 'e.g., Amazon Web Services',
    certId: 'e.g., ABC123XYZ',
    refName: 'e.g., Dr. Siti Rahayu',
    refTitle: 'e.g., Senior Manager di PT Teknologi',
    refEmail: 'e.g., siti.rahayu@teknologi.co.id',
    refPhone: 'e.g., +62 812 3456 7890',
    technicalSkills: 'e.g., JavaScript, Python, React, Node.js, SQL, AWS, Git...',
    softSkills: 'e.g., Leadership, Communication, Problem Solving, Team Management...',
    languages: 'e.g., English (Fluent), Bahasa Indonesia (Native), Japanese (Basic)...',
    interests: 'e.g., Reading, Photography, Open Source Contributing, Traveling, Playing Chess...',
    targetJobTitle: 'e.g., Senior Software Engineer',
    targetJobDescription: 'e.g., Tempelkan deskripsi pekerjaan di sini atau jelaskan persyaratan peran...'
  }
};

// Default country
/*let currentCountry = 'ID';*/

// Detect country using IP geolocation
async function detectCountry() {
  try {
    // Try multiple IP geolocation services for reliability
    const apis = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
      'https://ipwho.is/'
    ];
    
    for (const api of apis) {
      try {
        const response = await fetch(api, { timeout: 5000 });
        if (response.ok) {
          const data = await response.json();
          const countryCode = data.country_code || data.countryCode || data.country;
          
          if (countryCode === 'ID') {
            return 'ID';
          } else if (countryCode === 'BD') {
            return 'BD';
          }
        }
      } catch (e) {
        console.log(`API ${api} failed, trying next...`);
      }
    }
  } catch (error) {
    console.log('Country detection failed, using default:', error);
  }
  
  // Default to BD if detection fails
  return 'BD';
}

// Get saved country preference from localStorage
function getSavedCountry() {
  return localStorage.getItem('draftacv_country');
}

// Save country preference to localStorage
function saveCountry(country) {
  localStorage.setItem('draftacv_country', country);
}

// Update all pricing displays on the page
function updatePricing(country) {
  const pricing = countryPricing[country];
  
  // Update pricing cards on index page
  const pricingCards = document.querySelectorAll('.pricing-card');
  pricingCards.forEach(card => {
    const plan = card.dataset.plan;
    const currencyEl = card.querySelector('.currency');
    const amountEl = card.querySelector('.amount');
    
    if (currencyEl && amountEl && pricing[plan]) {
      currencyEl.textContent = pricing.currency;
      amountEl.textContent = pricing[plan];
    }
  });
  
  // Update any price displays with data-price-bd/data-price-id attributes
  document.querySelectorAll('[data-price-bd][data-price-id]').forEach(el => {
    const bdPrice = el.getAttribute('data-price-bd');
    const idPrice = el.getAttribute('data-price-id');
    el.textContent = country === 'ID' ? idPrice : bdPrice;
  });
  
  // Update FAQ pricing mentions
  const faqAnswers = document.querySelectorAll('.faq-answer p');
  faqAnswers.forEach(p => {
    if (p.textContent.includes('৳') || p.textContent.includes('Rp')) {
      // Replace BD pricing with ID pricing or vice versa
      if (country === 'ID') {
        p.innerHTML = p.innerHTML
          .replace(/৳999/g, 'Rp 129,000')
          .replace(/৳1,999/g, 'Rp 259,000')
          .replace(/৳3,999/g, 'Rp 519,000');
      } else {
        p.innerHTML = p.innerHTML
          .replace(/Rp 129,000/g, '৳999')
          .replace(/Rp 259,000/g, '৳1,999')
          .replace(/Rp 519,000/g, '৳3,999');
      }
    }
  });
}

// Update form placeholders based on country
function updateFormExamples(country) {
  const examples = countryExamples[country];
  
  // Map of input IDs/names to example keys
  const inputMappings = {
    'fullName': 'fullName',
    'email': 'email',
    'phone': 'phone',
    'address': 'address',
    'linkedin': 'linkedin',
    'portfolio': 'portfolio',
    'technicalSkills': 'technicalSkills',
    'softSkills': 'softSkills',
    'languages': 'languages',
    'interests': 'interests',
    'targetJobTitle': 'targetJobTitle',
    'targetJobDescription': 'targetJobDescription'
  };
  /*Made by MD Touhidul Islam Kanon*/
  // Update input placeholders
  Object.keys(inputMappings).forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input && examples[inputMappings[inputId]]) {
      input.placeholder = examples[inputMappings[inputId]];
    }
  });
  
  // Update work experience placeholders
  document.querySelectorAll('[name^="workTitle_"]').forEach(el => {
    el.placeholder = examples.jobTitle;
  });
  document.querySelectorAll('[name^="workCompany_"]').forEach(el => {
    el.placeholder = examples.company;
  });
  document.querySelectorAll('[name^="workLocation_"]').forEach(el => {
    el.placeholder = examples.location;
  });
  
  // Update education placeholders
  document.querySelectorAll('[name^="eduDegree_"]').forEach(el => {
    el.placeholder = examples.degree;
  });
  document.querySelectorAll('[name^="eduInstitution_"]').forEach(el => {
    el.placeholder = examples.institution;
  });
  document.querySelectorAll('[name^="eduLocation_"]').forEach(el => {
    el.placeholder = examples.eduLocation;
  });
  document.querySelectorAll('[name^="eduGrade_"]').forEach(el => {
    el.placeholder = examples.gpa;
  });
  
  // Update certification placeholders
  document.querySelectorAll('[name^="certName_"]').forEach(el => {
    el.placeholder = examples.certName;
  });
  document.querySelectorAll('[name^="certOrg_"]').forEach(el => {
    el.placeholder = examples.certOrg;
  });
  document.querySelectorAll('[name^="certId_"]').forEach(el => {
    el.placeholder = examples.certId;
  });
  
  // Update reference placeholders
  document.querySelectorAll('[name^="refName_"]').forEach(el => {
    el.placeholder = examples.refName;
  });
  document.querySelectorAll('[name^="refTitle_"]').forEach(el => {
    el.placeholder = examples.refTitle;
  });
  document.querySelectorAll('[name^="refEmail_"]').forEach(el => {
    el.placeholder = examples.refEmail;
  });
  document.querySelectorAll('[name^="refPhone_"]').forEach(el => {
    el.placeholder = examples.refPhone;
  });
}

// Update the country toggle UI
function updateToggleUI(country) {
  const toggle = document.getElementById('countryToggle');
  const bdLabel = document.querySelector('.country-label-bd');
  const idLabel = document.querySelector('.country-label-id');
  
  if (toggle) {
    toggle.checked = country === 'ID';
  }
  
  if (bdLabel && idLabel) {
    bdLabel.classList.toggle('active', country === 'BD');
    idLabel.classList.toggle('active', country === 'ID');
  }
}

// Switch country and update all displays
function switchCountry(country) {
  currentCountry = country;
  saveCountry(country);
  updatePricing(country);
  updateToggleUI(country);
  
  // Update form if on form page
  if (document.getElementById('cvForm')) {
    updateFormExamples(country);
    updateFormPricing(country);
  }
}

// Update form pricing display
function updateFormPricing(country) {
  const pricing = countryPricing[country];
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPlan = urlParams.get('package') || 'professional';
  
  const priceDisplays = [
    'selectedPackagePrice',
    'submitPackagePrice'
  ];
  
  priceDisplays.forEach(id => {
    const el = document.getElementById(id);
    if (el && pricing[selectedPlan]) {
      el.textContent = `${pricing.currency}${pricing[selectedPlan]}`;
    }
  });
}

// Handle toggle change
function handleCountryToggle(event) {
  const newCountry = event.target.checked ? 'ID' : 'BD';
  switchCountry(newCountry);
}

// Get current country
function getCurrentCountry() {
  return currentCountry;
}

// Get pricing for current country
function getCurrentPricing() {
  return countryPricing[currentCountry];
}

// Get examples for current country
function getCurrentExamples() {
  return countryExamples[currentCountry];
}

// Initialize country detection and UI
async function initCountryDetection() {
  // First check if user has a saved preference
  const savedCountry = getSavedCountry();
  
  if (savedCountry && (savedCountry === 'BD' || savedCountry === 'ID')) {
    currentCountry = savedCountry;
  } else {
    // Detect country from IP
    currentCountry = await detectCountry();
    saveCountry(currentCountry);
  }
  
  // Update UI
  updatePricing(currentCountry);
  updateToggleUI(currentCountry);
  
  // Update form if on form page
  if (document.getElementById('cvForm')) {
    updateFormExamples(currentCountry);
    updateFormPricing(currentCountry);
  }
  
  // Setup toggle event listener
  const toggle = document.getElementById('countryToggle');
  if (toggle) {
    toggle.addEventListener('change', handleCountryToggle);
  }
  
  console.log('Country detection initialized:', currentCountry);
}

// Export functions for use in other scripts
window.countryDetect = {
  init: initCountryDetection,
  switch: switchCountry,
  getCurrent: getCurrentCountry,
  getPricing: getCurrentPricing,
  getExamples: getCurrentExamples,
  updateFormExamples: updateFormExamples
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initCountryDetection);
