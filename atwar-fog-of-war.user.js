// ==UserScript==
// @name         atWar Single-Player Fog-of-War Reveal + Free Movement
// @namespace    atwar-cheat
// @version      2.1
// @description  Single-player-only: reveals full troop counts/composition on the map (patches the client-side view-range check) and removes the client-side "invalid route" gate so drags always commit (e.g. land units onto sea). Language-independent and works while spectating, not just as an active player.
// @match        *://*.atwar-game.com/games/*
// @match        *://atwar-game.com/games/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const HUGE = 999999999;

  function findGame() {
    if (window.__game) return window.__game;
    if (typeof ko === 'undefined') return null;

    const candidates = document.querySelectorAll('[data-bind]');
    for (const el of candidates) {
      let ctx;
      try { ctx = ko.contextFor(el); } catch (e) { continue; }
      for (let c = ctx, depth = 0; c && depth < 8; c = c.$parentContext, depth++) {
        if (c.$data && c.$data.game) return c.$data.game;
      }
    }
    return null;
  }

  function revealFogOfWar(g) {
    const cp = g.CurrentPlayer();

    Object.getPrototypeOf(g.MapHelper).IsPointWithinViewRange = function () { return true; };

    if (cp) {
      for (const t of cp.Army) {
        t.PixelDetectLandRange = () => HUGE;
        t.PixelDetectNavalRange = () => HUGE;
        t.PixelDetectAirRange = () => HUGE;
      }
    }

    let citiesChecked = 0, citiesRevealed = 0;
    const owners = new Set();
    for (let id = 1; id <= 250; id++) {
      let c;
      try { c = g.Countries.get_item(id); } catch (e) { continue; }
      if (!c || !Array.isArray(c.Cities)) continue;
      for (const city of c.Cities) {
        citiesChecked++;
        const marker = city.Marker;
        if (marker && typeof marker.get_ShowCount === 'function' && marker.get_ShowCount() === false) {
          marker.set_ShowCount(true);
          citiesRevealed++;
        }
        const troop = typeof city.CityTroop === 'function' ? city.CityTroop() : city.CityTroop;
        if (troop && typeof troop.UpdateMarker === 'function') {
          try { troop.UpdateMarker(); } catch (e) {}
        }
        const owner = city.$owner;
        if (owner && owner.Id !== 0 && (!cp || owner.Id !== cp.Id)) owners.add(owner);
      }
    }

    let troopsUpdated = 0;
    for (const owner of owners) {
      if (!Array.isArray(owner.Army)) continue;
      for (const t of owner.Army) {
        if (typeof t.UpdateMarker === 'function') {
          try { t.UpdateMarker(); troopsUpdated++; } catch (e) {}
        }
      }
    }

    return { hasPlayer: !!cp, citiesChecked, citiesRevealed, playersFound: owners.size, troopsUpdated };
  }

  function patchRouteInvalid(g) {
    const cp = g.CurrentPlayer();

    let sample = cp && cp.Army.length > 0 ? cp.Army[0] : null;
    if (!sample) {
      outer: for (let id = 1; id <= 250; id++) {
        let c;
        try { c = g.Countries.get_item(id); } catch (e) { continue; }
        if (!c || !Array.isArray(c.Cities)) continue;
        for (const city of c.Cities) {
          const troop = typeof city.CityTroop === 'function' ? city.CityTroop() : city.CityTroop;
          if (troop) { sample = troop; break outer; }
        }
      }
    }
    if (!sample) return { patched: false };

    const TroopProto = Object.getPrototypeOf(sample);
    if (!TroopProto.__atwarRouteInvalidPatched) {
      Object.defineProperty(TroopProto, 'RouteInvalid', {
        get() { return false; },
        set(_v) {},
        configurable: true,
      });
      Object.defineProperty(TroopProto, '__atwarRouteInvalidPatched', { value: true, configurable: true });
    }

    let stripped = 0;
    function stripOwn(troop) {
      if (troop && Object.prototype.hasOwnProperty.call(troop, 'RouteInvalid')) {
        delete troop.RouteInvalid;
        stripped++;
      }
    }
    if (cp) for (const t of cp.Army) stripOwn(t);
    for (let id = 1; id <= 250; id++) {
      let c;
      try { c = g.Countries.get_item(id); } catch (e) { continue; }
      if (!c || !Array.isArray(c.Cities)) continue;
      for (const city of c.Cities) {
        stripOwn(typeof city.CityTroop === 'function' ? city.CityTroop() : city.CityTroop);
      }
    }

    return { patched: true, stripped };
  }

  function tryInstall() {
    const g = findGame();
    if (!g) return false;

    window.__game = g;
    const result = revealFogOfWar(g);
    result.routeInvalidPatch = patchRouteInvalid(g);

    console.log('[atwar-cheat] fog-of-war reveal + free movement applied', result);
    return true;
  }

  const retryInterval = setInterval(() => {
    if (tryInstall()) {
      clearInterval(retryInterval);
      setInterval(() => {
        try { tryInstall(); } catch (e) { console.warn('[atwar-cheat] re-apply failed', e); }
      }, 15000);
    }
  }, 3000);
})();
