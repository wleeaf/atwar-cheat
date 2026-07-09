# atwar-cheat

A Tampermonkey userscript for [atWar](https://atwar-game.com), for single-player rooms (or private rooms populated entirely by your own accounts).

## What it does

- **Fog-of-war reveal**: shows every city's real troop count and unit composition on the map, including stealth units, instead of just nearby/detected ones. This works by patching the client-side view-range check (`MapHelper.IsPointWithinViewRange`) that gates what the UI renders - it doesn't change what's sent to the server.
- **Free movement**: removes the client-side "invalid route" indicator, so drags always commit through the normal UI regardless of terrain (e.g. moving a land unit onto sea), enemy proximity, or defence-line checks.

Both features are pure client-side rendering/validation patches - the server independently validates everything it actually cares about (unit production caps, movement range, attack range all still enforced server-side).

Works whether you're an active player or spectating, and is independent of the site's UI language.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Add a new script and paste in the contents of `atwar-fog-of-war.user.js`.
3. Open a game - it self-installs within a few seconds and reapplies every 15s to catch newly-scouted cities/units.
