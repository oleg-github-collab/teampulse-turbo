// ===== Salary Analysis Module =====
let currentAnalysisType = 'text';
let gaugeChart, ineffChart;

// Switch analysis type
function switchAnalysisType(type) {
  // Update buttons
  document.querySelectorAll('.type-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`${type}-analysis-btn`)?.classList.add('active');

  // Show corresponding section
  document.querySelectorAll('.analysis-section').forEach(section => {
    section.style.display = 'none';
  });
  const targetSection = document.getElementById(`${type}-analysis`);
  if (targetSection) {
    targetSection.style.display = 'block';
  }

  // Hide results when switching
  const salaryResult = document.getElementById('salary-result');
  const jsonResults = document.getElementById('json-results');
  if (salaryResult) salaryResult.style.display = 'none';
  if (jsonResults) jsonResults.style.display = 'none';

  currentAnalysisType = type;
  
  // Save preference
  localStorage.setItem('salary_analysis_type', type);
}

// Load saved preference
window.addEventListener('DOMContentLoaded', () => {
  const savedType = localStorage.getItem('salary_analysis_type') || 'text';
  if (savedType !== currentAnalysisType) {
    switchAnalysisType(savedType);
  }
});

// Update performance value display
function updatePerformanceValue(value) {
  const valueElement = document.getElementById('performance-value');
  if (!valueElement) return;
  
  valueElement.textContent = value;
  valueElement.className = 'slider-value';
  
  if (value <= 3) {
    valueElement.style.background = 'rgba(255, 0, 128, 0.2)';
    valueElement.style.color = 'var(--neon-pink)';
  } else if (value <= 6) {
    valueElement.style.background = 'rgba(255, 234, 0, 0.2)';
    valueElement.style.color = 'var(--neon-yellow)';
  } else {
    valueElement.style.background = 'rgba(0, 255, 136, 0.2)';
    valueElement.style.color = 'var(--neon-green)';
  }
}

// Analyze employee
async function analyzeEmployee() {
  const employeeData = {
    name: document.getElementById('emp-name')?.value.trim(),
    position: document.getElementById('emp-position')?.value.trim(),
    salary: parseInt(document.getElementById('emp-salary')?.value),
    experience: parseFloat(document.getElementById('emp-experience')?.value) || null,
    skills: document.getElementById('emp-skills')?.value.trim() || null,
    education: document.getElementById('emp-education')?.value.trim() || null,
    department: document.getElementById('emp-department')?.value || null,
    performance: parseInt(document.getElementById('emp-performance')?.value),
    location: document.getElementById('emp-location')?.value || null
  };

  // Validation
  if (!employeeData.name || !employeeData.position || !employeeData.salary) {
    showSalaryError('Заповніть обов\'язкові поля (ім\'я, посада, зарплата)');
    return;
  }

  if (employeeData.salary < 1000 || employeeData.salary > 1000000) {
    showSalaryError('Зарплата має бути від 1000 до 1000000 грн');
    return;
  }

  try {
    showSalaryLoading('Аналізую профіль працівника...');
    
    const response = await fetch('/api/salary-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      displayEmployeeAnalysis(data.analysis, data.employee);
      showSalarySuccess('Аналіз працівника завершено');
    } else {
      showSalaryError(data.error || 'Помилка аналізу працівника');
    }
  } catch (error) {
    console.error('Employee analysis error:', error);
    showSalaryError('Помилка з\'єднання при аналізі працівника');
  } finally {
    hideSalaryLoading();
  }
}

// Analyze salary text
async function analyzeSalaryText() {
  const textData = document.getElementById('salary-text')?.value.trim();
  
  if (!textData || textData.length < 20) {
    showSalaryError('Введіть детальний опис команди (мінімум 20 символів)');
    return;
  }

  try {
    showSalaryLoading('Аналізую опис команди...');
    
    const response = await fetch('/api/salary-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textData })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      displayTextAnalysis(data.analysis);
      showSalarySuccess('Аналіз команди завершено');
    } else {
      showSalaryError(data.error || 'Помилка аналізу тексту');
    }
  } catch (error) {
    console.error('Text analysis error:', error);
    showSalaryError('Помилка з\'єднання при аналізі тексту');
  } finally {
    hideSalaryLoading();
  }
}

// Analyze JSON
document.getElementById('salaryBtn')?.addEventListener('click', async () => {
  const jsonInput = document.getElementById('salaryJson')?.value;
  const payload = safeParseJSON(jsonInput);
  
  if (!payload) {
    showSalaryError('Невалідний JSON формат');
    return;
  }
  
  try {
    showSalaryLoading('Аналізую JSON структуру...');
    
    const res = await fetch('/api/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json().catch(() => ({ error: 'bad response' }));
    
    if (!data.ok) {
      showSalaryError(data.error || 'Помилка аналізу');
      return;
    }
    
    // Display raw output
    const salaryOut = document.getElementById('salaryOut');
    if (salaryOut) {
      salaryOut.textContent = data.raw;
    }
    
    // Show results section
    const jsonResults = document.getElementById('json-results');
    if (jsonResults) {
      jsonResults.style.display = 'grid';
    }
    
    // Try to parse and visualize
    try {
      const parsed = JSON.parse(data.raw);
      const team = parsed.team_summary || {};
      const gaugeVal = team.total_inefficiency_percent || 0;
      drawGauge(gaugeVal);
      
      const per = parsed.per_employee || [];
      drawIneffChart(
        per.map(p => p.name),
        per.map(p => p.inefficiency_percent || 0)
      );
      
      showSalarySuccess('JSON аналіз завершено');
    } catch (e) {
      console.error('Chart parse error:', e);
    }
  } catch (error) {
    console.error('JSON analysis error:', error);
    showSalaryError('Помилка при аналізі JSON');
  } finally {
    hideSalaryLoading();
  }
});

// Display employee analysis results
function displayEmployeeAnalysis(analysis, employee) {
  const resultDiv = document.getElementById('salary-analysis-content');
  const resultContainer = document.getElementById('salary-result');
  
  if (!resultDiv || !resultContainer) return;
  
  const html = `
    <div class="employee-result-card">
      <div class="result-header-section">
        <div class="employee-info">
          <h4><i class="fas fa-user-circle"></i> ${employee.name}</h4>
          <div class="employee-badges">
            <span class="info-badge">${employee.position}</span>
            <span class="info-badge salary">${employee.salary.toLocaleString('uk-UA')} грн/міс</span>
          </div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon"><i class="fas fa-balance-scale"></i></div>
          <div class="metric-content">
            <div class="metric-label">Справедливість зарплати</div>
            <div class="metric-value">${analysis.employee_analysis?.salary_fairness || 'N/A'}/10</div>
            <div class="metric-status">${analysis.employee_analysis?.market_position || 'Невідомо'}</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon"><i class="fas fa-chart-line"></i></div>
          <div class="metric-content">
            <div class="metric-label">Результат/Зарплата</div>
            <div class="metric-value">${analysis.employee_analysis?.performance_ratio || 'N/A'}/10</div>
            <div class="metric-status">${analysis.employee_analysis?.growth_potential || 'Невідомо'} потенціал</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="metric-content">
            <div class="metric-label">Ризик втрати</div>
            <div class="metric-value">${analysis.risk_assessment?.flight_probability || 'N/A'}/10</div>
            <div class="metric-status">${analysis.risk_assessment?.retention_risk || 'Невідомо'} ризик</div>
          </div>
        </div>
      </div>

      <div class="analysis-section-card">
        <h5><i class="fas fa-chart-area"></i> Ринкові дані</h5>
        <div class="market-range">
          <div class="range-bar">
            <div class="range-labels">
              <span>Мінімум</span>
              <span>Медіана</span>
              <span>Максимум</span>
            </div>
            <div class="range-values">
              <span>${(analysis.market_data?.position_range_min || 0).toLocaleString('uk-UA')} грн</span>
              <span>${(analysis.market_data?.market_median || 0).toLocaleString('uk-UA')} грн</span>
              <span>${(analysis.market_data?.position_range_max || 0).toLocaleString('uk-UA')} грн</span>
            </div>
          </div>
        </div>
      </div>

      <div class="analysis-section-card">
        <h5><i class="fas fa-lightbulb"></i> Рекомендації</h5>
        <div class="recommendations-grid">
          <div class="recommendation-card">
            <div class="rec-icon"><i class="fas fa-coins"></i></div>
            <div class="rec-content">
              <strong>Зарплата</strong>
              <p>${analysis.recommendations?.salary_adjustment || 'Немає рекомендацій'}</p>
            </div>
          </div>
          <div class="recommendation-card">
            <div class="rec-icon"><i class="fas fa-rocket"></i></div>
            <div class="rec-content">
              <strong>Кар\'єра</strong>
              <p>${analysis.recommendations?.career_development || 'Немає рекомендацій'}</p>
            </div>
          </div>
          <div class="recommendation-card">
            <div class="rec-icon"><i class="fas fa-graduation-cap"></i></div>
            <div class="rec-content">
              <strong>Навички</strong>
              <p>${analysis.recommendations?.skills_improvement || 'Немає рекомендацій'}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="analysis-section-card">
        <h5><i class="fas fa-tasks"></i> План дій</h5>
        <div class="action-timeline">
          ${(analysis.action_plan || []).map((action, index) => `
            <div class="action-item">
              <div class="action-number">${index + 1}</div>
              <div class="action-content">${action}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  resultDiv.innerHTML = html;
  resultContainer.style.display = 'block';
  
  // Smooth scroll to results
  setTimeout(() => {
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Display text analysis results
function displayTextAnalysis(analysis) {
  const resultDiv = document.getElementById('salary-analysis-content');
  const resultContainer = document.getElementById('salary-result');
  
  if (!resultDiv || !resultContainer) return;
  
  const html = `
    <div class="team-result-card">
      <div class="team-header-section">
        <div class="team-info">
          <h4><i class="fas fa-users"></i> Аналіз команди</h4>
          <div class="efficiency-meter">
            <div class="efficiency-circle">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5"/>
                <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gradient)" stroke-width="5"
                        stroke-dasharray="${(analysis.overall_efficiency || 0) * 28.27} 282.7"
                        transform="rotate(-90 50 50)"/>
                <defs>
                  <linearGradient id="gradient">
                    <stop offset="0%" stop-color="var(--neon-blue)"/>
                    <stop offset="100%" stop-color="var(--neon-purple)"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="efficiency-value">
                <span class="value">${analysis.overall_efficiency || 0}</span>
                <span class="label">з 10</span>
              </div>
            </div>
            <div class="efficiency-label">Загальна ефективність</div>
          </div>
        </div>
      </div>

      <div class="overview-cards">
        <div class="overview-card">
          <i class="fas fa-chart-bar"></i>
          <div class="overview-content">
            <div class="overview-label">Відповідність ринку</div>
            <div class="overview-value ${analysis.market_alignment}">${analysis.market_alignment || 'Невідомо'}</div>
          </div>
        </div>
        <div class="overview-card">
          <i class="fas fa-dollar-sign"></i>
          <div class="overview-content">
            <div class="overview-label">Економічна ефективність</div>
            <div class="overview-value">${analysis.cost_effectiveness || 0}/10</div>
          </div>
        </div>
      </div>

      <div class="analysis-grid">
        <div class="analysis-section-card success">
          <h5><i class="fas fa-check-circle"></i> Сильні сторони</h5>
          <ul class="styled-list">
            ${(analysis.strengths || []).map(strength => `<li>${strength}</li>`).join('')}
          </ul>
        </div>

        <div class="analysis-section-card warning">
          <h5><i class="fas fa-exclamation-circle"></i> Проблемні зони</h5>
          <ul class="styled-list">
            ${(analysis.concerns || []).map(concern => `<li>${concern}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="analysis-section-card">
        <h5><i class="fas fa-lightbulb"></i> Рекомендації</h5>
        <div class="recommendations-list">
          ${(analysis.recommendations || []).map(rec => `
            <div class="rec-item">
              <i class="fas fa-arrow-right"></i>
              <span>${rec}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="analysis-section-card">
        <h5><i class="fas fa-piggy-bank"></i> Оптимізація бюджету</h5>
        <div class="budget-content">
          <p>${analysis.budget_optimization || 'Немає рекомендацій щодо оптимізації'}</p>
        </div>
      </div>

      ${analysis.salary_ranges?.recommended_min > 0 ? `
      <div class="analysis-section-card">
        <h5><i class="fas fa-ruler-horizontal"></i> Рекомендовані діапазони зарплат</h5>
        <div class="salary-ranges">
          <div class="range-item">
            <span class="range-label">Мінімум</span>
            <span class="range-value">${analysis.salary_ranges.recommended_min.toLocaleString('uk-UA')} грн</span>
          </div>
          <div class="range-item current">
            <span class="range-label">Поточний середній</span>
            <span class="range-value">${analysis.salary_ranges.current_average.toLocaleString('uk-UA')} грн</span>
          </div>
          <div class="range-item">
            <span class="range-label">Максимум</span>
            <span class="range-value">${analysis.salary_ranges.recommended_max.toLocaleString('uk-UA')} грн</span>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  `;
  
  resultDiv.innerHTML = html;
  resultContainer.style.display = 'block';
  
  // Add custom styles for results
  addResultStyles();
  
  // Smooth scroll to results
  setTimeout(() => {
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Clear results
function clearSalaryResult() {
  const salaryResult = document.getElementById('salary-result');
  const jsonResults = document.getElementById('json-results');
  const salaryContent = document.getElementById('salary-analysis-content');
  
  if (salaryResult) salaryResult.style.display = 'none';
  if (jsonResults) jsonResults.style.display = 'none';
  if (salaryContent) salaryContent.innerHTML = '';
  
  showSalarySuccess('Результати очищено');
}

// Export analysis
function exportSalaryAnalysis() {
  const content = document.getElementById('salary-analysis-content');
  if (!content?.innerHTML) {
    showSalaryError('Немає даних для експорту');
    return;
  }

  // Create screenshot using html2canvas
  if (typeof html2canvas !== 'undefined') {
    html2canvas(content, {
      backgroundColor: '#0a0a0a',
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `salary-analysis-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      showSalarySuccess('Аналіз експортовано');
    }).catch(error => {
      console.error('Export error:', error);
      showSalaryError('Помилка експорту');
    });
  } else {
    // Fallback to text export
    const textContent = content.innerText;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = `salary-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showSalarySuccess('Аналіз експортовано як текст');
  }
}

// Chart functions
function drawGauge(val) {
  const ctx = document.getElementById('gauge')?.getContext('2d');
  if (!ctx) return;
  
  if (gaugeChart) gaugeChart.destroy();
  
  gaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Неефективність', 'Ефективність'],
      datasets: [{
        data: [val, Math.max(0, 100 - val)],
        backgroundColor: [
          'rgba(255, 0, 128, 0.8)',
          'rgba(0, 255, 136, 0.8)'
        ],
        borderColor: [
          'rgba(255, 0, 128, 1)',
          'rgba(0, 255, 136, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      rotation: -90 * Math.PI / 180,
      circumference: 180 * Math.PI / 180,
      cutout: '70%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed + '%';
            }
          }
        }
      }
    }
  });
}

function drawIneffChart(labels, data) {
  const ctx = document.getElementById('ineffChart')?.getContext('2d');
  if (!ctx) return;
  
  if (ineffChart) ineffChart.destroy();
  
  ineffChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Неефективність %',
        data,
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: 'rgba(255, 255, 255, 0.8)'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

// Utility functions
function safeParseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function showSalaryError(message) {
  showNotification(message, 'error');
}

function showSalarySuccess(message) {
  showNotification(message, 'success');
}

function showSalaryLoading(message) {
  // Create loading overlay
  let overlay = document.getElementById('salary-loading');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'salary-loading';
    overlay.className = 'loading-overlay';
    document.body.appendChild(overlay);
  }
  
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div class="loading-text">${message}</div>
    </div>
  `;
  
  overlay.style.display = 'flex';
}

function hideSalaryLoading() {
  const overlay = document.getElementById('salary-loading');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Use main notification system if available
function showNotification(message, type) {
  if (window.showNotification) {
    window.showNotification(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}

// Add custom styles for results
function addResultStyles() {
  if (document.getElementById('salary-result-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'salary-result-styles';
  styles.textContent = `
    /* Result Cards */
    .employee-result-card,
    .team-result-card {
      animation: fadeInUp 0.6s ease-out;
    }
    
    .result-header-section,
    .team-header-section {
      background: var(--gradient-primary);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    
    .employee-info h4,
    .team-info h4 {
      font-size: 24px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .employee-badges,
    .info-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .info-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .info-badge.salary {
      background: rgba(0, 255, 136, 0.2);
    }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .metric-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 16px;
      transition: all var(--transition-fast);
    }
    
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(168, 85, 247, 0.15);
    }
    
    .metric-icon {
      font-size: 24px;
      color: var(--accent);
    }
    
    .metric-content {
      flex: 1;
    }
    
    .metric-label {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 4px;
    }
    
    .metric-status {
      font-size: 13px;
      color: var(--muted);
    }
    
    /* Analysis Sections */
    .analysis-section-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .analysis-section-card h5 {
      font-size: 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
    }
    
    .analysis-section-card.success {
      border-left: 3px solid var(--neon-green);
    }
    
    .analysis-section-card.warning {
      border-left: 3px solid var(--neon-yellow);
    }
    
    /* Market Range */
    .market-range {
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }
    
    .range-bar {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .range-labels,
    .range-values {
      display: flex;
      justify-content: space-between;
    }
    
    .range-labels span {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
    }
    
    .range-values span {
      font-size: 16px;
      font-weight: 600;
      color: var(--accent);
    }
    
    /* Recommendations */
    .recommendations-grid {
      display: grid;
      gap: 16px;
    }
    
    .recommendation-card {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      border-left: 3px solid var(--accent);
    }
    
    .rec-icon {
      font-size: 20px;
      color: var(--accent);
    }
    
    .rec-content strong {
      display: block;
      margin-bottom: 4px;
      color: var(--text);
    }
    
    .rec-content p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    
    /* Action Timeline */
    .action-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .action-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      align-items: center;
    }
    
    .action-number {
      width: 32px;
      height: 32px;
      background: var(--gradient-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }
    
    .action-content {
      flex: 1;
      font-size: 14px;
      line-height: 1.5;
    }
    
    /* Efficiency Meter */
    .efficiency-meter {
      margin-top: 20px;
      text-align: center;
    }
    
    .efficiency-circle {
      width: 120px;
      height: 120px;
      margin: 0 auto 12px;
      position: relative;
    }
    
    .efficiency-circle svg {
      width: 100%;
      height: 100%;
    }
    
    .efficiency-value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    
    .efficiency-value .value {
      font-size: 32px;
      font-weight: 700;
      display: block;
    }
    
    .efficiency-value .label {
      font-size: 12px;
      opacity: 0.8;
    }
    
    .efficiency-label {
      font-size: 14px;
      opacity: 0.9;
    }
    
    /* Overview Cards */
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .overview-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .overview-card i {
      font-size: 24px;
      color: var(--accent);
    }
    
    .overview-content {
      flex: 1;
    }
    
    .overview-label {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 4px;
    }
    
    .overview-value {
      font-size: 18px;
      font-weight: 600;
    }
    
    .overview-value.низький { color: var(--neon-pink); }
    .overview-value.середній { color: var(--neon-yellow); }
    .overview-value.високий { color: var(--neon-green); }
    
    /* Analysis Grid */
    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    /* Styled Lists */
    .styled-list {
      list-style: none;
      padding: 0;
    }
    
    .styled-list li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .styled-list li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--accent);
      font-weight: 700;
    }
    
    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .rec-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
    }
    
    .rec-item i {
      color: var(--accent);
      margin-top: 2px;
    }
    
    /* Salary Ranges */
    .salary-ranges {
      display: flex;
      justify-content: space-between;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }
    
    .range-item {
      text-align: center;
      flex: 1;
    }
    
    .range-item.current {
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
    }
    
    .range-label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .range-value {
      font-size: 18px;
      font-weight: 600;
      color: var(--accent);
    }
    
    /* Loading Overlay */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 500;
    }
    
    .loading-content {
      text-align: center;
    }
    
    .loading-spinner {
      font-size: 48px;
      color: var(--accent);
      margin-bottom: 16px;
    }
    
    .loading-text {
      font-size: 16px;
      color: var(--text);
    }
    
    /* Mobile Adjustments */
    @media (max-width: 768px) {
      .metrics-grid,
      .analysis-grid,
      .overview-cards {
        grid-template-columns: 1fr;
      }
      
      .salary-ranges {
        flex-direction: column;
        gap: 16px;
      }
      
      .range-item.current {
        border: none;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        padding: 16px 0;
      }
      
      .efficiency-circle {
        width: 100px;
        height: 100px;
      }
      
      .efficiency-value .value {
        font-size: 24px;
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// Export functions for global use
window.switchAnalysisType = switchAnalysisType;
window.updatePerformanceValue = updatePerformanceValue;
window.analyzeEmployee = analyzeEmployee;
window.analyzeSalaryText = analyzeSalaryText;
window.clearSalaryResult = clearSalaryResult;
window.exportSalaryAnalysis = exportSalaryAnalysis;

// Initialize
console.log('Salary Analysis module loaded 💰');