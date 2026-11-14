# BFS-DFS-Visualizer

Visualisiert **BFS (Breitensuche)** und **DFS (Tiefensuche)** parallel nebeneinander auf demselben Graphen – animiert im Browser, ausgeliefert von einem Node.js-Server **ohne externe Abhängigkeiten**.

## Starten

```bash
npm start
# oder: node server.js
```

Danach im Browser öffnen: http://localhost:3000 (Port per `PORT`-Umgebungsvariable änderbar).

## Funktionen

- **Standard-Beispiel**: Beim Start ist der klassische Lehrbuch-Graph geladen (Knoten S, A–F, G; S = Start, G = grünes Ziel)
- **Seiten-an-Seiten-Vergleich**: BFS (Queue/FIFO, links) und DFS (Stack/LIFO, rechts) laufen synchron auf identischem Graphen
- **Animierte Canvas-Darstellung**: Knoten pulsieren, Kanten leuchten beim Entdecken auf, Farben für unbesucht / in Queue/Stack / aktuell / besucht / Ziel
- **Live-Strukturen**: Warteschlange bzw. Stapel werden als Chips unter jedem Canvas angezeigt
- **Steuerung**: Start, Pause, Einzelschritt, Zurücksetzen, Neuer Graph
- **Geschwindigkeit**: 1x–20x einstellbar
- **Startknoten wählbar** (Dropdown oder Klick auf einen Knoten im Canvas); der gegenüberliegende Knoten ist das Ziel – man sieht, welcher Algorithmus ihn zuerst findet
- **Graphwahl**: Beispiel-Graph (Standard) oder zufällig generiert mit 8–15 Knoten (Spannbaum + zusätzliche Kanten für Zyklen)

## Architektur

| Datei | Zweck |
| --- | --- |
| `server.js` | Minimaler HTTP-Server (Node-Builtin-Module), liefert `public/` statisch aus |
| `public/index.html` | Oberfläche mit zwei Canvas-Panels und Steuerleiste |
| `public/style.css` | Dark-Theme- Styling, responsives Layout |
| `public/app.js` | Graphgenerierung, BFS-/DFS-State-Machines, Canvas-Rendering, Animation |

Die Suchalgorithmen laufen clientseitig als zustandsbehaftete Schrittmaschinen; beide führen pro Tick genau einen Schritt aus, sodass der Vergleich fair im Gleichschritt bleibt.
