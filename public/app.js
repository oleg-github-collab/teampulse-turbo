// Tabs
const tabs = document.querySelectorAll('.tab[data-tab]');
const sections = { neg: document.getElementById('neg'), salary: document.getElementById('salary') };
tabs.forEach(t => t.addEventListener('click', () => {
  if (t.classList.contains('disabled')) return;
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  Object.values(sections).forEach(s => s.style.display = 'none');
  const key = t.dataset.tab;
  if (sections[key]) sections[key].style.display = 'block';
}));

// Onboarding
const onboarding = document.getElementById('onboarding');
const steps = [...onboarding.querySelectorAll('.onboarding-step')];
const dots = [...onboarding.querySelectorAll('.onboarding-dot')];
let stepIdx = 0;
function openOnboarding(){ onboarding.classList.add('active'); }
function closeOnboarding(){ onboarding.classList.remove('active'); }
window.skipOnboarding = closeOnboarding;
window.nextOnboardingStep = () => {
  steps[stepIdx].classList.remove('active'); dots[stepIdx].classList.remove('active');
  stepIdx = Math.min(stepIdx+1, steps.length-1);
  steps[stepIdx].classList.add('active'); dots[stepIdx].classList.add('active');
  if (stepIdx === steps.length-1) setTimeout(closeOnboarding, 900);
};
setTimeout(openOnboarding, 400);

// Modal actions (stubs to match snippet if needed)
window.closeEditModal = () => document.getElementById('edit-modal')?.classList.remove('active');
window.saveEditModal = () => document.getElementById('edit-modal')?.classList.remove('active');

// Profile gathering
function gatherProfile(){
  return {
    company: document.getElementById('company').value.trim(),
    negotiator: document.getElementById('negotiator').value.trim(),
    sector: document.getElementById('sector').value.trim(),
    goal: document.getElementById('goal').value.trim(),
    criteria: document.getElementById('criteria').value.trim(),
    constraints: document.getElementById('constraints').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };
}

// Drag & drop
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file');
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('dragover');
  if (e.dataTransfer.files?.length) fileInput.files = e.dataTransfer.files;
});

// Fullscreen + Screenshot
const streamEl = document.getElementById('stream');
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) streamEl.requestFullscreen?.();
  else document.exitFullscreen?.();
});
document.getElementById('screenshotBtn').addEventListener('click', async () => {
  const canvas = await html2canvas(streamEl);
  const link = document.createElement('a');
  link.download = `teampulse_turbo_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Analyze
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const inputText = document.getElementById('inputText').value.trim();
  const file = fileInput.files?.[0];
  const profile = gatherProfile();

  const form = new FormData();
  form.append('profile', JSON.stringify(profile));
  if (file) form.append('file', file);
  else form.append('text', inputText);

  streamEl.textContent = '';
  document.getElementById('badJson').style.display = 'none';
  document.getElementById('annotated').style.display = 'none';

  const res = await fetch('/api/analyze', { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(()=>({error: res.statusText}));
    streamEl.textContent = 'Помилка: ' + (err.error || res.statusText);
    return;
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

  // Try to parse final JSON
  try {
    const jsonStart = full.indexOf('{');
    const jsonEnd = full.lastIndexOf('}');
    const jsonText = full.slice(jsonStart, jsonEnd+1);
    const parsed = JSON.parse(jsonText);

    // Highlights (works only if original text present in textarea)
    const original = inputText || 'Текст у файлі (показ оригіналу доступний при вставленні тексту).';
    const highlights = [];
    for (const b of (parsed.biases||[])) highlights.push({span:b.text_span, cls:'bias'});
    for (const m of (parsed.manipulations||[])) highlights.push({span:m.text_span, cls:'manip'});
    for (const f of (parsed.rhetological_fallacies||[])) highlights.push({span:f.text_span, cls:'fallacy'});
    for (const c of (parsed.cognitive_distortions||[])) highlights.push({span:c.text_span, cls:'cog'});
    const html = highlightBySpans(original, highlights);
    const highlightedEl = document.getElementById('highlighted');
    highlightedEl.innerHTML = html;
    document.getElementById('annotated').style.display = 'block';
  } catch (e) {
    document.getElementById('badJson').style.display = 'block';
  }
});

function highlightBySpans(text, items){
  items = (items||[]).filter(x => x?.span && Number.isFinite(x.span.start) && Number.isFinite(x.span.end) && x.span.end > x.span.start);
  items.sort((a,b)=> a.span.start - b.span.start);
  let i=0, out='';
  for (const it of items){
    const s = it.span.start, e = it.span.end;
    if (s > i) out += escapeHTML(text.slice(i, s));
    out += `<mark class="${it.cls}">` + escapeHTML(text.slice(s, e)) + `</mark>`;
    i = e;
  }
  if (i < text.length) out += escapeHTML(text.slice(i));
  return out;
}
function escapeHTML(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// Salary Analysis
document.getElementById('salaryBtn').addEventListener('click', async () => {
  const payload = safeParseJSON(document.getElementById('salaryJson').value);
  if (!payload){ alert('Невалідний JSON'); return; }
  const res = await fetch('/api/salary', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=>({error:'bad response'}));
  if (!data.ok){ document.getElementById('salaryOut').textContent = 'Помилка: ' + (data.error||''); return; }
  document.getElementById('salaryOut').textContent = data.raw;

  // Charts
  try {
    const parsed = JSON.parse(data.raw);
    const team = parsed.team_summary || {};
    const gaugeVal = team.total_inefficiency_percent || 0;
    drawGauge(gaugeVal);
    const per = parsed.per_employee || [];
    drawIneffChart(per.map(p=>p.name), per.map(p=>p.inefficiency_percent||0));
  } catch {}
});

function safeParseJSON(s){ try{ return JSON.parse(s) }catch{ return null } }

// Charts
let gaugeChart, ineffChart;
function drawGauge(val){
  const ctx = document.getElementById('gauge').getContext('2d');
  if (gaugeChart) gaugeChart.destroy();
  gaugeChart = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:['Неефективність', 'Ефективність'], datasets:[{ data:[val, Math.max(0, 100-val)] }]},
    options:{
      rotation: -90 * Math.PI/180,
      circumference: 180 * Math.PI/180,
      cutout: '70%',
      plugins:{ legend:{ display:false } }
    }
  });
}
function drawIneffChart(labels, data){
  const ctx = document.getElementById('ineffChart').getContext('2d');
  if (ineffChart) ineffChart.destroy();
  ineffChart = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[{ label:'Неефективність %', data }]},
    options:{ plugins:{ legend:{ display:true } }, scales:{ y:{ beginAtZero:true, max:100 } } }
  });
}
