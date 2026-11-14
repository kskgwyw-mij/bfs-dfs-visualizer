# BFS-DFS-Visualizer

Visualisiert **BFS (Breitensuche)** und **DFS (Tiefensuche)** parallel nebeneinander auf demselben Graphen – animiert im Browser, ausgeliefert von einem Node.js-Server **ohne externe Abhängigkeiten**. Darunter: **UCS vs. Greedy Best-First vs. A\*** auf einem gewichteten Standard-Graphen mit Heuristik.

## Starten

```bash
npm start
# oder: node server.js
```

Danach im Browser öffnen: http://localhost:3000 (Port per `PORT`-Umgebungsvariable änderbar).

## Funktionen

- **Standard-Beispiel**: Beim Start ist der klassische Lehrbuch-Graph geladen (Knoten S, A–F, G; S = Start, G = grünes Ziel)
- **Seiten-an-Seiten-Vergleich**: BFS (Queue/FIFO, links) und DFS (Stack/LIFO, rechts) laufen synchron auf identischem Graphen
- **UCS vs. Greedy Best-First vs. A\***: Drei informierte/uninformierte Suche-Algorithmen parallel; ein Schritt = ein Pop aus der Priority Queue, Prioritäten (g, h bzw. f = g + h) als Chips sichtbar, Rückgabepfad mit Kosten
  - **UCS, Greedy & A\*** laufen in der oberen Reihe auf demselben 8-Knoten-Standard-Graphen (S, A–F, G; Kanten S-A:5, S-E:3, S-F:4, S-B:4, A-D:8, B-C:3, C-G:5, D-G:4; h: S=10, A=6, B=7, C=4, D=3, E=11, F=9, G=0)
  - **A\* (6-Knoten-Standard)** läuft darunter auf dem 6-Knoten-Standard-Graphen (S, A–D, G; Kanten S-A:2, S-B:1, A-C:2, A-D:5, B-D:2, C-G:2, D-G:6; h: S=5, A=4, B=6, C=2, D=4, G=0)
  - **🎲 Neuer Graph**: erzeugt einen zufälligen gewichteten Graphen (8–12 Knoten, Spannbaum + zusätzliche Kanten, Gewichte 1–9, h = BFS-Distanz zum Ziel) für alle vier Panels
- **Animierte Canvas-Darstellung**: Knoten pulsieren, Kanten leuchten beim Entdecken auf, Farben für unbesucht / in Queue/Stack / aktuell / besucht / Ziel
- **Live-Strukturen**: Warteschlange bzw. Stapel werden als Chips unter jedem Canvas angezeigt
- **Steuerung**: Start, Pause, Einzelschritt, Zurücksetzen, Neuer Graph
- **Geschwindigkeit**: 1x–20x einstellbar
- **Startknoten wählbar** (Dropdown oder Klick auf einen Knoten im Canvas); der gegenüberliegende Knoten ist das Ziel – man sieht, welcher Algorithmus ihn zuerst findet
- **Graphwahl**: Beispiel-Graph (Standard) oder zufällig generiert mit 8–15 Knoten (Spannbaum + zusätzliche Kanten für Zyklen); der **Neuer Graph**-Button erzeugt sofort einen neuen Zufalls-Graphen (Buchstaben-Labels S, A–P, G), über das Dropdown kommt man zurück zum Beispiel-Graphen

## Architektur

| Datei | Zweck |
| --- | --- |
| `server.js` | Minimaler HTTP-Server (Node-Builtin-Module), liefert `public/` statisch aus |
| `public/index.html` | Oberfläche mit zwei Canvas-Panels und Steuerleiste |
| `public/style.css` | Dark-Theme- Styling, responsives Layout |
| `public/app.js` | Graphgenerierung, BFS-/DFS- und UCS/Greedy/A*-State-Machines, Canvas-Rendering, Animation |

Die Suchalgorithmen laufen clientseitig als zustandsbehaftete Schrittmaschinen; beide führen pro Tick genau einen Schritt aus, sodass der Vergleich fair im Gleichschritt bleibt.
