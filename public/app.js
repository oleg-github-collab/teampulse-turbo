// ===== Mobile Menu & Sidebars =====
const leftSidebar = document.getElementById('sidebar-left');
const rightSidebar = document.getElementById('sidebar-right');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const rightSidebarToggle = document.getElementById('right-sidebar-toggle');

// Mobile menu toggle
mobileMenuToggle?.addEventListener('click', () => {
  leftSidebar.classList.toggle('active');
  // Update icon
  const icon = mobileMenuToggle.querySelector('i');
  if (leftSidebar.classList.contains('active')) {
    icon.className = 'fas fa-times';
  } else {
    icon.className = 'fas fa-bars';
  }
});

// Right sidebar toggle
rightSidebarToggle?.addEventListener('click', () => {
  rightSidebar.classList.toggle('active');
});

// Close sidebar function
window.closeSidebar = (side) => {
  if (side === 'left') {
    leftSidebar.classList.remove('active');
    mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
  } else if (side === 'right') {
    rightSidebar.classList.remove('active');
  }
};

// Close sidebars on outside click (mobile)
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 1024) {
    if (!leftSidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
      leftSidebar.classList.remove('active');
      mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
    }
    if (!rightSidebar.contains(e.target) && !rightSidebarToggle.contains(e.target)) {
      rightSidebar.classList.remove('active');
    }
  }
});

// ===== Tab Navigation =====
const navTabs = document.querySelectorAll('.nav-tab[data-tab]');
const tabPanes = document.querySelectorAll('.tab-pane');

navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.classList.contains('disabled')) return;
    
    // Update active tab
    navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update active pane
    const targetTab = tab.dataset.tab;
    tabPanes.forEach(pane => {
      if (pane.id === targetTab) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
    
    // Close mobile menu after tab selection
    if (window.innerWidth <= 1024) {
      leftSidebar.classList.remove('active');
      mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
    }
  });
});

// ===== Theme Toggle =====
const themeToggle = document.getElementById('theme-toggle');
let darkMode = true;

themeToggle?.addEventListener('click', () => {
  darkMode = !darkMode;
  const icon = themeToggle.querySelector('i');
  
  if (darkMode) {
    document.documentElement.style.setProperty('--bg', '#0a0a0a');
    document.documentElement.style.setProperty('--bg-secondary', '#0f0f0f');
    icon.className = 'fas fa-moon';
  } else {
    document.documentElement.style.setProperty('--bg', '#1a1a1a');
    document.documentElement.style.setProperty('--bg-secondary', '#2a2a2a');
    icon.className = 'fas fa-sun';
  }
});

// ===== Profile Management =====
function gatherProfile() {
  return {
    company: document.getElementById('company')?.value.trim() || '',
    negotiator: document.getElementById('negotiator')?.value.trim() || '',
    sector: document.getElementById('sector')?.value.trim() || '',
    goal: document.getElementById('goal')?.value.trim() || '',
    criteria: document.getElementById('criteria')?.value.trim() || '',
    constraints: document.getElementById('constraints')?.value.trim() || '',
    notes: document.getElementById('notes')?.value.trim() || ''
  };
}

// Save profile to localStorage on change
const profileInputs = ['company', 'negotiator', 'sector', 'goal', 'criteria', 'constraints', 'notes'];
profileInputs.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    // Load saved value
    const saved = localStorage.getItem(`profile_${id}`);
    if (saved) input.value = saved;
    
    // Save on change
    input.addEventListener('input', () => {
      localStorage.setItem(`profile_${id}`, input.value);
    });
  }
});

// ===== Client List =====
const clientItems = document.querySelectorAll('.client-item');
clientItems.forEach(item => {
  item.addEventListener('click', () => {
    clientItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    // Here you could load different client profiles
  });
});

// ===== Drag & Drop =====
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file');

if (dropzone && fileInput) {
  // Click to select file
  dropzone.addEventListener('click', () => fileInput.click());
  
  // Drag events
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    if (e.dataTransfer.files?.length) {
      fileInput.files = e.dataTransfer.files;
      updateDropzoneText(e.dataTransfer.files[0].name);
    }
  });
  
  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      updateDropzoneText(fileInput.files[0].name);
    }
  });
}

function updateDropzoneText(filename) {
  const dropzone = document.getElementById('dropzone');
  dropzone.innerHTML = `
    <i class="fas fa-file-check"></i>
    <p>Файл обрано</p>
    <span>${filename}</span>
  `;
}

// ===== Analysis Functions =====
const analyzeBtn = document.getElementById('analyzeBtn');
const streamEl = document.getElementById('stream');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const exportBtn = document.getElementById('exportBtn');

analyzeBtn?.addEventListener('click', async () => {
  const inputText = document.getElementById('inputText').value.trim();
  const file = fileInput?.files?.[0];
  const profile = gatherProfile();
  
  if (!inputText && !file) {
    showNotification('Будь ласка, введіть текст або оберіть файл', 'warning');
    return;
  }
  
  const form = new FormData();
  form.append('profile', JSON.stringify(profile));
  if (file) {
    form.append('file', file);
  } else {
    form.append('text', inputText);
  }
  
  // Clear previous results
  streamEl.textContent = '';
  document.getElementById('badJson').style.display = 'none';
  document.getElementById('annotated').style.display = 'none';
  
  // Show loading state
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Аналізую...';
  
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: form
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      chunk.split("\n").forEach(line => {
        if (line.startsWith('data:')) {
          try {
            const obj = JSON.parse(line.slice(5).trim());
            if (obj.chunk) {
              streamEl.textContent += obj.chunk;
              full += obj.chunk;
            }
          } catch {}
        }
      });
    }
    
    // Try to parse and highlight
    try {
      const jsonStart = full.indexOf('{');
      const jsonEnd = full.lastIndexOf('}');
      const jsonText = full.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonText);
      
      // Show highlights if text was provided
      if (inputText) {
        const highlights = [];
        for (const b of (parsed.biases || [])) {
          highlights.push({ span: b.text_span, cls: 'bias' });
        }
        for (const m of (parsed.manipulations || [])) {
          highlights.push({ span: m.text_span, cls: 'manip' });
        }
        for (const f of (parsed.rhetological_fallacies || [])) {
          highlights.push({ span: f.text_span, cls: 'fallacy' });
        }
        for (const c of (parsed.cognitive_distortions || [])) {
          highlights.push({ span: c.text_span, cls: 'cog' });
        }
        
        const html = highlightBySpans(inputText, highlights);
        document.getElementById('highlighted').innerHTML = html;
        document.getElementById('annotated').style.display = 'block';
      }
    } catch (e) {
      document.getElementById('badJson').style.display = 'block';
    }
    
    showNotification('Аналіз завершено успішно', 'success');
  } catch (error) {
    streamEl.textContent = 'Помилка: ' + error.message;
    showNotification('Помилка аналізу: ' + error.message, 'error');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Аналізувати';
  }
});

// Fullscreen
fullscreenBtn?.addEventListener('click', () => {
  const resultsSection = document.querySelector('.results-section');
  if (!document.fullscreenElement) {
    resultsSection.requestFullscreen?.() || 
    resultsSection.webkitRequestFullscreen?.() ||
    resultsSection.mozRequestFullScreen?.();
  } else {
    document.exitFullscreen?.() ||
    document.webkitExitFullscreen?.() ||
    document.mozCancelFullScreen?.();
  }
});

// Screenshot
screenshotBtn?.addEventListener('click', async () => {
  const resultsSection = document.querySelector('.results-section');
  if (typeof html2canvas !== 'undefined') {
    const canvas = await html2canvas(resultsSection, {
      backgroundColor: '#0a0a0a',
      scale: 2
    });
    const link = document.createElement('a');
    link.download = `teampulse_analysis_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showNotification('Скріншот збережено', 'success');
  }
});

// Export
exportBtn?.addEventListener('click', () => {
  const content = streamEl.textContent;
  if (!content) {
    showNotification('Немає даних для експорту', 'warning');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.download = `teampulse_analysis_${Date.now()}.txt`;
  link.href = URL.createObjectURL(blob);
  link.click();
  showNotification('Файл експортовано', 'success');
});

// ===== Highlight Functions =====
function highlightBySpans(text, items) {
  items = (items || []).filter(x => 
    x?.span && 
    Number.isFinite(x.span.start) && 
    Number.isFinite(x.span.end) && 
    x.span.end > x.span.start
  );
  items.sort((a, b) => a.span.start - b.span.start);
  
  let i = 0, out = '';
  for (const it of items) {
    const s = it.span.start, e = it.span.end;
    if (s > i) out += escapeHTML(text.slice(i, s));
    out += `<mark class="${it.cls}">${escapeHTML(text.slice(s, e))}</mark>`;
    i = e;
  }
  if (i < text.length) out += escapeHTML(text.slice(i));
  return out;
}

function escapeHTML(s) {
  return s.replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));
}

// ===== Onboarding =====
const onboarding = document.getElementById('onboarding');
const steps = onboarding ? [...onboarding.querySelectorAll('.onboarding-step')] : [];
const dots = onboarding ? [...onboarding.querySelectorAll('.dot')] : [];
let stepIdx = 0;

function openOnboarding() {
  onboarding?.classList.add('active');
}

function closeOnboarding() {
  onboarding?.classList.remove('active');
}

window.skipOnboarding = closeOnboarding;

window.nextOnboardingStep = () => {
  if (!steps.length || !dots.length) return;
  
  steps[stepIdx]?.classList.remove('active');
  dots[stepIdx]?.classList.remove('active');
  stepIdx = Math.min(stepIdx + 1, steps.length - 1);
  steps[stepIdx]?.classList.add('active');
  dots[stepIdx]?.classList.add('active');
  
  if (stepIdx === steps.length - 1) {
    setTimeout(closeOnboarding, 1500);
  }
};

// Show onboarding for new users
if (!localStorage.getItem('onboarding_completed')) {
  setTimeout(openOnboarding, 800);
  localStorage.setItem('onboarding_completed', 'true');
}

// ===== Notifications =====
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();
  
  // Create new notification
  const notification = document.createElement('div');
  notification.className = `notification-toast notification-${type}`;
  
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  notification.innerHTML = `
    <i class="${icons[type]}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Add styles if not present
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 20px;
        background: var(--card);
        backdrop-filter: blur(20px);
        border: 1px solid var(--border);
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        z-index: 300;
        animation: slideInRight 0.3s ease-out;
        max-width: 350px;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .notification-success {
        border-color: rgba(0, 255, 136, 0.3);
        background: rgba(0, 255, 136, 0.1);
      }
      
      .notification-success i {
        color: var(--neon-green);
      }
      
      .notification-error {
        border-color: rgba(255, 0, 128, 0.3);
        background: rgba(255, 0, 128, 0.1);
      }
      
      .notification-error i {
        color: var(--neon-pink);
      }
      
      .notification-warning {
        border-color: rgba(255, 234, 0, 0.3);
        background: rgba(255, 234, 0, 0.1);
      }
      
      .notification-warning i {
        color: var(--neon-yellow);
      }
      
      .notification-info i {
        color: var(--neon-blue);
      }
      
      @media (max-width: 480px) {
        .notification-toast {
          left: 20px;
          right: 20px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Space - Toggle right sidebar
  if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
    e.preventDefault();
    rightSidebar.classList.toggle('active');
  }
  
  // Esc - Close modals/sidebars
  if (e.code === 'Escape') {
    if (window.innerWidth <= 1024) {
      leftSidebar.classList.remove('active');
      mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
    }
    rightSidebar.classList.remove('active');
    closeOnboarding();
  }
});

// ===== Responsive Adjustments =====
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // Close mobile menu on desktop resize
    if (window.innerWidth > 1024) {
      mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
    }
    // Close right sidebar on mobile
    if (window.innerWidth <= 768) {
      rightSidebar.classList.remove('active');
    }
  }, 250);
});

// ===== Prevent iOS Zoom =====
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// Prevent double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// ===== Initialize =====
console.log('TeamPulse Turbo initialized ⚡');
showNotification('Ласкаво просимо до TeamPulse Turbo', 'info');