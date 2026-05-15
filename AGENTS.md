# AGENTS.md

## Projekt

RunTimer ist eine minimalistische mobile PWA für Intervall-Läufe.

## Grundregeln

- Keine externen Abhängigkeiten hinzufügen.
- Kein Backend hinzufügen.
- Kein Login hinzufügen.
- Kein Tracking oder Analytics hinzufügen.
- Daten nur lokal im Browser speichern.
- HTML, CSS und Vanilla JavaScript verwenden.
- Mobile-first entwickeln.
- PWA-Installierbarkeit erhalten.

## Datenschutz

- Keine personenbezogenen Daten an Server senden.
- Keine externen Requests einbauen.
- LocalStorage nur für App-Einstellungen verwenden.
- Keine Laufhistorie, Standortdaten oder Gerätekennungen speichern.

## Code-Stil

- Verständliche, kleine Funktionen bevorzugen.
- Keine Frameworks.
- Keine Build-Schritte voraussetzen.
- Keine try/catch-Blöcke um Imports.
- Relative Pfade verwenden, damit die App auf GitHub Pages funktioniert.

## PWA

- `manifest.json` aktuell halten.
- Icons unter `icons/` pflegen.
- Service Worker bei Änderungen an statischen Assets versionieren.
- Offlinefähigkeit für die App-Shell erhalten.

## Standard-Preset

- Laufzeit: 1:45
- Gehzeit: 1:15
- Wiederholungen: 10

## Manuelle Checks vor Abschluss

- App startet mit Standard-Preset.
- Start, Pause, Fortsetzen und Reset funktionieren.
- Phasenwechsel Laufen/Gehen/Fertig ist sichtbar.
- Einstellungen bleiben nach Reload erhalten.
- App enthält keine externen Requests.
- PWA-Manifest ist gültig.
