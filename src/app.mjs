import {
  WIDTH, HEIGHT, CAPS, BUILDINGS, TECHS, MISSIONS, OBJECTIVES,
  MAX_OFFLINE_SECONDS, createGame, loadGame, saveGame,
  countBuildings, isUnlocked, siteBonus, getEconomy, objectiveProgress,
  upgradeCost, build, upgrade, demolish, research, startMission, advance
} from './engine.mjs';

const SAVE_KEY = 'outpost-zero-save-v1';
const $ = id => document.getElementById(id);
const el = {
  resources: $('resources'), board: $('mapBoard'), catalog: $('buildCatalog'),
  research: $('researchCatalog'), missions: $('missionCatalog'),
  inspector: $('selectionPanel'), events: $('eventFeed'), toast: $('toast'),
  objectiveTitle: $('objectiveTitle'), objectiveDesc: $('objectiveDesc'),
  objectiveChecks: $('objectiveChecks'), objectiveChapter: $('objectiveChapter'),
  objectiveNumber: $('objectiveNumber'), powerText: $('powerText'),
  crewText: $('crewText'), powerMeter: $('powerMeter'), crewMeter: $('crewMeter'),
  efficiency: $('efficiencyText'), missionStatus: $('stationStatus'),
  speedBtn: $('speedBtn'), pauseBtn: $('pauseBtn'), sol: $('solCount'),
  selectedIndex: $('selectedIndex'), modeLabel: $('mapModeLabel'),
  help: $('helpDialog')
};
const resourceNames = { scrap: 'Scrap', alloy: 'Alloy', signal: 'Signal', rations: 'Rations' };
const terrainNames = { ore: 'Ore seam', ice: 'Ice shelf', dune: 'Solar dune', plain: 'Bare ground', rift: 'Dead rift' };
const tileLabels = { core: 'COMMAND', extractor: 'EXTRACT', solar: 'SOLAR', hydro: 'HYDRO', smelter: 'SMELTER', habitat: 'HABITAT', uplink: 'UPLINK', reactor: 'REACTOR', lab: 'LAB', defense: 'SHIELD' };
const format = value => Math.floor(value).toLocaleString('en-US');
const percent = value => Math.round(value * 100) + '%';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function icon(name) { return '<svg aria-hidden="true"><use href="assets/icons.svg#i-' + name + '"></use></svg>'; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function costText(cost) {
  return Object.entries(cost).map(([resource, amount]) => format(amount) + ' ' + resource).join(' · ');
}
function canPay(cost) {
  return Object.entries(cost).every(([resource, amount]) => state.resources[resource] + 0.00001 >= amount);
}
function costCompact(cost) {
  return Object.entries(cost).map(([resource, amount]) => '<b>' + format(amount) + '</b> ' + resource).join(' · ');
}
function readInitialState() {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) return loadGame(stored);
  } catch (error) {
    console.warn('[OUTPOST ZERO] Starting a fresh local station:', error);
  }
  return createGame();
}

let state = readInitialState();
let selected = null;
let buildMode = null;
let paused = false;
let speed = 1;
let lastWall = Date.now();
let lastSavedTick = state.tick;
let toastTimer = null;

function notify(message, error = false) {
  el.toast.textContent = message;
  el.toast.className = 'toast visible' + (error ? ' error' : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.className = 'toast'; }, 2900);
}

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, saveGame(state));
    lastSavedTick = state.tick;
  } catch (error) {
    console.warn('[OUTPOST ZERO] Save unavailable:', error);
  }
}

function renderResources(economy) {
  const rows = Object.entries(resourceNames);
  el.resources.innerHTML = rows.map(([key, name]) => {
    const rate = economy.rates[key];
    const cap = CAPS[key];
    return '<div class="resource-item" data-resource="' + key + '">' +
      '<span class="resource-icon">' + icon(key) + '</span>' +
      '<div class="resource-info"><span class="resource-name">' + name + '</span><span class="resource-rate ' + (rate < -0.01 ? 'negative' : '') + '">' + (rate >= 0 ? '+' : '') + rate.toFixed(2) + '/s</span></div>' +
      '<span class="resource-value">' + format(state.resources[key]) + '<span class="resource-cap">/ ' + format(cap) + '</span></span>' +
      '</div>';
  }).join('');
}

function renderSystems(economy) {
  const powerUse = economy.powerNeeded / Math.max(economy.powerAvailable, 1);
  const crewUse = economy.crewNeeded / Math.max(economy.crewAvailable, 1);
  el.powerText.textContent = Math.round(economy.powerNeeded) + ' / ' + Math.round(economy.powerAvailable);
  el.crewText.textContent = economy.crewNeeded.toFixed(1).replace('.0', '') + ' / ' + economy.crewAvailable;
  el.powerMeter.style.width = percent(clamp(powerUse, 0, 1));
  el.crewMeter.style.width = percent(clamp(crewUse, 0, 1));
  el.powerMeter.classList.toggle('danger', powerUse > 1);
  el.crewMeter.classList.toggle('danger', crewUse > 1);
  el.efficiency.textContent = percent(economy.efficiency);
  el.efficiency.classList.toggle('danger', economy.efficiency < 0.99);
  el.missionStatus.textContent = paused ? 'SIMULATION PAUSED' : state.stormTicks > 0 ? 'ION STORM ACTIVE' : 'STATION ONLINE';
  const light = document.querySelector('.top-center .live-light');
  if (light) light.classList.toggle('paused', paused || state.stormTicks > 0);
  el.sol.textContent = String(1 + Math.floor(state.tick / 120)).padStart(3, '0');
}

function renderBoard() {
  el.board.innerHTML = state.grid.map((tile, index) => {
    const built = tile.kind !== null;
    const core = tile.kind === 'core';
    const info = BUILDINGS[tile.kind];
    const terrain = terrainNames[tile.terrain] || tile.terrain;
    const tileBonus = built && !core ? siteBonus(tile.kind, tile.terrain) : 1;
    const position = (index % WIDTH + 1) + ':' + (Math.floor(index / WIDTH) + 1);
    const className = [
      'tile', 'tile-' + tile.terrain, built ? 'tile-built' : '',
      core ? 'tile-core' : '', tile.kind ? 'tile-kind-' + tile.kind : '',
      selected === index ? 'tile-selected' : '',
      buildMode && !built && tile.terrain !== 'rift' ? 'tile-build-target' : ''
    ].filter(Boolean).join(' ');
    const label = core ? 'Command Core' : info ? info.name : terrain;
    const contents = built ?
      icon(core ? 'core' : info.icon) + '<span class="tile-name">' + tileLabels[tile.kind] + '</span>' +
        (tile.level > 1 ? '<span class="tile-level">MK' + tile.level + '</span>' : '') +
        (tileBonus > 1 ? '<span class="tile-bonus">+' + Math.round((tileBonus - 1) * 100) + '%</span>' : '') :
      (buildMode && tile.terrain !== 'rift' ? icon('plus').replace('<svg ', '<svg class="tile-plus" ') : '') +
        '<span class="tile-terrain-name">' + (tile.terrain === 'plain' ? 'OPEN' : tile.terrain.toUpperCase()) + '</span>';
    return '<button type="button" class="' + className + '" data-index="' + index + '" aria-pressed="' + (selected === index) + '" aria-label="Node ' + position + ', ' + label + '">' +
      '<span class="tile-number">' + String(index + 1).padStart(2, '0') + '</span>' + contents + '</button>';
  }).join('');
  el.modeLabel.textContent = buildMode ? 'BUILD MODE / ' + BUILDINGS[buildMode].short.toUpperCase() : 'SELECTION MODE';
}

function renderBuildCatalog() {
  el.catalog.innerHTML = Object.entries(BUILDINGS).map(([kind, spec]) => {
    const unlocked = isUnlocked(state, spec);
    const active = buildMode === kind;
    const count = countBuildings(state, kind);
    const tag = !unlocked ? 'LOCKED' : active ? 'ACTIVE' : count ? '×' + count : 'READY';
    return '<button type="button" class="build-card ' + (active ? 'active ' : '') + (!unlocked ? 'locked' : '') + '" data-build="' + kind + '" data-color="' + spec.color + '" aria-pressed="' + active + '" ' + (!unlocked ? 'disabled title="Research required"' : '') + '>' +
      '<span class="build-card-top"><span class="build-icon">' + icon(spec.icon) + '</span><span class="build-card-tag">' + tag + '</span></span>' +
      '<span class="build-card-name">' + spec.short + '</span>' +
      '<span class="build-card-cost">' + (unlocked ? costCompact(spec.cost) : 'RESEARCH REQUIRED') + '</span></button>';
  }).join('');
}

function renderResearch() {
  const count = state.tech.length;
  $('researchCount').textContent = count + ' / ' + TECHS.length;
  el.research.innerHTML = TECHS.map(spec => {
    const done = state.tech.includes(spec.id);
    const locked = spec.requires && !state.tech.includes(spec.requires);
    const afford = !done && !locked && canPay(spec.cost);
    return '<button type="button" data-tech="' + spec.id + '" class="research-item" ' + (done || locked ? 'disabled' : '') + ' title="' + escapeHtml(spec.description) + '">' +
      '<span class="item-icon">' + icon(spec.icon) + '</span><span class="item-copy"><strong>' + spec.name + '</strong><small>' + (done ? 'PROTOCOL COMPLETE' : locked ? 'PREVIOUS PROTOCOL REQUIRED' : costText(spec.cost)) + '</small></span>' +
      '<span class="item-status ' + (done ? 'complete' : locked ? 'locked' : afford ? 'afford' : '') + '">' +
      (done ? icon('check') : locked ? 'LOCKED' : 'RESEARCH') + '</span></button>';
  }).join('');
}

function renderMissions() {
  el.missions.innerHTML = MISSIONS.map(spec => {
    const locked = !isUnlocked(state, spec);
    const active = state.mission && state.mission.id === spec.id;
    const progress = active ? Math.round((1 - state.mission.remaining / state.mission.total) * 100) : 0;
    const busy = !!state.mission;
    const subtitle = active ? Math.ceil(state.mission.remaining) + 's UNTIL RETURN' : locked ? 'PROTOCOL LOCKED' : costText(spec.cost) + ' · ' + spec.duration + 's';
    return '<button type="button" data-mission="' + spec.id + '" class="mission-item" ' + (locked || busy ? 'disabled' : '') + ' title="' + escapeHtml(spec.description) + '">' +
      '<span class="item-icon">' + icon(spec.icon) + '</span><span class="item-copy"><strong>' + spec.name + '</strong><small>' + subtitle + '</small>' +
      (active ? '<span class="mission-progress"><span style="width:' + progress + '%"></span></span>' : '') + '</span><span class="item-status ' + (active ? 'afford' : '') + '">' + (active ? progress + '%' : locked ? 'LOCKED' : busy ? 'BUSY' : 'SEND') + '</span></button>';
  }).join('');
}

function renderInspector() {
  el.selectedIndex.textContent = selected === null ? '—' : String(selected + 1).padStart(2, '0');
  if (selected === null) {
    el.inspector.innerHTML = '<p class="empty-spot">Select a node on the map to inspect its terrain, upgrade a structure, or recover materials.</p>';
    return;
  }
  const tile = state.grid[selected];
  const kind = tile.kind;
  const info = BUILDINGS[kind];
  const title = kind === 'core' ? 'Command Core' : info ? info.name : terrainNames[tile.terrain];
  const desc = kind === 'core' ? 'The outpost heartbeat. Provides 20 base power and 7 crew slots.' :
    info ? info.description : tile.terrain === 'rift' ? 'Unstable geological anomaly. Construction is prohibited.' :
    'Open node. Select a module to construct here.';
  const badge = info ? 'MK ' + tile.level : kind === 'core' ? 'BASE' : tile.terrain.toUpperCase();
  const bonus = kind && kind !== 'core' && siteBonus(kind, tile.terrain) > 1 ?
    '<div class="selection-bonus">TERRAIN BONUS +' + Math.round((siteBonus(kind, tile.terrain) - 1) * 100) + '%</div>' : '';
  let actions = '';
  if (info) {
    const cost = upgradeCost(tile);
    actions = '<div class="selection-actions">' + (cost ?
      '<button type="button" data-action="upgrade" title="' + escapeHtml(costText(cost)) + '">' + icon('upgrade') + ' UPGRADE</button>' :
      '<button type="button" disabled>MAX LEVEL</button>') +
      '<button type="button" class="decommission" data-action="demolish" title="Decommission structure for 40% base material refund" aria-label="Decommission structure">' + icon('trash') + '</button></div>' +
      (cost ? '<div class="selection-bonus" style="margin:9px 0 0;color:#98a9ba">COST · ' + escapeHtml(costText(cost)) + '</div>' : '');
  } else if (!kind && tile.terrain !== 'rift') {
    actions = '<div class="selection-bonus">AVAILABLE FOR CONSTRUCTION</div>';
  }
  el.inspector.innerHTML = '<div class="selection-top"><span class="selection-icon">' + icon(kind === 'core' ? 'core' : info ? info.icon : 'map') + '</span><div><h4>' + escapeHtml(title) + '</h4><span>' + badge + ' / NODE ' + String(selected + 1).padStart(2, '0') + '</span></div></div>' +
    '<p class="selection-description">' + escapeHtml(desc) + '</p>' + bonus + actions;
}

function renderObjective() {
  const goal = objectiveProgress(state);
  el.objectiveTitle.textContent = goal.title;
  el.objectiveDesc.textContent = goal.description;
  el.objectiveChapter.textContent = goal.complete ? 'ALL CHAPTERS COMPLETE' : 'CHAPTER ' + String(goal.stage).padStart(2, '0') + ' / 05';
  el.objectiveNumber.innerHTML = goal.complete ? icon('check') : String(goal.stage).padStart(2, '0') + '<span>/05</span>';
  el.objectiveChecks.innerHTML = goal.complete ?
    '<span class="objective-check done">' + icon('check') + ' FIRST BEACON ACTIVATED</span>' :
    goal.checks.map(check => '<span class="objective-check ' + (check.done ? 'done' : '') + '">' + (check.done ? icon('check') : icon('plus')) + escapeHtml(check.label) + '</span>').join('');
}

function renderEvents() {
  el.events.innerHTML = state.log.slice(0, 6).map(entry =>
    '<div class="event-line ' + escapeHtml(entry.type) + '"><div>' + escapeHtml(entry.text) +
    '<span>SOL ' + String(1 + Math.floor(entry.tick / 120)).padStart(3, '0') + ' / CYCLE ' + entry.tick + '</span></div></div>'
  ).join('');
}

function renderDynamic() {
  const economy = getEconomy(state);
  renderResources(economy);
  renderSystems(economy);
  renderObjective();
  renderMissions();
  renderEvents();
}

function renderEverything() {
  renderBoard();
  renderBuildCatalog();
  renderResearch();
  renderInspector();
  renderDynamic();
}

function outcome(result) {
  notify(result.message, !result.ok);
  if (result.ok) { persist(); renderEverything(); }
  else { renderInspector(); }
}

el.board.addEventListener('click', event => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  const index = Number(button.dataset.index);
  const tile = state.grid[index];
  if (!tile) return;
  selected = index;
  if (buildMode && !tile.kind && tile.terrain !== 'rift') {
    const result = build(state, index, buildMode);
    outcome(result);
    return;
  }
  renderBoard();
  renderInspector();
});

el.catalog.addEventListener('click', event => {
  const button = event.target.closest('[data-build]');
  if (!button) return;
  const kind = button.dataset.build;
  if (!BUILDINGS[kind] || !isUnlocked(state, BUILDINGS[kind])) return;
  buildMode = buildMode === kind ? null : kind;
  renderBuildCatalog();
  renderBoard();
  renderInspector();
});

el.research.addEventListener('click', event => {
  const button = event.target.closest('[data-tech]');
  if (button) outcome(research(state, button.dataset.tech));
});

el.missions.addEventListener('click', event => {
  const button = event.target.closest('[data-mission]');
  if (button) outcome(startMission(state, button.dataset.mission));
});

el.inspector.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || selected === null) return;
  if (button.dataset.action === 'upgrade') outcome(upgrade(state, selected));
  if (button.dataset.action === 'demolish') {
    if (window.confirm('Decommission this module? You recover 40% of its base construction cost.')) {
      outcome(demolish(state, selected));
    }
  }
});

function togglePause() {
  paused = !paused;
  lastWall = Date.now();
  el.pauseBtn.innerHTML = icon(paused ? 'play' : 'pause');
  el.pauseBtn.setAttribute('aria-label', paused ? 'Resume simulation' : 'Pause simulation');
  renderSystems(getEconomy(state));
  notify(paused ? 'Simulation paused.' : 'Simulation resumed.');
}

function setSpeed(next) {
  speed = next;
  el.speedBtn.innerHTML = speed + '× ' + icon('fast');
  el.speedBtn.setAttribute('aria-label', 'Simulation speed ' + speed + ' times');
  notify('Simulation speed: ' + speed + '×.');
}

el.pauseBtn.addEventListener('click', togglePause);
el.speedBtn.addEventListener('click', () => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1));

function exportSave() {
  const data = saveGame(state);
  persist();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'outpost-zero-sol-' + String(1 + Math.floor(state.tick / 120)).padStart(3, '0') + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Station save exported.');
}

el.pauseBtn.title = 'Pause or resume simulation (Space)';
$('exportBtn').addEventListener('click', exportSave);
$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async event => {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 128 * 1024) { notify('Save file exceeds 128 KB.', true); return; }
  try {
    const imported = loadGame(await file.text());
    if (!window.confirm('Replace your current station with this imported save?')) return;
    state = imported;
    selected = null; buildMode = null;
    lastWall = Date.now();
    persist(); renderEverything();
    notify('Station save imported successfully.');
  } catch (error) {
    notify('Could not import save: ' + error.message, true);
  }
});
$('resetBtn').addEventListener('click', () => {
  if (!window.confirm('Start a new expedition? Your current local progress will be replaced. Export first if you want a backup.')) return;
  state = createGame();
  selected = null; buildMode = null; paused = false;
  el.pauseBtn.innerHTML = icon('pause');
  lastWall = Date.now();
  persist(); renderEverything();
  notify('New expedition initialized.');
});

$('helpBtn').addEventListener('click', () => el.help.showModal());
$('closeHelpBtn').addEventListener('click', () => el.help.close());
$('startPlayingBtn').addEventListener('click', () => el.help.close());
el.help.addEventListener('click', event => { if (event.target === el.help) el.help.close(); });

document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
  if (el.help.open) return;
  if (event.key === 'Escape') { buildMode = null; renderBoard(); renderBuildCatalog(); }
  if (event.code === 'Space' && !event.repeat) { event.preventDefault(); togglePause(); }
  if (['Digit1', 'Digit2', 'Digit3'].includes(event.code)) setSpeed([1, 2, 4][Number(event.code.slice(-1)) - 1]);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) persist();
});
window.addEventListener('pagehide', persist);

function simulationTick() {
  const now = Date.now();
  const elapsed = clamp(Math.floor((now - lastWall) / 1000), 0, MAX_OFFLINE_SECONDS);
  if (!elapsed) return;
  // Drop excess hidden-tab backlog rather than simulating another 15 minutes on each callback.
  lastWall = elapsed >= MAX_OFFLINE_SECONDS ? now : lastWall + elapsed * 1000;
  if (paused) { lastWall = now; return; }
  const beforeStage = state.stage;
  const beforeMission = state.missionsCompleted;
  advance(state, Math.min(MAX_OFFLINE_SECONDS, elapsed * speed));
  if (state.stage !== beforeStage || state.missionsCompleted !== beforeMission) renderEverything();
  else renderDynamic();
  if (state.tick - lastSavedTick >= 5) persist();
}

renderEverything();
setInterval(simulationTick, 1000);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.info('[OUTPOST ZERO] Offline cache unavailable:', error);
    });
  });
}
