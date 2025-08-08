// Salary Analysis Functions
let currentAnalysisType = 'form';

function switchAnalysisType(type) {
  // Оновити кнопки
  document.querySelectorAll('.analysis-type-selector .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`${type}-analysis-btn`).classList.add('active');

  // Показати відповідну секцію
  document.querySelectorAll('.analysis-section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById(`${type}-analysis`).style.display = 'block';

  // Сховати результати при зміні типу
  document.getElementById('salary-result').style.display = 'none';
  document.getElementById('json-results').style.display = 'none';

  currentAnalysisType = type;
}

function updatePerformanceValue(value) {
  document.getElementById('performance-value').textContent = value;
  
  // Додати візуальну індикацію якості
  const valueElement = document.getElementById('performance-value');
  valueElement.className = 'performance-value';
  
  if (value <= 3) {
    valueElement.classList.add('low-performance');
  } else if (value <= 6) {
    valueElement.classList.add('medium-performance');
  } else {
    valueElement.classList.add('high-performance');
  }
}

async function analyzeEmployee() {
  const employeeData = {
    name: document.getElementById('emp-name').value.trim(),
    position: document.getElementById('emp-position').value.trim(),
    salary: parseInt(document.getElementById('emp-salary').value),
    experience: parseFloat(document.getElementById('emp-experience').value) || null,
    skills: document.getElementById('emp-skills').value.trim() || null,
    education: document.getElementById('emp-education').value.trim() || null,
    department: document.getElementById('emp-department').value || null,
    performance: parseInt(document.getElementById('emp-performance').value),
    location: document.getElementById('emp-location').value || null
  };

  // Валідація
  if (!employeeData.name || !employeeData.position || !employeeData.salary) {
    showError('Будь ласка, заповніть обов\'язкові поля (ім\'я, посада, зарплата)');
    return;
  }

  if (employeeData.salary < 1000 || employeeData.salary > 1000000) {
    showError('Зарплата повинна бути в діапазоні від 1000 до 1000000 грн');
    return;
  }

  try {
    showLoading('Аналізую профіль працівника...');
    
    const response = await fetch('/api/salary-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      displayEmployeeAnalysis(data.analysis, data.employee);
    } else {
      showError(data.error || 'Помилка аналізу працівника');
    }
  } catch (error) {
    console.error('Employee analysis error:', error);
    showError('Помилка з\'єднання при аналізі працівника');
  } finally {
    hideLoading();
  }
}

async function analyzeSalaryText() {
  const textData = document.getElementById('salary-text').value.trim();
  
  if (!textData || textData.length < 20) {
    showError('Будь ласка, введіть детальний опис команди (мінімум 20 символів)');
    return;
  }

  try {
    showLoading('Аналізую опис команди...');
    
    const response = await fetch('/api/salary-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textData })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      displayTextAnalysis(data.analysis);
    } else {
      showError(data.error || 'Помилка аналізу текста');
    }
  } catch (error) {
    console.error('Text analysis error:', error);
    showError('Помилка з\'єднання при аналізі тексту');
  } finally {
    hideLoading();
  }
}

function displayEmployeeAnalysis(analysis, employee) {
  const resultDiv = document.getElementById('salary-analysis-content');
  const resultContainer = document.getElementById('salary-result');
  
  const html = `
    <div class="employee-analysis-result">
      <div class="employee-header">
        <h4>👤 ${employee.name}</h4>
        <div class="employee-details">
          <span class="badge">${employee.position}</span>
          <span class="badge">${employee.salary.toLocaleString()} грн/міс</span>
        </div>
      </div>

      <div class="analysis-grid">
        <div class="metric-card">
          <div class="metric-title">Справедливість зарплати</div>
          <div class="metric-score">${analysis.employee_analysis.salary_fairness}/10</div>
          <div class="metric-status">${analysis.employee_analysis.market_position}</div>
        </div>

        <div class="metric-card">
          <div class="metric-title">Співвідношення результат/зарплата</div>
          <div class="metric-score">${analysis.employee_analysis.performance_ratio}/10</div>
          <div class="metric-status">${analysis.employee_analysis.growth_potential} потенціал</div>
        </div>

        <div class="metric-card">
          <div class="metric-title">Ризик втрати</div>
          <div class="metric-score">${analysis.risk_assessment.flight_probability}/10</div>
          <div class="metric-status">${analysis.risk_assessment.retention_risk} ризик</div>
        </div>
      </div>

      <div class="market-data-section">
        <h5>📈 Ринкові дані</h5>
        <div class="salary-range">
          <div class="range-item">
            <span>Мінімум на ринку:</span>
            <strong>${analysis.market_data.position_range_min?.toLocaleString()} грн</strong>
          </div>
          <div class="range-item">
            <span>Медіана ринку:</span>
            <strong>${analysis.market_data.market_median?.toLocaleString()} грн</strong>
          </div>
          <div class="range-item">
            <span>Максимум на ринку:</span>
            <strong>${analysis.market_data.position_range_max?.toLocaleString()} грн</strong>
          </div>
        </div>
      </div>

      <div class="recommendations-section">
        <h5>💡 Рекомендації</h5>
        <div class="recommendation-item">
          <strong>Зарплата:</strong>
          <p>${analysis.recommendations.salary_adjustment}</p>
        </div>
        <div class="recommendation-item">
          <strong>Кар'єрний розвиток:</strong>
          <p>${analysis.recommendations.career_development}</p>
        </div>
        <div class="recommendation-item">
          <strong>Навички:</strong>
          <p>${analysis.recommendations.skills_improvement}</p>
        </div>
      </div>

      <div class="action-plan-section">
        <h5>🎯 План дій</h5>
        <ul class="action-list">
          ${analysis.action_plan.map(action => `<li>${action}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
  
  resultDiv.innerHTML = html;
  resultContainer.style.display = 'block';
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function displayTextAnalysis(analysis) {
  const resultDiv = document.getElementById('salary-analysis-content');
  const resultContainer = document.getElementById('salary-result');
  
  const html = `
    <div class="team-analysis-result">
      <div class="team-header">
        <h4>🏢 Аналіз команди</h4>
        <div class="overall-score">
          <div class="score-circle">
            <div class="score-value">${analysis.overall_efficiency}/10</div>
            <div class="score-label">Ефективність</div>
          </div>
        </div>
      </div>

      <div class="analysis-overview">
        <div class="overview-item">
          <div class="overview-label">Відповідність ринку</div>
          <div class="overview-value ${analysis.market_alignment}">${analysis.market_alignment}</div>
        </div>
        <div class="overview-item">
          <div class="overview-label">Економічна ефективність</div>
          <div class="overview-value">${analysis.cost_effectiveness}/10</div>
        </div>
      </div>

      <div class="strengths-section">
        <h5>✅ Сильні сторони</h5>
        <ul class="strengths-list">
          ${analysis.strengths.map(strength => `<li>${strength}</li>`).join('')}
        </ul>
      </div>

      <div class="concerns-section">
        <h5>⚠️ Проблемні зони</h5>
        <ul class="concerns-list">
          ${analysis.concerns.map(concern => `<li>${concern}</li>`).join('')}
        </ul>
      </div>

      <div class="recommendations-section">
        <h5>💡 Рекомендації</h5>
        <ul class="recommendations-list">
          ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>

      <div class="budget-section">
        <h5>💰 Оптимізація бюджету</h5>
        <p>${analysis.budget_optimization}</p>
      </div>

      ${analysis.salary_ranges.recommended_min > 0 ? `
      <div class="salary-ranges-section">
        <h5>📊 Рекомендовані діапазони зарплат</h5>
        <div class="ranges-grid">
          <div class="range-card">
            <div class="range-label">Мінімум</div>
            <div class="range-value">${analysis.salary_ranges.recommended_min.toLocaleString()} грн</div>
          </div>
          <div class="range-card">
            <div class="range-label">Поточний середній</div>
            <div class="range-value">${analysis.salary_ranges.current_average.toLocaleString()} грн</div>
          </div>
          <div class="range-card">
            <div class="range-label">Максимум</div>
            <div class="range-value">${analysis.salary_ranges.recommended_max.toLocaleString()} грн</div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  `;
  
  resultDiv.innerHTML = html;
  resultContainer.style.display = 'block';
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function clearSalaryResult() {
  document.getElementById('salary-result').style.display = 'none';
  document.getElementById('json-results').style.display = 'none';
  document.getElementById('salary-analysis-content').innerHTML = '';
}

function exportSalaryAnalysis() {
  const content = document.getElementById('salary-analysis-content');
  if (!content.innerHTML) {
    showError('Немає даних для експорту');
    return;
  }

  // Створити PDF за допомогою html2canvas (спрощена версія)
  html2canvas(content, {
    backgroundColor: '#0a0a0a',
    scale: 2
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `salary-analysis-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }).catch(error => {
    console.error('Export error:', error);
    showError('Помилка експорту. Спробуйте ще раз.');
  });
}

// Utility functions with improved UI feedback
function showError(message) {
  console.error('Salary Analysis Error:', message);
  
  // Create or show error notification
  let errorEl = document.getElementById('salary-error-notification');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'salary-error-notification';
    errorEl.className = 'error-notification';
    document.body.appendChild(errorEl);
  }
  
  errorEl.innerHTML = `
    <div class="error-content">
      <i class="fas fa-exclamation-triangle"></i>
      <span>${message}</span>
      <button class="error-close" onclick="hideError()">×</button>
    </div>
  `;
  errorEl.style.display = 'block';
  
  // Auto-hide after 10 seconds
  setTimeout(hideError, 10000);
}

function hideError() {
  const errorEl = document.getElementById('salary-error-notification');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

function showLoading(message) {
  console.log('Loading:', message);
  
  // Create or show loading overlay
  let loadingEl = document.getElementById('salary-loading-overlay');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'salary-loading-overlay';
    loadingEl.className = 'loading-overlay';
    document.body.appendChild(loadingEl);
  }
  
  loadingEl.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div class="loading-text">${message}</div>
    </div>
  `;
  loadingEl.style.display = 'flex';
}

function hideLoading() {
  console.log('Loading complete');
  const loadingEl = document.getElementById('salary-loading-overlay');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

// Стилі для результату аналізу
const salaryAnalysisStyles = `
<style>
.analysis-type-selector {
  margin-bottom: 24px;
}

.analysis-type-selector .btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.analysis-type-selector .btn-group .btn {
  flex: 1;
  min-width: 150px;
}

.employee-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.performance-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.performance-slider input[type="range"] {
  flex: 1;
  margin: 0;
}

.performance-value {
  min-width: 30px;
  text-align: center;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all var(--transition-base);
}

.performance-value.low-performance {
  background: rgba(255, 0, 128, 0.2);
  color: var(--neon-pink);
}

.performance-value.medium-performance {
  background: rgba(255, 234, 0, 0.2);
  color: var(--neon-yellow);
}

.performance-value.high-performance {
  background: rgba(0, 255, 136, 0.2);
  color: var(--neon-green);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.result-actions {
  display: flex;
  gap: 8px;
}

/* Employee Analysis Styles */
.employee-analysis-result {
  animation: fadeInUp 0.6s ease-out;
}

.employee-header {
  background: var(--gradient-primary);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  text-align: center;
}

.employee-details {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
  flex-wrap: wrap;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all var(--transition-base);
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(168, 85, 247, 0.15);
}

.metric-title {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-score {
  font-size: 28px;
  font-weight: 800;
  color: var(--neon-purple);
  margin-bottom: 4px;
}

.metric-status {
  font-size: 13px;
  color: var(--muted);
}

.market-data-section,
.recommendations-section,
.action-plan-section,
.strengths-section,
.concerns-section,
.budget-section,
.salary-ranges-section {
  margin-bottom: 24px;
}

.market-data-section h5,
.recommendations-section h5,
.action-plan-section h5,
.strengths-section h5,
.concerns-section h5,
.budget-section h5,
.salary-ranges-section h5 {
  margin-bottom: 16px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.salary-range {
  display: grid;
  gap: 12px;
}

.range-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border-left: 3px solid var(--neon-blue);
}

.recommendation-item {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 3px solid var(--neon-green);
}

.recommendation-item strong {
  color: var(--neon-green);
  display: block;
  margin-bottom: 6px;
}

.recommendation-item p {
  margin: 0;
  line-height: 1.5;
}

.action-list,
.strengths-list,
.concerns-list,
.recommendations-list {
  list-style: none;
  padding: 0;
}

.action-list li,
.strengths-list li,
.recommendations-list li {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border-left: 3px solid var(--neon-yellow);
  position: relative;
  padding-left: 30px;
}

.strengths-list li {
  border-left-color: var(--neon-green);
}

.concerns-list li {
  border-left-color: var(--neon-pink);
}

.action-list li::before {
  content: "→";
  position: absolute;
  left: 12px;
  color: var(--neon-yellow);
  font-weight: 600;
}

.strengths-list li::before {
  content: "✓";
  position: absolute;
  left: 12px;
  color: var(--neon-green);
  font-weight: 600;
}

.concerns-list li::before {
  content: "!";
  position: absolute;
  left: 12px;
  color: var(--neon-pink);
  font-weight: 600;
}

.recommendations-list li::before {
  content: "💡";
  position: absolute;
  left: 8px;
}

/* Team Analysis Styles */
.team-analysis-result {
  animation: fadeInUp 0.6s ease-out;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--gradient-secondary);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.score-circle {
  text-align: center;
}

.score-value {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}

.score-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.analysis-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.overview-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.overview-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.overview-value {
  font-size: 20px;
  font-weight: 700;
}

.overview-value.низький { color: var(--neon-pink); }
.overview-value.середній { color: var(--neon-yellow); }
.overview-value.високий { color: var(--neon-green); }

.ranges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.range-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.range-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}

.range-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--neon-blue);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .employee-form .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .employee-details {
    flex-direction: column;
    align-items: center;
  }
  
  .analysis-grid {
    grid-template-columns: 1fr;
  }
  
  .range-item {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .analysis-type-selector .btn-group .btn {
    min-width: auto;
    font-size: 12px;
    padding: 8px 12px;
  }

  .team-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
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
</style>
`;

// Додати стилі до head при завантаженні
document.head.insertAdjacentHTML('beforeend', salaryAnalysisStyles);

// Експортувати функції для глобального використання
window.switchAnalysisType = switchAnalysisType;
window.updatePerformanceValue = updatePerformanceValue;
window.analyzeEmployee = analyzeEmployee;
window.analyzeSalaryText = analyzeSalaryText;
window.clearSalaryResult = clearSalaryResult;
window.exportSalaryAnalysis = exportSalaryAnalysis;
window.hideError = hideError;