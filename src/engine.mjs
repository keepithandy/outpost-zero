// OUTPOST ZERO · deterministic, dependency-free simulation core
// The engine never reads the DOM, clock, browser storage, or network.
export const WIDTH = 7;
export const HEIGHT = 6;
export const MAX_OFFLINE_SECONDS = 900;
export const STORAGE_VERSION = 1;
export const CAPS = Object.freeze({ scrap: 1800, alloy: 950, signal: 900, rations: 700 });

export const BUILDINGS = Object.freeze({
  extractor: { name: 'Ore Extractor', short: 'Extraction', icon: 'extractor', description: 'Harvests raw scrap from the frontier.', cost: { scrap: 45 }, power: -5, crew: 1, rates: { scrap: 2.4 }, color: 'amber' },
  solar: { name: 'Solar Array', short: 'Solar Array', icon: 'solar', description: 'Quiet, reliable power from the dying star.', cost: { scrap: 50, alloy: 12 }, power: 16, crew: 0, rates: {}, color: 'gold' },
  hydro: { name: 'Hydroponic Bay', short: 'Hydroponics', icon: 'hydro', description: 'Grows food and oxygen for the crew.', cost: { scrap: 70, alloy: 15 }, power: -6, crew: 1, rates: { rations: 1.15 }, color: 'green' },
  smelter: { name: 'Arc Smelter', short: 'Smelter', icon: 'smelter', description: 'Refines scrap into high-grade alloy.', cost: { scrap: 85, alloy: 25 }, power: -10, crew: 2, rates: { scrap: -1.45, alloy: 0.8 }, color: 'red' },
  habitat: { name: 'Crew Habitat', short: 'Habitat', icon: 'habitat', description: 'Adds four crew capacity per level.', cost: { scrap: 80, alloy: 26 }, power: -4, crew: 0, rates: { rations: -0.16 }, color: 'blue' },
  uplink: { name: 'Deep-Space Uplink', short: 'Uplink', icon: 'uplink', description: 'Converts alloy into research signal.', cost: { scrap: 105, alloy: 48 }, power: -9, crew: 2, rates: { alloy: -0.12, signal: 0.72 }, unlock: 'listening', color: 'violet' },
  reactor: { name: 'Helium Reactor', short: 'Reactor', icon: 'reactor', description: 'Produces dense power while burning rations.', cost: { scrap: 125, alloy: 105 }, power: 46, crew: 2, rates: { rations: -0.38 }, unlock: 'fusion', color: 'cyan' },
  lab: { name: 'Synthesis Lab', short: 'Synthesis Lab', icon: 'lab', description: 'A concentrated research amplifier.', cost: { scrap: 165, alloy: 110 }, power: -17, crew: 3, rates: { alloy: -0.32, signal: 1.95 }, unlock: 'automation', color: 'violet' },
  defense: { name: 'Storm Shield', short: 'Storm Shield', icon: 'defense', description: 'Reduces solar-storm disruption.', cost: { scrap: 130, alloy: 95 }, power: -8, crew: 1, rates: { alloy: -0.035 }, unlock: 'barrier', color: 'cyan' }
});

export const TECHS = Object.freeze([
  { id: 'listening', name: 'Listening Protocol', description: 'Decode the first interstellar carrier. Unlocks uplinks and survey missions.', cost: { signal: 32, alloy: 24 }, icon: 'uplink' },
  { id: 'photovoltaics', name: 'Photon Lattice', description: 'Solar arrays gain 30% power generation.', cost: { signal: 76, alloy: 48 }, requires: 'listening', icon: 'solar' },
  { id: 'fusion', name: 'Helium Ignition', description: 'Unlock compact reactors and convoy missions.', cost: { signal: 135, alloy: 92 }, requires: 'photovoltaics', icon: 'reactor' },
  { id: 'automation', name: 'Autonomous Crews', description: 'Reduce crew demand by 25%. Unlock synthesis labs.', cost: { signal: 190, alloy: 138 }, requires: 'fusion', icon: 'lab' },
  { id: 'barrier', name: 'Magnetic Barrier', description: 'Unlock storm shields for hardened infrastructure.', cost: { signal: 245, alloy: 175 }, requires: 'automation', icon: 'defense' },
  { id: 'beacon', name: 'The First Beacon', description: 'Complete the frontier network and awaken the signal.', cost: { signal: 410, alloy: 270 }, requires: 'barrier', icon: 'spark' }
]);

export const MISSIONS = Object.freeze([
  { id: 'salvage', name: 'Wreck Salvage', description: 'Recover supplies from a lost freighter.', icon: 'rocket', cost: { rations: 12 }, duration: 22, rewards: { scrap: [90, 145], alloy: [12, 30] } },
  { id: 'survey', name: 'Void Survey', description: 'Map unexplored coordinates and triangulate a signal.', icon: 'map', cost: { rations: 24, scrap: 32 }, duration: 38, unlock: 'listening', rewards: { signal: [46, 78], alloy: [22, 44] } },
  { id: 'convoy', name: 'Deep Convoy', description: 'Trade with a drifting independent station.', icon: 'rocket', cost: { rations: 45, signal: 35 }, duration: 56, unlock: 'fusion', rewards: { alloy: [105, 165], scrap: [95, 170] } }
]);

export const OBJECTIVES = Object.freeze([
  { title: 'Light the frontier', description: 'Operate 2 extractors and 1 arc smelter.', reward: { scrap: 90, alloy: 25 }, checks: [{ kind: 'extractor', count: 2 }, { kind: 'smelter', count: 1 }] },
  { title: 'A permanent foothold', description: 'Operate 2 hydroponic bays and a crew habitat.', reward: { rations: 90, scrap: 90 }, checks: [{ kind: 'hydro', count: 2 }, { kind: 'habitat', count: 1 }] },
  { title: 'The first transmission', description: 'Research Listening Protocol and deploy 2 uplinks.', reward: { alloy: 85, signal: 85 }, checks: [{ tech: 'listening' }, { kind: 'uplink', count: 2 }] },
  { title: 'Across the silence', description: 'Finish 3 missions and construct a helium reactor.', reward: { alloy: 140, rations: 95 }, checks: [{ missions: 3 }, { kind: 'reactor', count: 1 }] },
  { title: 'Awaken the network', description: 'Research The First Beacon and sustain 3 uplinks.', reward: {}, checks: [{ tech: 'beacon' }, { kind: 'uplink', count: 3 }] }
]);

const RESOURCE_KEYS = Object.keys(CAPS);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const numeric = (value, fallback, max) => Number.isFinite(value) ? clamp(value, 0, max) : fallback;

function terrainAt(index) {
  const x = index % WIDTH;
  const y = Math.floor(index / WIDTH);
  const value = (x * 11 + y * 7 + x * y * 3) % 13;
  if (value <= 2) return 'ore';
  if (value <= 4) return 'ice';
  if (value <= 6) return 'dune';
  if (value === 12) return 'rift';
  return 'plain';
}

export function createGame(now = Date.now()) {
  const grid = Array.from({ length: WIDTH * HEIGHT }, (_, index) => ({
    terrain: terrainAt(index), kind: null, level: 0
  }));
  [[17, 'core'], [16, 'solar'], [18, 'extractor'], [24, 'hydro']].forEach(([index, kind]) => {
    grid[index] = { terrain: 'plain', kind, level: 1 };
  });
  return {
    version: STORAGE_VERSION,
    resources: { scrap: 195, alloy: 82, signal: 46, rations: 110 },
    grid,
    tech: [],
    mission: null,
    missionsCompleted: 0,
    stage: 0,
    tick: 0,
    stormTicks: 0,
    seed: 837291,
    log: [{ text: 'Command established. Your frontier awaits.', type: 'success', tick: 0 }],
    createdAt: now,
    lastSaved: now
  };
}

export function countBuildings(state, kind) {
  return state.grid.filter(tile => tile.kind === kind).length;
}

export function isUnlocked(state, item) {
  return !item.unlock || state.tech.includes(item.unlock);
}

export function siteBonus(kind, terrain) {
  if (kind === 'extractor' && terrain === 'ore') return 1.4;
  if (kind === 'hydro' && terrain === 'ice') return 1.35;
  if (kind === 'solar' && terrain === 'dune') return 1.2;
  return 1;
}

function outputFactor(state, tile) {
  let factor = (1 + (tile.level - 1) * 0.42) * siteBonus(tile.kind, tile.terrain);
  if (tile.kind === 'smelter' && state.tech.includes('automation')) factor *= 1.1;
  return factor;
}

export function getEconomy(state) {
  let powerAvailable = 20;
  let powerNeeded = 0;
  let crewAvailable = 7;
  let crewNeeded = 0;
  const rates = { scrap: 0, alloy: 0, signal: 0, rations: 0 };
  const stormShielded = countBuildings(state, 'defense') > 0;
  for (const tile of state.grid) {
    const spec = BUILDINGS[tile.kind];
    if (!spec) continue;
    if (tile.kind === 'habitat') crewAvailable += 4 * tile.level;
    const power = spec.power > 0 ? spec.power * outputFactor(state, tile) : spec.power;
    if (power > 0) {
      const solarBoost = tile.kind === 'solar' && state.tech.includes('photovoltaics') ? 1.3 : 1;
      const stormBoost = tile.kind === 'solar' && state.stormTicks > 0 ? (stormShielded ? 0.85 : 0.52) : 1;
      powerAvailable += power * solarBoost * stormBoost;
    } else {
      powerNeeded += -power;
    }
    crewNeeded += spec.crew * (state.tech.includes('automation') ? 0.75 : 1);
  }
  const efficiency = clamp(Math.min(
    powerNeeded > 0 ? powerAvailable / powerNeeded : 1,
    crewNeeded > 0 ? crewAvailable / crewNeeded : 1
  ), 0, 1);
  for (const tile of state.grid) {
    const spec = BUILDINGS[tile.kind];
    if (!spec) continue;
    const factor = outputFactor(state, tile) * efficiency;
    for (const [resource, rate] of Object.entries(spec.rates)) {
      rates[resource] += rate * factor;
    }
  }
  return { powerAvailable, powerNeeded, crewAvailable, crewNeeded, efficiency, rates };
}

function addLog(state, text, type = 'info') {
  state.log.unshift({ text, type, tick: state.tick });
  if (state.log.length > 9) state.log.length = 9;
}

function hasCost(state, cost) {
  return Object.entries(cost).every(([resource, amount]) => (state.resources[resource] || 0) + 0.00001 >= amount);
}

function pay(state, cost) {
  for (const [resource, amount] of Object.entries(cost)) state.resources[resource] -= amount;
}

function grant(state, rewards) {
  for (const [resource, amount] of Object.entries(rewards)) {
    state.resources[resource] = clamp((state.resources[resource] || 0) + amount, 0, CAPS[resource]);
  }
}

function response(ok, message) { return { ok, message }; }

export function build(state, index, kind) {
  const spec = BUILDINGS[kind];
  const tile = state.grid[index];
  if (!spec || !tile || !Number.isInteger(index)) return response(false, 'Invalid construction command.');
  if (!isUnlocked(state, spec)) return response(false, 'Research required before construction.');
  if (tile.kind || tile.terrain === 'rift') return response(false, 'This location is not buildable.');
  if (!hasCost(state, spec.cost)) return response(false, 'Insufficient materials for construction.');
  pay(state, spec.cost);
  tile.kind = kind;
  tile.level = 1;
  addLog(state, spec.name + ' brought online.', 'success');
  checkObjectives(state);
  return response(true, spec.name + ' constructed.');
}

export function upgradeCost(tile) {
  const spec = BUILDINGS[tile && tile.kind];
  if (!spec || tile.level >= 3) return null;
  return Object.fromEntries(Object.entries(spec.cost).map(([resource, amount]) => [resource, Math.ceil(amount * (tile.level + 0.75))]));
}

export function upgrade(state, index) {
  const tile = state.grid[index];
  const cost = upgradeCost(tile);
  if (!cost) return response(false, 'This structure cannot be upgraded.');
  if (!hasCost(state, cost)) return response(false, 'Not enough materials for an upgrade.');
  pay(state, cost);
  tile.level += 1;
  addLog(state, BUILDINGS[tile.kind].name + ' upgraded to MK ' + tile.level + '.', 'success');
  checkObjectives(state);
  return response(true, 'Structure upgraded.');
}

export function demolish(state, index) {
  const tile = state.grid[index];
  if (!tile || !BUILDINGS[tile.kind]) return response(false, 'No removable structure on this tile.');
  const kind = tile.kind;
  const refund = Object.fromEntries(Object.entries(BUILDINGS[kind].cost).map(([resource, amount]) => [resource, Math.floor(amount * 0.4)]));
  grant(state, refund);
  tile.kind = null;
  tile.level = 0;
  addLog(state, BUILDINGS[kind].name + ' decommissioned.', 'warning');
  return response(true, 'Structure removed; 40% of base materials recovered.');
}

export function research(state, id) {
  const tech = TECHS.find(item => item.id === id);
  if (!tech) return response(false, 'Unknown research program.');
  if (state.tech.includes(id)) return response(false, 'Research already complete.');
  if (tech.requires && !state.tech.includes(tech.requires)) return response(false, 'Complete the previous protocol first.');
  if (!hasCost(state, tech.cost)) return response(false, 'Insufficient research materials.');
  pay(state, tech.cost);
  state.tech.push(id);
  addLog(state, tech.name + ' researched.', 'success');
  checkObjectives(state);
  return response(true, tech.name + ' unlocked.');
}

export function startMission(state, id) {
  const mission = MISSIONS.find(item => item.id === id);
  if (!mission) return response(false, 'Unknown expedition.');
  if (state.mission) return response(false, 'A ship is already on assignment.');
  if (!isUnlocked(state, mission)) return response(false, 'This mission is still locked.');
  if (!hasCost(state, mission.cost)) return response(false, 'Insufficient expedition supplies.');
  pay(state, mission.cost);
  state.mission = { id, remaining: mission.duration, total: mission.duration };
  addLog(state, mission.name + ' dispatched beyond the perimeter.', 'info');
  return response(true, mission.name + ' launched.');
}

function nextRandom(state) {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function resolveMission(state) {
  const spec = MISSIONS.find(item => item.id === state.mission.id);
  if (!spec) { state.mission = null; return; }
  const rewards = {};
  for (const [resource, range] of Object.entries(spec.rewards)) {
    rewards[resource] = Math.floor(range[0] + nextRandom(state) * (range[1] - range[0] + 1));
  }
  grant(state, rewards);
  state.missionsCompleted += 1;
  state.mission = null;
  addLog(state, spec.name + ' returned: ' + Object.entries(rewards).map(([r, n]) => '+' + n + ' ' + r).join(', ') + '.', 'success');
  checkObjectives(state);
}

export function objectiveProgress(state) {
  const objective = OBJECTIVES[state.stage];
  if (!objective) return { title: 'Frontier secured', description: 'The beacon is alive. Continue expanding your station.', complete: true, checks: [] };
  const checks = objective.checks.map(check => {
    if (check.kind) {
      const value = countBuildings(state, check.kind);
      return { label: BUILDINGS[check.kind].short + ' ' + value + '/' + check.count, done: value >= check.count };
    }
    if (check.tech) {
      const item = TECHS.find(t => t.id === check.tech);
      return { label: (item ? item.name : check.tech), done: state.tech.includes(check.tech) };
    }
    return { label: 'Expeditions ' + state.missionsCompleted + '/' + check.missions, done: state.missionsCompleted >= check.missions };
  });
  return { title: objective.title, description: objective.description, complete: false, checks, stage: state.stage + 1, total: OBJECTIVES.length };
}

function checkObjectives(state) {
  while (state.stage < OBJECTIVES.length) {
    const objective = objectiveProgress(state);
    if (!objective.checks.every(check => check.done)) break;
    const done = OBJECTIVES[state.stage];
    state.stage += 1;
    grant(state, done.reward);
    addLog(state, 'Milestone achieved: ' + done.title + '.', 'success');
  }
}

function processBuilding(state, tile, efficiency) {
  const spec = BUILDINGS[tile.kind];
  if (!spec || !Object.keys(spec.rates).length) return;
  const factor = efficiency * outputFactor(state, tile);
  let available = 1;
  for (const [resource, rate] of Object.entries(spec.rates)) {
    const amount = rate * factor;
    if (amount < 0) available = Math.min(available, state.resources[resource] / -amount);
    if (amount > 0) available = Math.min(available, (CAPS[resource] - state.resources[resource]) / amount);
  }
  available = clamp(available, 0, 1);
  for (const [resource, rate] of Object.entries(spec.rates)) {
    state.resources[resource] = clamp(state.resources[resource] + rate * factor * available, 0, CAPS[resource]);
  }
}

function advanceOne(state) {
  const economy = getEconomy(state);
  // Producers first: downstream buildings can use the same tick's output.
  for (const kind of ['extractor', 'hydro', 'smelter', 'uplink', 'lab', 'habitat', 'reactor', 'defense']) {
    for (const tile of state.grid) {
      if (tile.kind === kind) processBuilding(state, tile, economy.efficiency);
    }
  }
  state.tick += 1;
  if (state.stormTicks > 0) state.stormTicks -= 1;
  if (state.mission) {
    state.mission.remaining -= 1;
    if (state.mission.remaining <= 0) resolveMission(state);
  }
  if (state.tick % 58 === 0) {
    if (nextRandom(state) < 0.42) {
      state.stormTicks = 18;
      addLog(state, 'Ion storm detected. Solar efficiency reduced for 18 seconds.', 'warning');
    } else {
      const scrap = 24 + Math.floor(nextRandom(state) * 36);
      grant(state, { scrap });
      addLog(state, 'Salvage drones recovered +' + scrap + ' scrap.', 'info');
    }
  }
}

export function advance(state, seconds = 1) {
  const ticks = clamp(Math.floor(Number(seconds) || 0), 0, MAX_OFFLINE_SECONDS);
  for (let i = 0; i < ticks; i += 1) advanceOne(state);
  checkObjectives(state);
  return ticks;
}

export function saveGame(state, now = Date.now()) {
  state.lastSaved = now;
  return JSON.stringify(state);
}

export function loadGame(json, now = Date.now()) {
  const raw = typeof json === 'string' ? JSON.parse(json) : json;
  if (!raw || raw.version !== STORAGE_VERSION || !Array.isArray(raw.grid) || raw.grid.length !== WIDTH * HEIGHT) {
    throw new Error('Unsupported or corrupted save.');
  }
  const state = createGame(now);
  for (const resource of RESOURCE_KEYS) state.resources[resource] = numeric(raw.resources && raw.resources[resource], state.resources[resource], CAPS[resource]);
  state.grid = raw.grid.map((tile, index) => {
    const kind = tile && (BUILDINGS[tile.kind] || tile.kind === 'core') ? tile.kind : null;
    const forced = index === 17 ? 'core' : kind === 'core' ? null : kind;
    return {
      terrain: index === 17 ? 'plain' : terrainAt(index),
      kind: terrainAt(index) === 'rift' && index !== 17 ? null : forced,
      level: forced ? clamp(Math.floor(numeric(tile.level, 1, 3)), 1, 3) : 0
    };
  });
  state.tech = Array.isArray(raw.tech) ? [...new Set(raw.tech.filter(id => TECHS.some(t => t.id === id)))].slice(0, TECHS.length) : [];
  state.stage = Math.floor(numeric(raw.stage, 0, OBJECTIVES.length));
  state.tick = Math.floor(numeric(raw.tick, 0, 1e10));
  state.stormTicks = Math.floor(numeric(raw.stormTicks, 0, 18));
  state.seed = Math.floor(numeric(raw.seed, 837291, 4294967295));
  state.missionsCompleted = Math.floor(numeric(raw.missionsCompleted, 0, 1e8));
  state.createdAt = numeric(raw.createdAt, now, now);
  state.lastSaved = numeric(raw.lastSaved, now, now);
  state.log = Array.isArray(raw.log) ? raw.log.filter(entry => entry && typeof entry.text === 'string').slice(0, 9).map(entry => ({ text: entry.text.slice(0, 180), type: ['success', 'info', 'warning'].includes(entry.type) ? entry.type : 'info', tick: Math.floor(numeric(entry.tick, 0, 1e10)) })) : state.log;
  if (raw.mission && MISSIONS.some(m => m.id === raw.mission.id)) {
    const spec = MISSIONS.find(m => m.id === raw.mission.id);
    state.mission = { id: spec.id, remaining: Math.floor(numeric(raw.mission.remaining, spec.duration, spec.duration)), total: spec.duration };
  }
  const elapsed = Math.floor(clamp((now - state.lastSaved) / 1000, 0, MAX_OFFLINE_SECONDS));
  if (elapsed > 0) {
    advance(state, elapsed);
    addLog(state, 'Offline simulation restored: ' + Math.floor(elapsed / 60) + 'm ' + elapsed % 60 + 's.', 'info');
  }
  state.lastSaved = now;
  return state;
}
