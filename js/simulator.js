/* ===== ESTADO GLOBAL ===== */
const state = {
  stepIndex: 0,
  steps: [],
  running: false,
  autoTimer: null,
  op: 'add',
  gateStates: {
    and: { a: 0, b: 0 },
    or:  { a: 0, b: 0 },
    not: { a: 0 },
  },
};

/* ===== MAPA: qual ciclo cada etapa pertence ===== */
const stepToCycle = [
  'fetch',      // 0 - entrada/fetch
  'fetch',      // 1 - armazena RAM
  'decode',     // 2 - cache
  'execute',    // 3 - RAM → R1
  'execute',    // 4 - RAM → R2
  'execute',    // 5 - registradores → ULA
  'execute',    // 6 - ULA calcula
  'writeback',  // 7 - resultado → R1
  'memory',     // 8 - resultado → RAM
  'memory',     // 9 - RAM → HD
];

/* ===== MONTAGEM DOS PASSOS ===== */
function buildSteps(a, b, op) {
  const opMap = {
    add: { sym: '+',   label: 'Soma',      fn: (x, y) => x + y },
    sub: { sym: '−',   label: 'Subtração', fn: (x, y) => x - y },
    and: { sym: 'AND', label: 'AND',       fn: (x, y) => x & y },
    or:  { sym: 'OR',  label: 'OR',        fn: (x, y) => x | y },
    not: { sym: 'NOT', label: 'NOT',       fn: (x)    => ~x },
  };

  const o = opMap[op];
  const isUnary = op === 'not';
  const result = isUnary ? o.fn(a) : o.fn(a, b);

  return [
    {
      id: 'entrada',
      active: [],
      cycleStep: 'fetch',
      tag: 'Fetch — Entrada de dados',
      tagClass: '',
      log: `O usuário inseriu os valores <strong>${a}</strong>${isUnary ? '' : ` e <strong>${b}</strong>`}. O computador precisa guardar esses valores antes de trabalhar com eles. O primeiro destino é sempre a <strong>memória RAM</strong>.`,
      action: () => {}
    },
    {
      id: 'ram-store',
      active: ['comp-ram'],
      cycleStep: 'fetch',
      tag: 'Fetch — Armazenar na RAM',
      tagClass: 'ram-tag',
      log: `Os valores <strong>${a}</strong>${isUnary ? '' : ` e <strong>${b}</strong>`} foram gravados na RAM nos endereços <strong>0x00</strong>${isUnary ? '' : ` e <strong>0x01</strong>`}. A RAM é a memória principal: rápida o suficiente para uso diário, mas <strong>volátil</strong> — perde tudo quando o computador é desligado.`,
      action: () => {
        setRam('0x00', a, 'Valor A');
        if (!isUnary) setRam('0x01', b, 'Valor B');
        animateParticle('comp-cpu', 'comp-ram');
      }
    },
    {
      id: 'cache',
      active: ['comp-cache'],
      cycleStep: 'decode',
      tag: 'Decode — Passagem pela Cache',
      tagClass: 'cache-tag',
      log: `Antes de chegar à CPU, o dado passa pela <strong>memória cache</strong>. A cache é muito menor que a RAM, mas muito mais rápida. Ela guarda os dados que a CPU vai usar em breve para evitar buscas lentas na RAM toda vez.`,
      action: () => {
        setVal('val-cache', isUnary ? `[${a}]` : `[${a}, ${b}]`);
        animateParticle('comp-ram', 'comp-cache');
      }
    },
    {
      id: 'r1-load',
      active: ['comp-r1', 'comp-cpu'],
      cycleStep: 'execute',
      tag: 'Execute — Cache → Registrador R1',
      tagClass: 'reg-tag',
      log: `O valor <strong>${a}</strong> foi transferido para o <strong>Registrador R1</strong>, dentro da CPU. Registradores são a memória mais rápida do computador — ficam dentro do próprio processador. São minúsculos, mas operam em velocidades altíssimas.`,
      action: () => {
        setVal('val-r1', a);
        animateParticle('comp-cache', 'comp-r1');
      }
    },
    ...(!isUnary ? [{
      id: 'r2-load',
      active: ['comp-r2', 'comp-cpu'],
      cycleStep: 'execute',
      tag: 'Execute — Cache → Registrador R2',
      tagClass: 'reg-tag',
      log: `O valor <strong>${b}</strong> foi transferido para o <strong>Registrador R2</strong>. Agora a CPU tem os dois operandos disponíveis internamente e está pronta para calcular.`,
      action: () => {
        setVal('val-r2', b);
        animateParticle('comp-cache', 'comp-r2');
      }
    }] : []),
    {
      id: 'ula-receive',
      active: ['comp-ula', 'comp-cpu'],
      cycleStep: 'execute',
      tag: `Execute — Registrador${isUnary ? '' : 'es'} → ULA`,
      tagClass: 'ula-tag',
      log: `${isUnary ? 'R1 enviou seu valor' : 'R1 e R2 enviaram seus valores'} para a <strong>ULA (Unidade Lógica e Aritmética)</strong>. A ULA é o componente responsável por todos os cálculos do computador — somas, subtrações, comparações e operações lógicas.`,
      action: () => {
        setVal('val-ula', isUnary ? `${o.sym}(${a})` : `${a} ${o.sym} ${b}`);
        animateParticle('comp-r1', 'comp-ula');
        if (!isUnary) setTimeout(() => animateParticle('comp-r2', 'comp-ula'), 150);
      }
    },
    {
      id: 'ula-calc',
      active: ['comp-ula', 'comp-cpu'],
      cycleStep: 'execute',
      tag: `Execute — ULA calcula ${o.label}`,
      tagClass: 'ula-tag',
      log: `A ULA calculou <strong>${isUnary ? `${o.sym}(${a})` : `${a} ${o.sym} ${b}`} = ${result}</strong>. Este é o momento central da simulação: o processamento de fato aconteceu. Tudo antes era preparação — tudo depois é guardar o resultado.`,
      action: () => {
        setVal('val-ula', `= ${result}`);
      }
    },
    {
      id: 'writeback',
      active: ['comp-r1', 'comp-cpu'],
      cycleStep: 'writeback',
      tag: 'Writeback — Resultado → Registrador R1',
      tagClass: 'reg-tag',
      log: `O resultado <strong>${result}</strong> foi salvo de volta no <strong>Registrador R1</strong>. Esta etapa se chama <strong>Writeback</strong> no ciclo de instrução — é o "salvar o rascunho" para a CPU usar o resultado na próxima operação.`,
      action: () => {
        setVal('val-r1', result);
        setVal('val-r2', '—', true);
        animateParticle('comp-ula', 'comp-r1');
      }
    },
    {
      id: 'ram-result',
      active: ['comp-ram'],
      cycleStep: 'memory',
      tag: 'Memory — Resultado → RAM',
      tagClass: 'ram-tag',
      log: `O resultado <strong>${result}</strong> foi escrito de volta na RAM, no endereço <strong>0x02</strong>. A memória agora contém o valor calculado. Atenção: se o computador for desligado agora, esse valor se perde.`,
      action: () => {
        setRam('0x02', result, 'Resultado');
        animateParticle('comp-r1', 'comp-ram');
      }
    },
    {
      id: 'hd-store',
      active: ['comp-hd'],
      cycleStep: 'memory',
      tag: 'Memory — Gravar no HD/SSD',
      tagClass: 'hd-tag',
      log: `O resultado <strong>${result}</strong> foi salvo no <strong>HD/SSD</strong>. Diferente da RAM, o armazenamento secundário é <strong>permanente</strong> — mantém os dados mesmo sem energia. É mais lento, mas nunca esquece. ✅ Simulação concluída!`,
      action: () => {
        addHdEntry(`resultado_${Date.now() % 10000}`, result);
        animateParticle('comp-ram', 'comp-hd');
      }
    },
  ];
}

/* ===== INICIALIZAÇÃO ===== */
document.addEventListener('DOMContentLoaded', () => {
  setupOpButtons();
  setupControls();
  setupTheme();
  setupUlaModal();
  setupGates();
  setupTooltips();
  setupSpeedSlider();
  buildProgressDots(0);
});

/* ===== BOTÕES DE OPERAÇÃO ===== */
function setupOpButtons() {
  document.querySelectorAll('.op-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.op-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.op = btn.dataset.op;
      resetSim();
    });
  });
}

/* ===== CONTROLES PRINCIPAIS ===== */
function setupControls() {
  document.getElementById('btn-step').addEventListener('click', stepForward);
  document.getElementById('btn-auto').addEventListener('click', toggleAuto);
  document.getElementById('btn-reset').addEventListener('click', resetSim);
}

function stepForward() {
  const a = parseInt(document.getElementById('input-a').value) || 0;
  const b = parseInt(document.getElementById('input-b').value) || 0;

  if (state.stepIndex === 0) {
    state.steps = buildSteps(a, b, state.op);
    buildProgressDots(state.steps.length);
  }

  if (state.stepIndex >= state.steps.length) {
    resetSim();
    return;
  }

  executeStep(state.steps[state.stepIndex]);
  state.stepIndex++;
  updateProgressDots();

  const btn = document.getElementById('btn-step');
  if (state.stepIndex >= state.steps.length) {
    btn.textContent = '↺ Recomeçar';
  } else {
    btn.textContent = `▶ Passo ${state.stepIndex + 1} / ${state.steps.length}`;
  }
}

function toggleAuto() {
  const btn = document.getElementById('btn-auto');
  if (state.autoTimer) {
    clearInterval(state.autoTimer);
    state.autoTimer = null;
    btn.textContent = '⏩ Automático';
    return;
  }

  btn.textContent = '⏸ Pausar';
  const delay = parseInt(document.getElementById('speed-range').value);

  stepForward();

  state.autoTimer = setInterval(() => {
    if (state.stepIndex >= state.steps.length) {
      clearInterval(state.autoTimer);
      state.autoTimer = null;
      btn.textContent = '⏩ Automático';
      return;
    }
    stepForward();
  }, delay);
}

function resetSim() {
  clearInterval(state.autoTimer);
  state.autoTimer = null;
  state.stepIndex = 0;
  state.steps = [];

  document.getElementById('btn-step').textContent = '▶ Próximo passo';
  document.getElementById('btn-auto').textContent = '⏩ Automático';

  setVal('val-r1', '—', true);
  setVal('val-r2', '—', true);
  setVal('val-ula', '—', true);
  setVal('val-cache', '—', true);

  clearRam();
  clearHd();
  clearLog();
  clearActiveComps();
  clearCycleSteps();
  buildProgressDots(0);
  document.getElementById('progress-text').textContent = '0 / 0';
}

/* ===== EXECUTAR UM PASSO ===== */
function executeStep(step) {
  clearActiveComps();
  step.active.forEach(id => {
    document.getElementById(id)?.classList.add('active');
  });

  highlightCycleStep(step.cycleStep);
  step.action();
  addLog(step.tag, step.tagClass, step.log);
}

/* ===== FUNÇÕES DE UI ===== */
function setVal(id, val, empty = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val ?? '—';
  el.classList.toggle('empty', empty || val === '—' || val == null);
}

function setRam(addr, val, label = '') {
  const cell = document.getElementById(`ram-${addr}`);
  if (!cell) return;
  cell.textContent = val;
  cell.classList.add('val-changed');
  const row = cell.parentElement;
  if (label) row.children[2].textContent = label;
  row.classList.add('ram-active');
  setTimeout(() => {
    cell.classList.remove('val-changed');
    row.classList.remove('ram-active');
  }, 1200);
}

function clearRam() {
  ['0x00','0x01','0x02','0x03','0x04','0x05'].forEach(addr => {
    const cell = document.getElementById(`ram-${addr}`);
    if (cell) {
      cell.textContent = '—';
      cell.parentElement.children[2].textContent = '—';
    }
  });
}

function addHdEntry(key, val) {
  const container = document.getElementById('hd-entries');
  const empty = container.querySelector('.hd-empty');
  if (empty) empty.remove();

  const entry = document.createElement('div');
  entry.className = 'hd-entry new-entry';
  entry.innerHTML = `<span class="hd-key">${key}</span><span>${val}</span>`;
  container.appendChild(entry);
}

function clearHd() {
  const container = document.getElementById('hd-entries');
  container.innerHTML = '<span class="hd-empty">Nenhum dado gravado ainda.</span>';
}

function addLog(tag, tagClass, text) {
  const area = document.getElementById('log-area');
  const placeholder = area.querySelector('.log-placeholder');
  if (placeholder) placeholder.remove();

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <div class="log-tag ${tagClass}">${tag}</div>
    <div class="log-text">${text}</div>
  `;

  area.insertBefore(entry, area.firstChild);
}

function clearLog() {
  const area = document.getElementById('log-area');
  area.innerHTML = '<div class="log-placeholder">Insira dois valores, escolha uma operação e clique em <strong>Próximo passo</strong> para iniciar a simulação.</div>';
}

function clearActiveComps() {
  document.querySelectorAll('.comp.active, .cpu-box.active').forEach(el => {
    el.classList.remove('active');
  });
}

/* ===== CICLO DE INSTRUÇÃO ===== */
const cycleIds = ['fetch', 'decode', 'execute', 'memory', 'writeback'];

function highlightCycleStep(step) {
  cycleIds.forEach(id => {
    const el = document.getElementById(`cs-${id}`);
    if (!el) return;
    el.classList.remove('active', 'done');
    const idx = cycleIds.indexOf(id);
    const activeIdx = cycleIds.indexOf(step);
    if (id === step) el.classList.add('active');
    else if (idx < activeIdx) el.classList.add('done');
  });
}

function clearCycleSteps() {
  cycleIds.forEach(id => {
    document.getElementById(`cs-${id}`)?.classList.remove('active', 'done');
  });
}

/* ===== PROGRESSO ===== */
function buildProgressDots(total) {
  const container = document.getElementById('progress-dots');
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'pdot';
    dot.id = `pdot-${i}`;
    container.appendChild(dot);
  }
}

function updateProgressDots() {
  const total = state.steps.length;
  document.getElementById('progress-text').textContent = `${state.stepIndex} / ${total}`;
  for (let i = 0; i < total; i++) {
    const dot = document.getElementById(`pdot-${i}`);
    if (!dot) continue;
    dot.classList.remove('done', 'active');
    if (i < state.stepIndex - 1) dot.classList.add('done');
    else if (i === state.stepIndex - 1) dot.classList.add('active');
  }
}

/* ===== ANIMAÇÃO DE PARTÍCULA ===== */
function animateParticle(fromId, toId) {
  const from = document.getElementById(fromId);
  const to   = document.getElementById(toId);
  if (!from || !to) return;

  const fr = from.getBoundingClientRect();
  const tr = to.getBoundingClientRect();

  const startX = fr.left + fr.width  / 2;
  const startY = fr.top  + fr.height / 2;
  const endX   = tr.left + tr.width  / 2;
  const endY   = tr.top  + tr.height / 2;

  const particle = document.createElement('div');
  particle.className = 'data-particle';
  particle.style.left = `${startX}px`;
  particle.style.top  = `${startY}px`;
  document.body.appendChild(particle);

  anime({
    targets: particle,
    left: endX,
    top: endY,
    duration: 600,
    easing: 'easeInOutQuad',
    complete: () => particle.remove(),
  });
}

/* ===== TEMA ===== */
function setupTheme() {
  const btn = document.getElementById('btn-theme');
  const html = document.documentElement;

  const saved = localStorage.getItem('oc-theme') || 'light';
  html.setAttribute('data-theme', saved);
  btn.textContent = saved === 'dark' ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('oc-theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/* ===== TOOLTIPS ===== */
function setupTooltips() {
  tippy('[data-tippy-content]', {
    theme: 'oc',
    allowHTML: true,
    placement: 'top',
    arrow: true,
    delay: [200, 0],
  });
}

/* ===== VELOCIDADE ===== */
function setupSpeedSlider() {
  const range = document.getElementById('speed-range');
  const label = document.getElementById('speed-val');
  range.addEventListener('input', () => {
    label.textContent = `${(range.value / 1000).toFixed(1)}s`;
  });
}

/* ===== MODAL ULA ===== */
function setupUlaModal() {
  const overlay = document.getElementById('ula-modal-overlay');
  document.getElementById('btn-ula-modal').addEventListener('click', () => {
    overlay.classList.add('open');
  });
  document.getElementById('ula-modal-close').addEventListener('click', () => {
    overlay.classList.remove('open');
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
}

/* ===== MINI SIMULADOR DE PORTAS LÓGICAS ===== */
function setupGates() {
  document.querySelectorAll('.bit-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const gate  = btn.dataset.gate;
      const input = btn.dataset.input;
      const current = state.gateStates[gate][input];
      const next = current === 0 ? 1 : 0;
      state.gateStates[gate][input] = next;
      btn.textContent = next;
      btn.classList.toggle('on', next === 1);
      updateGateResult(gate);
    });
  });

  updateGateResult('and');
  updateGateResult('or');
  updateGateResult('not');
}

function updateGateResult(gate) {
  const s = state.gateStates;
  let result;

  if (gate === 'and') {
    result = s.and.a & s.and.b;
    document.getElementById('gate-and-result').textContent = result;
    highlightTruth('and', `${s.and.a}${s.and.b}`);
  } else if (gate === 'or') {
    result = s.or.a | s.or.b;
    document.getElementById('gate-or-result').textContent = result;
    highlightTruth('or', `${s.or.a}${s.or.b}`);
  } else if (gate === 'not') {
    result = s.not.a === 0 ? 1 : 0;
    document.getElementById('gate-not-result').textContent = result;
    highlightTruth('not', `${s.not.a}`);
  }
}

function highlightTruth(gate, key) {
  const prefix = gate === 'not' ? `not-${key}` : `${gate}-${key}`;
  const allRows = document.querySelectorAll(`[id^="${gate}-"]`);
  allRows.forEach(r => r.classList.remove('highlight'));
  const target = document.getElementById(prefix);
  if (target) target.classList.add('highlight');
}