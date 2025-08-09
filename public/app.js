// ===== Mobile Menu & Sidebars =====
const leftSidebar = document.getElementById('sidebar-left');
const rightSidebar = document.getElementById('sidebar-right');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const rightSidebarToggle = document.getElementById('right-sidebar-toggle');

// Mobile menu toggle
mobileMenuToggle?.addEventListener('click', () => {
  leftSidebar.classList.toggle('active');
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
    
    // Save current tab
    localStorage.setItem('current_tab', targetTab);
    
    // Close mobile menu after tab selection
    if (window.innerWidth <= 1024) {
      leftSidebar.classList.remove('active');
      mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
    }
  });
});

// Restore last active tab
const lastTab = localStorage.getItem('current_tab');
if (lastTab) {
  const tabToActivate = document.querySelector(`.nav-tab[data-tab="${lastTab}"]`);
  if (tabToActivate && !tabToActivate.classList.contains('disabled')) {
    tabToActivate.click();
  }
}

// ===== Client Management =====
let clients = JSON.parse(localStorage.getItem('clients')) || [];
let currentClientId = localStorage.getItem('current_client_id') || null;

function gatherProfile() {
  return {
    id: Date.now().toString(),
    company: document.getElementById('company')?.value.trim() || '',
    negotiator: document.getElementById('negotiator')?.value.trim() || '',
    sector: document.getElementById('sector')?.value.trim() || '',
    goal: document.getElementById('goal')?.value.trim() || '',
    criteria: document.getElementById('criteria')?.value.trim() || '',
    constraints: document.getElementById('constraints')?.value.trim() || '',
    notes: document.getElementById('notes')?.value.trim() || '',
    createdAt: new Date().toISOString()
  };
}

function loadProfile(profile) {
  if (!profile) return;
  
  document.getElementById('company').value = profile.company || '';
  document.getElementById('negotiator').value = profile.negotiator || '';
  document.getElementById('sector').value = profile.sector || '';
  document.getElementById('goal').value = profile.goal || '';
  document.getElementById('criteria').value = profile.criteria || '';
  document.getElementById('constraints').value = profile.constraints || '';
  document.getElementById('notes').value = profile.notes || '';
}

function renderClients() {
  const container = document.getElementById('saved-clients');
  if (!container) return;
  
  if (clients.length === 0) {
    container.innerHTML = '<p class="muted">Немає збережених клієнтів</p>';
    return;
  }
  
  container.innerHTML = clients.map((client, index) => `
    <div class="client-item ${client.id === currentClientId ? 'active' : ''}" 
         data-client-id="${client.id}">
      <div class="client-item-info" onclick="loadClient('${client.id}')">
        <i class="fas fa-building"></i>
        <span>${client.company || 'Без назви'}</span>
      </div>
      <div class="client-item-actions">
        <button onclick="deleteClient('${client.id}')" title="Видалити">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  updateStatistics();
}

window.saveCurrentClient = () => {
  const profile = gatherProfile();
  
  if (!profile.company) {
    showNotification('Введіть назву компанії для збереження', 'warning');
    return;
  }
  
  // Check if client already exists
  const existingIndex = clients.findIndex(c => c.company === profile.company);
  if (existingIndex >= 0) {
    // Update existing
    clients[existingIndex] = { ...clients[existingIndex], ...profile };
    showNotification('Клієнт оновлено', 'success');
  } else {
    // Add new
    clients.push(profile);
    showNotification('Клієнт збережено', 'success');
  }
  
  currentClientId = profile.id;
  localStorage.setItem('clients', JSON.stringify(clients));
  localStorage.setItem('current_client_id', currentClientId);
  renderClients();
};

window.loadClient = (clientId) => {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  
  loadProfile(client);
  currentClientId = clientId;
  localStorage.setItem('current_client_id', currentClientId);
  renderClients();
  showNotification(`Завантажено клієнта: ${client.company}`, 'info');
};

window.deleteClient = (clientId) => {
  if (!confirm('Видалити цього клієнта?')) return;
  
  clients = clients.filter(c => c.id !== clientId);
  localStorage.setItem('clients', JSON.stringify(clients));
  
  if (currentClientId === clientId) {
    currentClientId = null;
    localStorage.removeItem('current_client_id');
  }
  
  renderClients();
  showNotification('Клієнт видалено', 'success');
};

window.clearClients = () => {
  if (!confirm('Видалити всіх збережених клієнтів?')) return;
  
  clients = [];
  currentClientId = null;
  localStorage.removeItem('clients');
  localStorage.removeItem('current_client_id');
  renderClients();
  
  // Clear form
  ['company', 'negotiator', 'sector', 'goal', 'criteria', 'constraints', 'notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  showNotification('Всі клієнти видалені', 'success');
};

// ===== Analysis History =====
let analysisHistory = JSON.parse(localStorage.getItem('analysis_history')) || [];

function saveToHistory(type, clientName, result) {
  const historyItem = {
    id: Date.now().toString(),
    type,
    clientName,
    result,
    timestamp: new Date().toISOString()
  };
  
  analysisHistory.unshift(historyItem);
  // Keep only last 50 items
  analysisHistory = analysisHistory.slice(0, 50);
  
  localStorage.setItem('analysis_history', JSON.stringify(analysisHistory));
  renderHistory();
  updateStatistics();
}

function renderHistory() {
  const container = document.getElementById('analysis-history');
  if (!container) return;
  
  if (analysisHistory.length === 0) {
    container.innerHTML = '<p class="muted">Немає історії</p>';
    return;
  }
  
  const recentHistory = analysisHistory.slice(0, 10);
  container.innerHTML = recentHistory.map(item => `
    <div class="history-item" onclick="loadHistoryItem('${item.id}')">
      <div class="history-item-date">${new Date(item.timestamp).toLocaleString('uk-UA')}</div>
      <div class="history-item-client">${item.clientName || 'Без назви'} - ${item.type}</div>
    </div>
  `).join('');
}

window.loadHistoryItem = (itemId) => {
  const item = analysisHistory.find(h => h.id === itemId);
  if (!item) return;
  
  // Switch to appropriate tab
  const tabToActivate = document.querySelector(`.nav-tab[data-tab="${item.type}"]`);
  if (tabToActivate && !tabToActivate.classList.contains('disabled')) {
    tabToActivate.click();
  }
  
  // Load result based on type
  if (item.type === 'neg' && item.result) {
    const streamEl = document.getElementById('stream');
    if (streamEl) streamEl.textContent = item.result;
    document.getElementById('annotated').style.display = 'none';
  } else if (item.type === 'salary' && item.result) {
    const resultDiv = document.getElementById('salary-analysis-content');
    if (resultDiv) {
      resultDiv.innerHTML = item.result;
      document.getElementById('salary-result').style.display = 'block';
    }
  }
  
  showNotification('Історія завантажена', 'info');
};

window.showAnalysisHistory = () => {
  renderHistory();
  rightSidebar.classList.add('active');
};

window.clearAllData = () => {
  if (!confirm('Видалити всю історію та дані? Ця дія незворотна!')) return;
  
  localStorage.removeItem('analysis_history');
  localStorage.removeItem('clients');
  localStorage.removeItem('current_client_id');
  
  analysisHistory = [];
  clients = [];
  currentClientId = null;
  
  renderHistory();
  renderClients();
  updateStatistics();
  
  showNotification('Всі дані очищено', 'success');
};

// ===== Export Functions =====
window.exportCurrentAnalysis = () => {
  const activeTab = document.querySelector('.tab-pane.active');
  if (!activeTab) {
    showNotification('Немає активного аналізу', 'warning');
    return;
  }
  
  let content = '';
  let filename = '';
  
  if (activeTab.id === 'neg') {
    content = document.getElementById('stream')?.textContent || '';
    filename = `negotiation_analysis_${Date.now()}.txt`;
  } else if (activeTab.id === 'salary') {
    content = document.getElementById('salary-analysis-content')?.innerText || '';
    filename = `salary_analysis_${Date.now()}.txt`;
  }
  
  if (!content) {
    showNotification('Немає даних для експорту', 'warning');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  
  showNotification('Аналіз експортовано', 'success');
};

// ===== Statistics =====
function updateStatistics() {
  // Analyses today
  const today = new Date().toDateString();
  const todayAnalyses = analysisHistory.filter(h => 
    new Date(h.timestamp).toDateString() === today
  ).length;
  document.getElementById('analyses-today').textContent = todayAnalyses;
  
  // Total clients
  document.getElementById('total-clients').textContent = clients.length;
  
  // Last activity
  if (analysisHistory.length > 0) {
    const lastDate = new Date(analysisHistory[0].timestamp);
    const timeAgo = getTimeAgo(lastDate);
    document.getElementById('last-activity').textContent = timeAgo;
  } else {
    document.getElementById('last-activity').textContent = '—';
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'щойно';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} хв тому`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} год тому`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} дн тому`;
  
  return date.toLocaleDateString('uk-UA');
}

// ===== Drag & Drop =====
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file');

if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());
  
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

// ===== Negotiation Analysis =====
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
  
  streamEl.textContent = '';
  document.getElementById('badJson').style.display = 'none';
  document.getElementById('annotated').style.display = 'none';
  
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
    
    // Save to history
    saveToHistory('neg', profile.company || 'Без назви', full);
    
    // Try to parse and highlight
    try {
      const jsonStart = full.indexOf('{');
      const jsonEnd = full.lastIndexOf('}');
      const jsonText = full.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonText);
      
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
  window.exportCurrentAnalysis();
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
  localStorage.setItem('onboarding_completed', 'true');
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
}

// ===== Notifications =====
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();
  
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
  
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

window.showNotification = showNotification;

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Space - Toggle right sidebar
  if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
    e.preventDefault();
    rightSidebar.classList.toggle('active');
  }
  
  // Ctrl/Cmd + S - Save current client
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    window.saveCurrentClient();
  }
  
  // Ctrl/Cmd + E - Export
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    window.exportCurrentAnalysis();
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
    if (window.innerWidth > 1024) {
      mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
    }
    if (window.innerWidth <= 768) {
      rightSidebar.classList.remove('active');
    }
  }, 250);
});

// ===== Prevent iOS Zoom =====
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// ===== Initialize =====
renderClients();
renderHistory();
updateStatistics();

// Load current client if exists
if (currentClientId) {
  const client = clients.find(c => c.id === currentClientId);
  if (client) {
    loadProfile(client);
  }
}

console.log('TeamPulse Turbo initialized ⚡');