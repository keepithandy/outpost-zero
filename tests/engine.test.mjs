import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WIDTH, HEIGHT, MAX_OFFLINE_SECONDS, CAPS, BUILDINGS, TECHS, MISSIONS,
  createGame, getEconomy, countBuildings, siteBonus, isUnlocked,
  build, upgrade, demolish, research, startMission, advance, objectiveProgress,
  saveGame, loadGame
} from '../src/engine.mjs';

const free = state => state.grid.findIndex(cell => !cell.kind && cell.terrain !== 'rift');
const rift = state => state.grid.findIndex(cell => cell.terrain === 'rift');

test('the map has 42 sectors and a protected command core', () => {
  const state = createGame(1000);
  assert.equal(state.grid.length, WIDTH * HEIGHT);
  assert.equal(state.grid[17].kind, 'core');
  assert.equal(countBuildings(state, 'solar'), 1);
  assert.equal(countBuildings(state, 'extractor'), 1);
  assert.equal(countBuildings(state, 'hydro'), 1);
  assert.equal(getEconomy(state).efficiency, 1);
  assert.equal(demolish(state, 17).ok, false);
});

test('only valid buildable terrain accepts construction', () => {
  const state = createGame();
  assert.ok(rift(state) >= 0);
  assert.equal(build(state, rift(state), 'solar').ok, false);
  assert.equal(build(state, 17, 'solar').ok, false);
  assert.equal(build(state, -2, 'solar').ok, false);
  assert.equal(build(state, 200, 'solar').ok, false);
  assert.equal(build(state, 0, 'nonexistent').ok, false);
  assert.equal(build(state, free(state), 'uplink').ok, false);
  const before = state.resources.scrap;
  const index = free(state);
  assert.equal(build(state, index, 'extractor').ok, true);
  assert.equal(state.grid[index].kind, 'extractor');
  assert.equal(state.resources.scrap, before - BUILDINGS.extractor.cost.scrap);
  assert.equal(build(state, index, 'extractor').ok, false);
});

test('terrain bonuses are consistent and local to the right structure', () => {
  assert.equal(siteBonus('extractor', 'ore'), 1.4);
  assert.equal(siteBonus('solar', 'dune'), 1.2);
  assert.equal(siteBonus('hydro', 'ice'), 1.35);
  assert.equal(siteBonus('hydro', 'ore'), 1);
});

test('production accumulates and stocks never overflow', () => {
  const state = createGame();
  const before = { ...state.resources };
  advance(state, 70);
  assert.ok(state.resources.scrap > before.scrap);
  assert.ok(state.resources.rations > before.rations);
  for (const key of Object.keys(CAPS)) {
    assert.ok(state.resources[key] >= 0 && state.resources[key] <= CAPS[key]);
  }
  advance(state, 900);
  for (const key of Object.keys(CAPS)) {
    assert.ok(state.resources[key] >= 0 && state.resources[key] <= CAPS[key]);
  }
});

test('production scales down if grid or crew capacity is exceeded', () => {
  const state = createGame();
  const baseline = getEconomy(state);
  assert.equal(baseline.efficiency, 1);
  for (const tile of state.grid.filter(tile => tile.kind === null && tile.terrain !== 'rift').slice(0, 15)) {
    tile.kind = 'smelter';
    tile.level = 3;
  }
  const constrained = getEconomy(state);
  assert.ok(constrained.powerNeeded > constrained.powerAvailable);
  assert.ok(constrained.efficiency < 1);
});

test('scarce input resources cannot become negative', () => {
  const state = createGame();
  state.resources.scrap = 0;
  state.resources.alloy = 0;
  const index = free(state);
  state.grid[index].kind = 'smelter';
  state.grid[index].level = 1;
  advance(state, 1);
  assert.ok(state.resources.scrap >= 0);
  assert.ok(state.resources.alloy >= 0);
});

test('structure upgrades use material costs and stop at MK3', () => {
  const state = createGame();
  state.resources.scrap = CAPS.scrap;
  state.resources.alloy = CAPS.alloy;
  const index = 18;
  assert.equal(upgrade(state, index).ok, true);
  assert.equal(state.grid[index].level, 2);
  assert.equal(upgrade(state, index).ok, true);
  assert.equal(state.grid[index].level, 3);
  assert.equal(upgrade(state, index).ok, false);
  assert.equal(demolish(state, index).ok, true);
  assert.equal(state.grid[index].kind, null);
  assert.equal(state.grid[index].level, 0);
});

test('research prerequisite chain enforces tech locks', () => {
  const state = createGame();
  assert.equal(research(state, 'beacon').ok, false);
  assert.equal(isUnlocked(state, BUILDINGS.uplink), false);
  assert.equal(research(state, 'listening').ok, true);
  assert.equal(research(state, 'listening').ok, false);
  assert.equal(isUnlocked(state, BUILDINGS.uplink), true);
  assert.equal(state.tech[0], TECHS[0].id);
});

test('expeditions pay costs once, complete once, and reward stocks', () => {
  const state = createGame();
  const beforeFood = state.resources.rations;
  assert.equal(startMission(state, 'survey').ok, false);
  assert.equal(startMission(state, 'salvage').ok, true);
  assert.equal(startMission(state, 'salvage').ok, false);
  assert.equal(state.resources.rations, beforeFood - MISSIONS[0].cost.rations);
  advance(state, 21);
  assert.equal(state.missionsCompleted, 0);
  assert.ok(state.mission);
  advance(state, 1);
  assert.equal(state.missionsCompleted, 1);
  assert.equal(state.mission, null);
  assert.ok(state.resources.alloy > 82);
});

test('completing the first milestone advances the campaign and pays a reward', () => {
  const state = createGame();
  assert.equal(state.stage, 0);
  assert.equal(build(state, free(state), 'extractor').ok, true);
  assert.equal(build(state, free(state), 'smelter').ok, true);
  assert.equal(state.stage, 1);
  assert.equal(objectiveProgress(state).stage, 2);
});

test('every 58 cycles environmental events are seeded and reproducible', () => {
  const left = createGame(1);
  const right = createGame(1);
  advance(left, 220);
  advance(right, 220);
  assert.deepEqual(left.resources, right.resources);
  assert.equal(left.seed, right.seed);
  assert.equal(left.stormTicks, right.stormTicks);
});

test('autosave JSON round-trips and grants capped offline production', () => {
  const state = createGame(100000);
  assert.equal(research(state, 'listening').ok, true);
  advance(state, 15);
  const data = saveGame(state, 100000);
  const same = loadGame(data, 100000);
  assert.equal(same.tick, state.tick);
  assert.deepEqual(same.tech, state.tech);
  const back = loadGame(data, 100000 + 4000000);
  assert.equal(back.tick - state.tick, MAX_OFFLINE_SECONDS);
});

test('saves reject incompatible versions and strip invalid constructions', () => {
  assert.throws(() => loadGame('{"version":99}'), /Unsupported or corrupted/);
  assert.throws(() => loadGame('{broken-json'));
  const state = createGame();
  state.grid[0].kind = '__proto__';
  state.grid[0].level = 12;
  state.tech = ['listening', 'made-up-tech'];
  const loaded = loadGame(JSON.stringify(state), state.lastSaved);
  assert.equal(loaded.grid[0].kind, null);
  assert.deepEqual(loaded.tech, ['listening']);
  assert.ok(loaded.grid[0].level <= 3);
});

test('simulation advances no more than the offline cap per call', () => {
  const state = createGame();
  assert.equal(advance(state, 1e8), MAX_OFFLINE_SECONDS);
  assert.equal(state.tick, MAX_OFFLINE_SECONDS);
  assert.equal(advance(state, -10), 0);
});

test('every building and mission has valid costs and recognizable icons', () => {
  assert.ok(Object.keys(BUILDINGS).length >= 9);
  for (const entry of [...Object.values(BUILDINGS), ...MISSIONS, ...TECHS]) {
    assert.equal(typeof entry.icon, 'string');
    assert.ok(Object.keys(entry.cost).length > 0);
    for (const [key, amount] of Object.entries(entry.cost)) {
      assert.ok(key in CAPS, 'unknown resource ' + key);
      assert.ok(amount > 0, 'nonpositive cost');
    }
  }
});
