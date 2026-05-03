/* ===== ESTADO ===== */
const state = {
  stepIndex: 0,
  steps: [],
  autoTimer: null,
  op: 'add',
  gateStates: {
    and: { a: 0, b: 0 },
    or:  { a: 0, b: 0 },
    not: { a: 0 },
  },
};

/* ===== UTILITÁRIOS ===== */
function toBin(n, bits = 8) {
  if (n < 0) {
    // complemento de dois para negativos
    return (n >>> 0).toString(2).slice(-bits);
  }
  return n.toString(2).padStart(bits, '0');
}

function binResult(a, b, op) {
  const binA = toBin(a);
  const binB = toBin(b);
  switch (op) {
    case 'and': return { binA, binB, binR: toBin(a & b), result: a & b };
    case 'or':  return { binA, binB, binR: toBin(a | b), result: a | b };
    case 'not': return { binA, binR: toBin(~a),          result: ~a };
  }
}

/* ===== MONTAGEM DOS PASSOS ===== */
function buildSteps(a, b, op) {
  const isLogical = ['and', 'or', 'not'].includes(op);
  const isUnary   = op === 'not';

  const opMap = {
    add: { sym: '+',   label: 'Soma',      fn: () => a + b },
    sub: { sym: '−',   label: 'Subtração', fn: () => a - b },
    and: { sym: 'AND', label: 'AND',       fn: () => a & b },
    or:  { sym: 'OR',  label: 'OR',        fn: () => a | b },
    not: { sym: 'NOT', label: 'NOT',       fn: () => ~a    },
  };

  const o      = opMap[op];
  const result = o.fn();

  const logicalBinBlock = () => {
    if (!isLogical) return '';
    const { binA, binB, binR } = binResult(a, b, op);
    if (isUnary) {
      return `<span class="binary-block">
  A   = ${a} → <span class="bin-hi">${binA}</span>
  NOT = <span class="bin-hi">${binR}</span> → ${result}
</span>`;
    }
    return `<span class="binary-block">
  A   = ${a} → <span class="bin-hi">${binA}</span>
  B   = ${b} → <span class="bin-hi">${binB}</span>
  ${op.toUpperCase()} = <span class="bin-hi">${binR}</span> → ${result}
</span>`;
  };

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
      log: `Os valores foram gravados na RAM: <strong>${a}</strong> no endereço <strong>0x00</strong>${isUnary ? '' : ` e <strong>${b}</strong> no endereço <strong>0x01</strong>`}. A RAM é a memória principal: rápida o suficiente para uso diário, mas <strong>volátil</strong> — perde tudo quando o computador é desligado.`,
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
        if (!isUnary) setTimeout(() => animateParticle('comp-r2', 'comp-ula'), 160);
      }
    },
    {
      id: 'ula-calc',
      active: ['comp-ula', 'comp-cpu'],
      cycleStep: 'execute',
      tag: `Execute — ULA calcula ${o.label}`,
      tagClass: 'ula-tag',
      log: isLogical
        ? `A ULA executou a operação <strong>${o.label}</strong> bit a bit. Cada bit de A é combinado com o bit correspondente de B usando a regra do ${o.label}. O resultado decimal é <strong>${result}</strong>.${logicalBinBlock()}`
        : `A ULA calculou <strong>${a} ${o.sym} ${b} = ${result}</strong>. Este é o momento central da simulação: o processamento de fato aconteceu. Tudo antes era preparação — tudo depois é guardar o resultado.`,
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
      log: `O resultado <strong>${result}</strong> foi salvo no <strong>HD/SSD</strong>. Diferente da RAM, o armazenamento secundário é <strong>permanente</strong> — mantém os dados mesmo sem energia. É mais lento, mas nunca esquece. <i class="fa-solid fa-circle-check" style="color:var(--r-c)"></i> Simulação concluída!`,
      action: () => {
        addHdEntry(`resultado_${String(Date.now()).slice(-4)}`, result);
        animateParticle('comp-ram', 'comp-hd');
      }
    },
  ];
}

/* ===== INIT ===== */
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

/* ===== CONTROLES ===== */
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
    btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Recomeçar';
  } else {
    btn.innerHTML = `<i class="fa-solid fa-play"></i> Passo ${state.stepIndex + 1} / ${state.steps.length}`;
  }
}

function toggleAuto() {
  const btn = document.getElementById('btn-auto');

  if (state.autoTimer) {
    clearInterval(state.autoTimer);
    state.autoTimer = null;
    btn.innerHTML = '<i class="fa-solid fa-forward"></i> Automático';
    return;
  }

  btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
  const delay = parseInt(document.getElementById('speed-range').value);

  stepForward();

  state.autoTimer = setInterval(() => {
    if (state.stepIndex >= state.steps.length) {
      clearInterval(state.autoTimer);
      state.autoTimer = null;
      btn.innerHTML = '<i class="fa-solid fa-forward"></i> Automático';
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

  document.getElementById('btn-step').innerHTML = '<i class="fa-solid fa-play"></i> Próximo passo';
  document.getElementById('btn-auto').innerHTML = '<i class="fa-solid fa-forward"></i> Automático';

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

/* ===== EXECUTAR PASSO ===== */
function executeStep(step) {
  clearActiveComps();
  step.active.forEach(id => document.getElementById(id)?.classList.add('active'));
  highlightCycleStep(step.cycleStep);
  step.action();
  addLog(step.tag, step.tagClass, step.log);
}

/* ===== UI HELPERS ===== */
function setVal(id, val, empty = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val ?? '—';
  el.classList.toggle('empty', empty || val === '—' || val == null);
}

function setRam(addr, val, label = '') {
  const cell = document.getElementById(`ram-${addr}`);
  const labelCell = document.getElementById(`ram-${addr}-label`);
  if (!cell) return;
  cell.textContent = val;
  cell.classList.add('val-changed');
  if (label && labelCell) labelCell.textContent = label;
  const row = cell.parentElement;
  row.classList.add('ram-active');
  setTimeout(() => {
    cell.classList.remove('val-changed');
    row.classList.remove('ram-active');
  }, 1400);
}

function clearRam() {
  ['0x00','0x01','0x02','0x03','0x04','0x05'].forEach(addr => {
    const cell = document.getElementById(`ram-${addr}`);
    const labelCell = document.getElementById(`ram-${addr}-label`);
    if (cell) cell.textContent = '—';
    if (labelCell) labelCell.textContent = '—';
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
  document.getElementById('hd-entries').innerHTML = '<span class="hd-empty">Nenhum dado gravado ainda.</span>';
}

function addLog(tag, tagClass, text) {
  const area = document.getElementById('log-area');
  const placeholder = area.querySelector('.log-placeholder');
  if (placeholder) placeholder.remove();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<div class="log-tag ${tagClass}">${tag}</div><div class="log-text">${text}</div>`;
  area.insertBefore(entry, area.firstChild);
}

function clearLog() {
  document.getElementById('log-area').innerHTML = '<div class="log-placeholder">Insira dois valores, escolha uma operação e clique em <strong>Próximo passo</strong> para iniciar a simulação.</div>';
}

function clearActiveComps() {
  document.querySelectorAll('.comp.active, .cpu-box.active').forEach(el => el.classList.remove('active'));
}

/* ===== CICLO ===== */
const cycleIds = ['fetch', 'decode', 'execute', 'memory', 'writeback'];

function highlightCycleStep(step) {
  cycleIds.forEach(id => {
    const el = document.getElementById(`cs-${id}`);
    if (!el) return;
    el.classList.remove('active', 'done');
    if (id === step) el.classList.add('active');
    else if (cycleIds.indexOf(id) < cycleIds.indexOf(step)) el.classList.add('done');
  });
}

function clearCycleSteps() {
  cycleIds.forEach(id => document.getElementById(`cs-${id}`)?.classList.remove('active', 'done'));
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

/* ===== ANIMAÇÃO ===== */
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
    duration: 550,
    easing: 'easeInOutQuad',
    complete: () => particle.remove(),
  });
}

/* ===== TEMA ===== */
function setupTheme() {
  const btn  = document.getElementById('btn-theme');
  const icon = document.getElementById('theme-icon');
  const html = document.documentElement;

  const saved = localStorage.getItem('oc-theme') || 'light';
  html.setAttribute('data-theme', saved);
  icon.className = saved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

  btn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('oc-theme', next);
    icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
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
  document.getElementById('btn-ula-modal').addEventListener('click', () => overlay.classList.add('open'));
  document.getElementById('ula-modal-close').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
}

/* ===== PORTAS LÓGICAS ===== */
function setupGates() {
  document.querySelectorAll('.bit-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const gate  = btn.dataset.gate;
      const input = btn.dataset.input;
      const next  = state.gateStates[gate][input] === 0 ? 1 : 0;
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
  let result, key;

  if (gate === 'and') {
    result = s.and.a & s.and.b;
    key = `${s.and.a}${s.and.b}`;
    document.getElementById('gate-and-result').textContent = result;
    highlightTruth('and', key);
  } else if (gate === 'or') {
    result = s.or.a | s.or.b;
    key = `${s.or.a}${s.or.b}`;
    document.getElementById('gate-or-result').textContent = result;
    highlightTruth('or', key);
  } else if (gate === 'not') {
    result = s.not.a === 0 ? 1 : 0;
    key = `${s.not.a}`;
    document.getElementById('gate-not-result').textContent = result;
    highlightTruth('not', key);
  }
}

function highlightTruth(gate, key) {
  document.querySelectorAll(`[id^="${gate}-"]`).forEach(r => r.classList.remove('highlight'));
  document.getElementById(`${gate}-${key}`)?.classList.add('highlight');
}