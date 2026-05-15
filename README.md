# RunTimer

RunTimer ist eine minimalistische mobile PWA für Intervall-Läufe mit Lauf- und Gehphasen.

## Ziel

Die App unterstützt einfache Lauf-/Geh-Intervalle ohne Login, Backend, Tracking oder externe Abhängigkeiten. Alle Einstellungen bleiben lokal im Browser.

## Funktionen in Version 0.1

- Laufzeit einstellen
- Gehzeit einstellen
- Wiederholungen einstellen
- Start, Pause, Fortsetzen und Reset
- Große Statusanzeige für Bereit, Laufen, Gehen, Pausiert und Fertig
- Optischer Wechsel zwischen Lauf-, Geh-, Pause- und Fertig-Status
- Optionale Vibration beim Phasenwechsel, falls vom Gerät unterstützt
- Optionaler Signalton beim Phasenwechsel
- Letzte Einstellung wird lokal im Browser gespeichert
- PWA-installierbar und nach erstem Laden offline nutzbar

## Standard-Preset

- Laufen: 1:45
- Gehen: 1:15
- Wiederholungen: 10

## Datenschutz

RunTimer speichert Einstellungen ausschließlich lokal im Browser. Es gibt keinen Login, kein Backend, kein Tracking und keine Datenübertragung an externe Dienste. Es werden keine Laufhistorie, Standortdaten oder personenbezogenen Daten gespeichert.

## Technische Basis

- HTML
- CSS
- Vanilla JavaScript
- Progressive Web App
- Keine externen Abhängigkeiten

## Lokale Nutzung

Die App kann direkt über einen statischen Webserver ausgeliefert werden:

```sh
python3 -m http.server 8080
```

Danach im Browser öffnen:

```text
http://localhost:8080
```

## Getestet auf iPhone 11 / Safari

RunTimer wurde auf einem iPhone 11 mit Safari getestet:

- Start, Pause, Fortsetzen, Reset, Eingaben, gespeicherte Einstellungen und Weiterlaufen bei gesperrtem Handy funktionieren.
- Vibration ist auf iPhone/Safari nicht verfügbar und wird automatisch deaktiviert, wenn der Browser sie nicht unterstützt.
- Ton funktioniert, wenn der Stumm-Modus am iPhone deaktiviert ist.

## Hinweise

Mobile Browser können Timer, Ton oder Vibration einschränken, wenn die App im Hintergrund ist oder der Bildschirm gesperrt wird. Für zuverlässige Nutzung sollte RunTimer während des Trainings geöffnet bleiben.
