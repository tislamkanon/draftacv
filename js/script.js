// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
// ===== CONTACT INFORMATION PROTECTION =====
const emailParts = {
  user: 'vactfard'.split('').reverse().join(''),
  domain: 'liamg'.split('').reverse().join(''),
  tld: 'moc'.split('').reverse().join('')
};

const phoneParts = {
  code: String.fromCharCode(40, 43, 54, 50, 41, 32),
  number: [56, 49, 49, 50, 48, 56, 55, 49, 56, 49].map(c => String.fromCharCode(c)).join('')
};

const buildEmail = () => `${emailParts.user}@${emailParts.domain}.${emailParts.tld}`;
const buildPhone = () => `${phoneParts.code}${phoneParts.number}`;
const buildMailto = () => `mailto:${buildEmail()}`;
const buildWhatsApp = () => {
  const waNum = [54, 50, 56, 49, 49, 50, 48, 56, 55, 49, 56, 49].map(c => String.fromCharCode(c)).join('');
  return `https://wa.me/${waNum}`;
};

// Update footer email
const footerEmail = document.getElementById('footer-email');
if (footerEmail) footerEmail.textContent = buildEmail();

// Update footer phone
const footerPhone = document.getElementById('footer-phone');
if (footerPhone) footerPhone.textContent = buildPhone();

// Update support email link
const supportLink = document.getElementById('support-email-link');
if (supportLink) {
  supportLink.href = buildMailto();
  supportLink.onclick = function(e) {
    e.preventDefault();
    window.location.href = buildMailto();
  };
}

// Update social email link
const socialLink = document.getElementById('social-email-link');
if (socialLink) {
  socialLink.href = buildMailto();
  socialLink.onclick = function(e) {
    e.preventDefault();
    window.location.href = buildMailto();
  };
}

// Update social WhatsApp link
const socialWhatsApp = document.getElementById('social-whatsapp-link');
if (socialWhatsApp) {
  socialWhatsApp.href = buildWhatsApp();
  socialWhatsApp.onclick = function(e) {
    e.preventDefault();
    window.open(buildWhatsApp(), '_blank');
  };
}

// Update footer WhatsApp link
const footerWhatsApp = document.getElementById('footer-whatsapp-link');
if (footerWhatsApp) {
  footerWhatsApp.href = buildWhatsApp();
  footerWhatsApp.onclick = function(e) {
    e.preventDefault();
    window.open(buildWhatsApp(), '_blank');
  };
}

// Update contact page WhatsApp link (for terms/privacy pages)
const contactWhatsApp = document.getElementById('contact-whatsapp-link');
if (contactWhatsApp) {
  contactWhatsApp.textContent = 'Click to contact';
  contactWhatsApp.href = buildWhatsApp();
  contactWhatsApp.onclick = function(e) {
    e.preventDefault();
    window.open(buildWhatsApp(), '_blank');
  };
}

// Update contact email link (for terms/privacy pages)
const contactEmailLink = document.getElementById('contact-email-link');
if (contactEmailLink) {
  contactEmailLink.textContent = buildEmail();
  contactEmailLink.href = buildMailto();
  contactEmailLink.onclick = function(e) {
    e.preventDefault();
    window.location.href = buildMailto();
  };
}

// Update contact phone (for terms/privacy pages)
const contactPhone = document.getElementById('contact-phone');
if (contactPhone) {
  contactPhone.textContent = buildPhone();
}
  
  // ===== PACKAGE REDIRECTION FUNCTION (called from index.html buttons) =====
  window.selectPackageAndRedirect = function(packageKey) {
    // Redirect to form.html and pass the package key as a URL parameter
    window.location.href = `form.html?package=${packageKey}`;
  }

  // ===== NAVBAR SCROLL EFFECT =====
  const navbar = document.getElementById("navbar")
  let lastScroll = 0

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset

    if (currentScroll > 20) {
      navbar.classList.add("scrolled")
    } else {
      navbar.classList.remove("scrolled")
    }

    lastScroll = currentScroll
  })

  // ===== MOBILE MENU TOGGLE =====
  const mobileMenuBtn = document.getElementById("mobileMenuBtn")
  const mobileMenu = document.getElementById("mobileMenu")

  mobileMenuBtn.addEventListener("click", function () {
    this.classList.toggle("active")
    mobileMenu.classList.toggle("active")
  })

  // Close mobile menu on link click
  const mobileLinks = document.querySelectorAll(".mobile-link, .mobile-cta")
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenuBtn.classList.remove("active")
      mobileMenu.classList.remove("active")
    })
  })

  // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
  const anchorLinks = document.querySelectorAll('a[href^="#"]')
  anchorLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetId = this.getAttribute("href")
      const targetElement = document.querySelector(targetId)

      if (targetElement) {
        const navHeight = navbar.offsetHeight
        const targetPosition = targetElement.offsetTop - navHeight

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        })
      }
    })
  })

  // ===== PRICING CARD SELECTION =====
  const pricingCards = document.querySelectorAll(".pricing-card")
  const ctaBtn = document.getElementById("ctaBtn")

  const planNames = {
    basic: "Basic Starter",
    professional: "Professional",
    executive: "Executive Elite",
    custom: "Custom",
  }

  pricingCards.forEach((card) => {
    card.addEventListener("click", function () {
      // Remove selected state from all cards
      pricingCards.forEach((c) => {
        c.classList.remove("selected")
        c.querySelector(".plan-btn").classList.remove("selected")
        c.querySelector(".plan-btn").textContent = c.dataset.plan === "custom" ? "Get in Touch" : "Choose Package"
      })

      // Add selected state to clicked card
      this.classList.add("selected")
      const btn = this.querySelector(".plan-btn")
      btn.classList.add("selected")
      btn.textContent = this.dataset.plan === "custom" ? "Get in Touch" : "Selected"
      
      // NEW: Update CTA button's onclick to use the currently selected package
      ctaBtn.setAttribute('onclick', `selectPackageAndRedirect('${this.dataset.plan}')`);

      // Update CTA button text
      const planName = planNames[this.dataset.plan]
      ctaBtn.textContent = `Get started with ${planName}`
    })
  })

  // ===== FAQ ACCORDION =====
  const faqItems = document.querySelectorAll(".faq-item")

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question")

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active")

      // Close all other FAQs
      faqItems.forEach((faq) => {
        faq.classList.remove("active")
      })

      // Toggle current FAQ
      if (!isActive) {
        item.classList.add("active")
      }
    })
  })

  // ===== ANIMATED BARS IN STATS SECTION =====
  const animatedBars = document.getElementById("animatedBars")

  if (animatedBars) {
    for (let i = 0; i < 20; i++) {
      const bar = document.createElement("div")
      bar.className = "bar" + (i % 2 === 0 ? "" : " up")

      const height = Math.floor(Math.random() * 120) + 88
      const topPosition = i % 2 === 0 ? Math.random() * 150 + 250 : Math.random() * 100 - 80

      bar.style.cssText = `
        left: ${i * 32}px;
        top: ${topPosition}px;
        height: ${height}px;
        animation-delay: ${i * 50}ms;
      `

      // Add dot
      const dot = document.createElement("div")
      dot.className = "bar-dot"
      dot.style[i % 2 === 0 ? "top" : "bottom"] = "0px"
      bar.appendChild(dot)

      animatedBars.appendChild(bar)
    }
  }

  // ===== CAROUSEL INITIALIZATION =====
  const carouselTop = document.getElementById("carouselTop")
  const carouselBottom = document.getElementById("carouselBottom")

  const logos = [
    "https://cdn.sanity.io/images/1t8iva7t/production/1c0f9c7b9c5f2e8b8c8e8e8e8e8e8e8e8e8e8e8e-200x200.png",
    "https://cdn.sanity.io/images/1t8iva7t/production/2c0f9c7b9c5f2e8b8c8e8e8e8e8e8e8e8e8e8e8e-200x200.png",
    "https://cdn.sanity.io/images/1t8iva7t/production/3c0f9c7b9c5f2e8b8c8e8e8e8e8e8e8e8e8e8e8e-200x200.png",
  ]

  // Create placeholder logos using SVG
  function createLogoPlaceholder(index) {
    const colors = ["#156d95", "#167E6C", "#4A90A4", "#2D6B77", "#3A8FAB", "#1E5A6E", "#2C7A8A"]
    const color = colors[index % colors.length]

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <rect width="36" height="36" rx="8" fill="${color}" opacity="0.2"/>
        <text x="18" y="23" font-family="Arial" font-size="14" font-weight="bold" fill="${color}" text-anchor="middle">T</text>
      </svg>
    `)}`
  }

  function createCarouselItems(container, count) {
    // Create double the items for seamless loop
    for (let i = 0; i < count * 2; i++) {
      const item = document.createElement("div")
      item.className = "carousel-item"

      const img = document.createElement("img")
      img.src = createLogoPlaceholder(i % count)
      img.alt = `Sample ${(i % count) + 1}`

      item.appendChild(img)
      container.appendChild(item)
    }
  }

  if (carouselTop) {
    createCarouselItems(carouselTop, 12)
  }

  if (carouselBottom) {
    createCarouselItems(carouselBottom, 12)
  }

  // ===== SCROLL ANIMATIONS =====
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observe elements with animation classes
  const animatedElements = document.querySelectorAll(".feature-card, .stat-item, .pricing-card")
  animatedElements.forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(30px)"
    el.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out"
    observer.observe(el)
  })
/*Made by MD Touhidul Islam Kanon*/
  // ===== BUTTON HOVER EFFECTS =====
  const buttons = document.querySelectorAll(".btn, .nav-cta, .cta-btn, .samples-btn")

  buttons.forEach((btn) => {
    btn.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)"
    })

    btn.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)"
    })
  })

  // ===== PARALLAX EFFECT FOR HERO =====
  const heroSection = document.querySelector(".hero-section")

  window.addEventListener("scroll", () => {
    if (window.innerWidth > 768) {
      const scrolled = window.pageYOffset
      const heroContent = document.querySelector(".hero-content-card")
      const heroImage = document.querySelector(".hero-image-card")

      if (heroContent && heroImage && scrolled < 600) {
        heroContent.style.transform = `translateY(${scrolled * 0.1}px)`
        heroImage.style.transform = `translateY(${scrolled * 0.15}px)`
      }
    }
  })

  // ===== TYPING EFFECT FOR STATS LABEL =====
  const statsLabel = document.querySelector(".stats-label span")
  if (statsLabel) {
    const text = statsLabel.textContent
    statsLabel.textContent = ""

    let index = 0
    function typeText() {
      if (index < text.length) {
        statsLabel.textContent += text.charAt(index)
        index++
        setTimeout(typeText, 50)
      }
    }

    // Start typing when stats section is in view
    const statsSection = document.querySelector(".stats-section")
    const statsObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          typeText()
          statsObserver.disconnect()
        }
      },
      { threshold: 0.5 },
    )

    if (statsSection) {
      statsObserver.observe(statsSection)
    }
  }

  // ===== COUNTER ANIMATION FOR STATS =====
  function animateCounter(element, target, duration = 2000) {
    const start = 0
    const isPercentage = target.includes("%")
    const isPlus = target.includes("+")
    const isRange = target.includes("-")

    if (isRange) {
      // For ranges like "24-72h", just set the text
      element.textContent = target
      return
    }

    const numericValue = Number.parseInt(target.replace(/[^0-9]/g, ""))
    const suffix = target.replace(/[0-9]/g, "")

    const startTime = performance.now()

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = Math.floor(easeOutQuart * numericValue)

      element.textContent = current + suffix

      if (progress < 1) {
        requestAnimationFrame(updateCounter)
      } else {
        element.textContent = target
      }
    }

    requestAnimationFrame(updateCounter)
  }

  // Observe stat values for counter animation
  const statValues = document.querySelectorAll(".stat-value")
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target.textContent
          entry.target.textContent = "0"
          animateCounter(entry.target, target)
          counterObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.5 },
  )

  statValues.forEach((val) => counterObserver.observe(val))

  // ===== FEATURE CARD HOVER TILT EFFECT =====
  const featureCards = document.querySelectorAll(".feature-card")

  featureCards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const rotateX = (y - centerY) / 20
      const rotateY = (centerX - x) / 20

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`
    })

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateY(0)"
    })
  })

  console.log("DraftaCV website initialized successfully!")
})
// End of script.js