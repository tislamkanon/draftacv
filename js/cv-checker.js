// ===== CV CHECKER - AI-POWERED ATS ANALYSIS =====
// Uses Groq API for ultra-fast intelligent CV analysis

// ===== CONFIGURATION =====
// *** SECURITY CHANGE: API key removed from frontend ***
const NETLIFY_FUNCTIONS_BASE = "https://scansentry-proxy.netlify.app/.netlify/functions";

// ===== PDF.JS LIBRARY =====
const pdfjsLib = window['pdfjs-dist/build/pdf'];

document.addEventListener("DOMContentLoaded", () => {
  // Initialize PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  // ===== DOM ELEMENTS =====
  const uploadDropzone = document.getElementById("uploadDropzone");
  const fileInput = document.getElementById("fileInput");
  const filePreview = document.getElementById("filePreview");
  const fileName = document.getElementById("fileName");
  const fileSize = document.getElementById("fileSize");
  const fileRemove = document.getElementById("fileRemove");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const uploadSection = document.getElementById("uploadSection");
  const loadingSection = document.getElementById("loadingSection");
  const resultsSection = document.getElementById("resultsSection");
  const recheckBtn = document.getElementById("recheckBtn");

  // State
  let selectedFile = null;
  let extractedText = "";

  // ===== NAVBAR SCROLL EFFECT =====
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 20) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

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

  // ===== FILE UPLOAD =====
  // Click to upload
  uploadDropzone.addEventListener("click", () => {
    fileInput.click();
  });

  // Drag and drop
  uploadDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadDropzone.classList.add("dragover");
  });

  uploadDropzone.addEventListener("dragleave", () => {
    uploadDropzone.classList.remove("dragover");
  });

  uploadDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Remove file
  fileRemove.addEventListener("click", (e) => {
    e.stopPropagation();
    resetFileUpload();
  });

  function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.");
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadDropzone.style.display = "none";
    filePreview.style.display = "flex";
    analyzeBtn.disabled = false;
  }

  function resetFileUpload() {
    selectedFile = null;
    extractedText = "";
    fileInput.value = "";
    uploadDropzone.style.display = "flex";
    filePreview.style.display = "none";
    analyzeBtn.disabled = true;
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===== ANALYZE BUTTON =====
  analyzeBtn.addEventListener("click", async () => {
    // *** SECURITY CHANGE: Removed API key check and reference ***
    
    if (!selectedFile) {
      alert("Please upload a CV file first.");
      return;
    }

    // *** No API key passed here ***
    await analyzeCV();
  });

  // ===== RECHECK BUTTON =====
  recheckBtn.addEventListener("click", () => {
    resultsSection.style.display = "none";
    uploadSection.style.display = "block";
    resetFileUpload();
    window.scrollTo({ top: uploadSection.offsetTop - 100, behavior: "smooth" });
  });

  // ===== CV ANALYSIS =====
  // *** SECURITY CHANGE: Removed apiKey parameter ***
  async function analyzeCV() { 
    showLoading();

    try {
      // Step 1: Extract text
      updateLoadingStep(1, "Extracting text from document...");
      extractedText = await extractTextFromFile(selectedFile);
      
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error("Could not extract sufficient text from the document. Please ensure the PDF is not image-based or password protected.");
      }

      // Step 2: Analyze format
      updateLoadingStep(2, "Analyzing document format...");
      await sleep(500);

      // Step 3: AI Analysis
      updateLoadingStep(3, "AI evaluation in progress...");
      // *** No API key passed here ***
      const analysisResult = await callGroqAPI(extractedText);

      // Step 4: Generate report
      updateLoadingStep(4, "Generating your report...");
      await sleep(500);

      // Show results
      displayResults(analysisResult);

    } catch (error) {
      console.error("Analysis error:", error);
      hideLoading();
      alert("Error analyzing CV: " + error.message);
    }
  }

  // ===== TEXT EXTRACTION =====
  async function extractTextFromFile(file) {
    if (file.type === 'application/pdf') {
      return await extractTextFromPDF(file);
    } else {
      // For DOC/DOCX, we'll need to handle differently
      // For now, show a message about PDF being preferred
      throw new Error("For best results, please upload a PDF file. DOC/DOCX support coming soon.");
    }
  }

  async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    
    return fullText;
  }

  // ===== GROQ API CALL (NOW SECURE VIA NETLIFY PROXY) =====
  // *** SECURITY CHANGE: Removed apiKey parameter ***
  async function callGroqAPI(cvText) {
    const prompt = buildATSAnalysisPrompt(cvText);
    
    // The target is YOUR secure Netlify function, not the Groq API directly!
    const PROXY_ENDPOINT = `${NETLIFY_FUNCTIONS_BASE}/groq-proxy`;

    // Using the current recommended Groq model
    const GROQ_MODEL = "llama-3.3-70b-versatile"; 

    const payload = {
        model: GROQ_MODEL, 
        messages: [{
          role: "user",
          content: prompt
        }],
        temperature: 0.3,
        top_p: 0.95,
        // Groq/OpenAI uses 'max_tokens' instead of 'maxOutputTokens'
        max_tokens: 4096,
    };

    // *** SECURITY CHANGE: Removed Authorization header with API key ***
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // The Netlify function will securely add the 'Authorization' header 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Assume the Netlify proxy function returns error details
      const errorData = await response.json().catch(() => ({})); 
      throw new Error(errorData.error?.message || `AI analysis failed: Proxy status ${response.status}`);
    }

    const data = await response.json();
    
    // Groq/OpenAI response structure check
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Invalid response from AI (Groq proxy)");
    }

    const responseText = data.choices[0].message.content;
    
    // Parse JSON from response
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Could not parse AI response");
    } catch (parseError) {
      console.error("Parse error:", parseError, "Response:", responseText);
      throw new Error("Failed to parse AI analysis results");
    }
  }
  /*Made by MD Touhidul Islam Kanon*/
  // ===== ATS ANALYSIS PROMPT (ULTRA-STRICT VERSION) =====
  function buildATSAnalysisPrompt(cvText) {
    return `You are a STRICT ATS (Applicant Tracking System) parser simulator. Your job is to analyze CVs exactly like real ATS software would - with ZERO tolerance for formatting issues that cause parsing failures.

## CRITICAL CONTEXT: 
Real ATS systems are EXTREMELY sensitive to formatting. A CV that looks beautiful to humans often scores TERRIBLY in ATS because the software cannot parse it correctly. Clean extracted text does NOT mean ATS-compatible - the original PDF structure matters enormously.

## PARSING FAILURE INDICATORS IN EXTRACTED TEXT:
Analyze the text carefully for these RED FLAGS that indicate ATS parsing failure:

1. **Fragmented/Jumbled Text Flow:**
   - Sections appearing out of order (e.g., contact info in middle, skills before experience)
   - Text from different sections mixed together
   - Bullet points separated from their content
   - Dates appearing far from their job titles
   - Random spacing or line breaks mid-sentence

2. **Missing Standard Structure:**
   - No clear section headers like "EXPERIENCE", "EDUCATION", "SKILLS"
   - Creative/unusual headers like "My Journey", "What I Bring", "Tech Arsenal"
   - Sections that can't be clearly identified
   - Information scattered without logical grouping

3. **Poor Contact Information Parsing:**
   - Email/phone appearing in wrong locations
   - Contact info mixed with other content
   - Multiple fragments of contact details scattered throughout

4. **Visual Formatting Artifacts:**
   - Excessive spacing between words (indicates column layout)
   - Text appearing in unusual order (sidebar content mixed with main)
   - Repeated headers or footers in text
   - Disconnected bullet points or numbers

5. **Content Density Issues:**
   - Very short lines followed by very long lines (column layout indicator)
   - Large gaps in narrative flow
   - Incomplete sentences or orphaned words

## MANDATORY SCORING RULES (ENFORCE STRICTLY):

**AUTOMATIC SCORE CAPS:**
- If text flow is jumbled/fragmented: MAX SCORE = 45
- If sections are unclear or non-standard: MAX SCORE = 50
- If contact info is scattered/unclear: MAX SCORE = 55
- If bullet points are disconnected: MAX SCORE = 60
- If ANY creative section headers detected: MAX SCORE = 65
- If skills appear as disconnected words (progress bar indicator): MAX SCORE = 40

**BASELINE ASSUMPTIONS (Unless clearly contradicted by perfect text flow):**
- Assume 70% of CVs use multi-column layouts (PENALTY: -30 points)
- Assume 60% use graphics/icons/photos (PENALTY: -25 points)
- Assume 50% use tables for education/skills (PENALTY: -20 points)
- Assume 40% use colored backgrounds (PENALTY: -15 points)

**SCORING FORMULA:**
Start with 100, then:
- Subtract penalties for detected issues
- If text extraction quality is poor: subtract additional 20-30 points
- If fewer than 4 standard sections clearly identified: subtract 15 points
- If achievements lack quantifiable metrics: subtract 10 points
- If contact info not in first 5 lines: subtract 15 points

**FINAL SCORE VALIDATION:**
- Score 80+: ONLY if text is perfectly structured + all standard sections clear + zero formatting issues
- Score 70-79: Acceptable text flow with minor issues
- Score 50-69: Text shows some parsing problems
- Score 30-49: Significant parsing issues detected
- Score 0-29: Severe parsing failure, unusable by ATS

## CV TEXT TO ANALYZE:
"""
${cvText.substring(0, 8000)}
"""

## REQUIRED ANALYSIS APPROACH:

1. **Text Quality Assessment (Do First):**
   - Is the text flowing in logical top-to-bottom order?
   - Are sections clearly separated and identifiable?
   - Is contact info cleanly at the top?
   - Are job titles, companies, dates in proper sequence?
   - Rate: PERFECT / GOOD / POOR / FAILED

2. **Structure Identification:**
   - Count how many standard sections you can clearly identify
   - Flag any creative/non-standard headers
   - Note if sections blend together

3. **Content Parsing:**
   - Can you extract job titles and dates clearly?
   - Are achievements quantified with numbers?
   - Is there a professional summary?

4. **Apply Penalties:**
   - Start with assumption of formatting issues
   - Add penalties for each confirmed problem
   - Only reduce penalties if text is EXCEPTIONALLY clean

## OUTPUT FORMAT:

Return ONLY valid JSON:

{
  "score": <number 0-100>,
  "scoreCategory": "excellent" | "good" | "needs_improvement" | "poor",
  "isATSCompatible": <boolean>,
  "formatAnalysis": {
    "layout": {
      "status": "pass" | "warning" | "fail",
      "message": "Detailed explanation with specific evidence from text"
    },
    "sections": {
      "status": "pass" | "warning" | "fail",
      "message": "List which sections were clearly identifiable"
    },
    "contactInfo": {
      "status": "pass" | "warning" | "fail",
      "message": "Where contact info appears and how cleanly"
    },
    "formatting": {
      "status": "pass" | "warning" | "fail",
      "message": "Text flow quality and parsing indicators"
    },
    "keywords": {
      "status": "pass" | "warning" | "fail",
      "message": "Keyword density and relevance"
    }
  },
  "detectedSections": ["Array of ONLY standard section names found"],
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "issue": "Specific problem with evidence",
      "impact": "How this breaks ATS parsing"
    }
  ],
  "improvements": [
    {
      "priority": "high" | "medium" | "low",
      "suggestion": "Specific actionable fix",
      "benefit": "How this improves ATS score"
    }
  ],
  "recommendedPackage": {
    "package": "basic" | "professional" | "executive",
    "reason": "Honest assessment based on detected issues"
  },
  "summary": "2-3 sentence honest assessment of ATS compatibility"
}

## REMEMBER:
- Be HARSH and REALISTIC like actual ATS software
- Clean extracted text ≠ ATS compatible
- Most designer-made CVs score 30-50, not 70-80
- Only truly simple, single-column, standard CVs score 80+
- Your job is to HELP users by being HONEST about ATS failures

Return ONLY the JSON object.`;
  }

  // ===== DISPLAY RESULTS =====
  function displayResults(results) {
    hideLoading();
    resultsSection.style.display = "block";
    
    // Scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Animate score
    animateScore(results.score, results.scoreCategory);

    // Update status
    updateScoreStatus(results.score, results.scoreCategory, results.isATSCompatible);

    // Display issues
    displayIssues(results.issues || []);

    // Display improvements
    displayImprovements(results.improvements || []);

    // Display format checks
    displayFormatChecks(results.formatAnalysis || {});

    // Display detected sections
    displayKeywords(results.detectedSections || []);

    // Display recommendation
    displayRecommendation(results.recommendedPackage, results.score);

    // Display summary
    document.getElementById("summaryText").textContent = results.summary || "Analysis complete.";
  }

  function animateScore(targetScore, category) {
    const scoreNumber = document.getElementById("scoreNumber");
    const scoreProgress = document.getElementById("scoreProgress");
    const scoreCircle = document.getElementById("scoreCircle");
    
    // Set color based on category
    const colors = {
      excellent: "#167e6c",
      good: "#156d95",
      needs_improvement: "#d97706",
      poor: "#dc2626"
    };
    
    const color = colors[category] || colors.needs_improvement;
    scoreProgress.style.stroke = color;
    scoreCircle.setAttribute("data-category", category);

    // Animate the number
    let currentScore = 0;
    const duration = 1500;
    const increment = targetScore / (duration / 16);
    
    const animateNumber = () => {
      currentScore += increment;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        scoreNumber.textContent = Math.round(currentScore);
      } else {
        scoreNumber.textContent = Math.round(currentScore);
        requestAnimationFrame(animateNumber);
      }
    };
    
    // Animate the circle
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (targetScore / 100) * circumference;
    scoreProgress.style.strokeDasharray = circumference;
    scoreProgress.style.strokeDashoffset = circumference;
    
    setTimeout(() => {
      scoreProgress.style.transition = "stroke-dashoffset 1.5s ease-out";
      scoreProgress.style.strokeDashoffset = offset;
    }, 100);

    requestAnimationFrame(animateNumber);
  }

  function updateScoreStatus(score, category, isATSCompatible) {
    const statusBadge = document.getElementById("statusBadge");
    const statusText = document.getElementById("statusText");

    const statusConfig = {
      excellent: {
        badge: "Excellent",
        text: "Your CV is highly ATS-compatible and well-optimized for automated screening systems.",
        class: "status-excellent"
      },
      good: {
        badge: "Good",
        text: "Your CV has good ATS compatibility with some minor areas for improvement.",
        class: "status-good"
      },
      needs_improvement: {
        badge: "Needs Work",
        text: "Your CV has several issues that may affect ATS parsing. Consider our professional services.",
        class: "status-warning"
      },
      poor: {
        badge: "Poor",
        text: "Your CV has significant compatibility issues. We strongly recommend professional assistance.",
        class: "status-poor"
      }
    };

    const config = statusConfig[category] || statusConfig.needs_improvement;
    statusBadge.textContent = config.badge;
    statusBadge.className = `status-badge ${config.class}`;
    statusText.textContent = config.text;
  }

  function displayIssues(issues) {
    const issuesList = document.getElementById("issuesList");
    const issueCount = document.getElementById("issueCount");
    
    issueCount.textContent = issues.length;
    issuesList.innerHTML = "";

    if (issues.length === 0) {
      issuesList.innerHTML = '<li class="no-issues">No critical issues found! 🎉</li>';
      return;
    }

    issues.forEach(issue => {
      const li = document.createElement("li");
      li.className = `issue-item issue-${issue.severity}`;
      li.innerHTML = `
        <span class="issue-severity">${issue.severity}</span>
        <div class="issue-content">
          <p class="issue-text">${issue.issue}</p>
          <p class="issue-impact">${issue.impact}</p>
        </div>
      `;
      issuesList.appendChild(li);
    });
  }

  function displayImprovements(improvements) {
    const improvementsList = document.getElementById("improvementsList");
    improvementsList.innerHTML = "";

    if (improvements.length === 0) {
      improvementsList.innerHTML = '<li class="no-improvements">Your CV looks great!</li>';
      return;
    }

    improvements.forEach(improvement => {
      const li = document.createElement("li");
      li.className = `improvement-item priority-${improvement.priority}`;
      li.innerHTML = `
        <span class="improvement-priority">${improvement.priority}</span>
        <div class="improvement-content">
          <p class="improvement-text">${improvement.suggestion}</p>
          <p class="improvement-benefit">${improvement.benefit}</p>
        </div>
      `;
      improvementsList.appendChild(li);
    });
  }

  function displayFormatChecks(formatAnalysis) {
    const formatChecks = document.getElementById("formatChecks");
    formatChecks.innerHTML = "";

    const checks = [
      { key: "layout", label: "Layout Structure" },
      { key: "sections", label: "Section Headers" },
      { key: "contactInfo", label: "Contact Information" },
      { key: "formatting", label: "Text Formatting" },
      { key: "keywords", label: "Keyword Optimization" }
    ];

    checks.forEach(check => {
      const data = formatAnalysis[check.key] || { status: "warning", message: "Not analyzed" };
      const div = document.createElement("div");
      div.className = `format-check format-${data.status}`;
      
      const icons = {
        pass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>',
        fail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      };

      div.innerHTML = `
        <div class="format-check-header">
          <span class="format-check-icon">${icons[data.status]}</span>
          <span class="format-check-label">${check.label}</span>
        </div>
        <p class="format-check-message">${data.message}</p>
      `;
      formatChecks.appendChild(div);
    });
  }

  function displayKeywords(sections) {
    const keywordsTags = document.getElementById("keywordsTags");
    keywordsTags.innerHTML = "";

    if (sections.length === 0) {
      keywordsTags.innerHTML = '<span class="no-keywords">No standard sections detected</span>';
      return;
    }

    sections.forEach(section => {
      const span = document.createElement("span");
      span.className = "keyword-tag";
      span.textContent = section;
      keywordsTags.appendChild(span);
    });
  }

  // ===== UPDATED displayRecommendation FUNCTION =====
// Replace the existing displayRecommendation function in cv-checker.js with this:

function displayRecommendation(recommendation, score) {
  const packageName = document.getElementById("packageName");
  const packagePrice = document.getElementById("packagePrice");
  const recommendationReason = document.getElementById("recommendationReason");
  const recommendationCard = document.getElementById("recommendationCard");

  // Get current country and pricing from country-detect.js
  const currentCountry = window.countryDetect?.getCurrent() || 'BD';
  const currentPricing = window.countryDetect?.getPricing() || {
    currency: '৳',
    basic: '999',
    professional: '1,999',
    executive: '3,999',
    custom: 'Custom'
  };

  const packages = {
    basic: { 
      name: "Basic Starter", 
      price: `${currentPricing.currency}${currentPricing.basic}` 
    },
    professional: { 
      name: "Professional", 
      price: `${currentPricing.currency}${currentPricing.professional}` 
    },
    executive: { 
      name: "Executive Elite", 
      price: `${currentPricing.currency}${currentPricing.executive}` 
    },
    custom: { 
      name: "Custom Package", 
      price: currentPricing.custom 
    }
  };

  const pkg = packages[recommendation?.package] || packages.professional;
  
  packageName.textContent = pkg.name;
  packagePrice.textContent = pkg.price;
  recommendationReason.textContent = recommendation?.reason || "Based on your CV analysis, we recommend this package to optimize your resume for ATS systems.";
  
  recommendationCard.setAttribute("data-package", recommendation?.package || "professional");
}
  // ===== LOADING STATES =====
  function showLoading() {
    uploadSection.style.display = "none";
    loadingSection.style.display = "block";
    resultsSection.style.display = "none";
    
    // Reset all steps
    for (let i = 1; i <= 4; i++) {
      document.getElementById(`step${i}`).classList.remove("active", "completed");
    }
    document.getElementById("step1").classList.add("active");
    document.getElementById("loadingProgressBar").style.width = "0%";
  }

  function hideLoading() {
    loadingSection.style.display = "none";
    uploadSection.style.display = "block";
  }

  function updateLoadingStep(step, statusText) {
    document.getElementById("loadingStatus").textContent = statusText;
    
    // Update progress bar
    const progress = (step / 4) * 100;
    document.getElementById("loadingProgressBar").style.width = `${progress}%`;
    
    // Update step indicators
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`step${i}`);
      if (i < step) {
        stepEl.classList.remove("active");
        stepEl.classList.add("completed");
      } else if (i === step) {
        stepEl.classList.add("active");
        stepEl.classList.remove("completed");
      } else {
        stepEl.classList.remove("active", "completed");
      }
    }
  }

  // ===== UTILITY FUNCTIONS =====
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  console.log("CV Checker initialized successfully!");
});
// End of cv-checker.js