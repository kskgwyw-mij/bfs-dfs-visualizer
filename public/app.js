(() => {
  'use strict';

  const COLORS = {
    bg: '#101627',
    edge: '#2a3450',
    edgeVisited: '#4a5878',
    unvisited: '#3b4664',
    frontier: '#fbbf24',
    current: '#ef4444',
    visited: '#22c55e',
    goal: '#a855f7',
    text: '#e6ecff'
  };

  const bfsCanvas = document.getElementById('bfs-canvas');
  const dfsCanvas = document.getElementById('dfs-canvas');
  const bfsCtx = bfsCanvas.getContext('2d');
  const dfsCtx = dfsCanvas.getContext('2d');

  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStep = document.getElementById('btn-step');
  const btnReset = document.getElementById('btn-reset');
  const btnNewGraph = document.getElementById('btn-newgraph');
  const speedInput = document.getElementById('speed');
  const speedValue = document.getElementById('speed-value');
  const startNodeSelect = document.getElementById('start-node');
  const nodeCountSelect = document.getElementById('node-count');

  const graphModeSelect = document.getElementById('graph-mode');
  const bfsQueueEl = document.getElementById('bfs-queue');
  const dfsStackEl = document.getElementById('dfs-stack');
  const bfsVisitedEl = document.getElementById('bfs-visited');
  const dfsVisitedEl = document.getElementById('bfs-visited-dfs');
  const bfsStepEl = document.getElementById('bfs-step');
  const dfsStepEl = document.getElementById('dfs-step');
  const bfsStatusEl = document.getElementById('bfs-status');
  const dfsStatusEl = document.getElementById('dfs-status');

  let graph = null;
  let startNode = 0;
  let goalNode = 0;
  let bfs = null;
  let dfs = null;
  let mode = 'idle';
  let lastStepTime = 0;
  let flash = { bfs: null, dfs: null };

  function buildExampleGraph() {
    const nodes = [
      { x: 60, y: 220 },
      { x: 160, y: 140 },
      { x: 280, y: 60 },
      { x: 270, y: 210 },
      { x: 170, y: 330 },
      { x: 320, y: 360 },
      { x: 420, y: 290 },
      { x: 500, y: 160 }
    ];
    const edgePairs = [
      [0, 1], [0, 4], [1, 2], [1, 3], [2, 7],
      [3, 6], [4, 3], [4, 5], [5, 6], [6, 7]
    ];
    const adj = Array.from({ length: 8 }, () => []);
    const edges = [];
    for (const [a, b] of edgePairs) {
      adj[a].push(b);
      adj[b].push(a);
      edges.push([a, b]);
    }
    adj.forEach((list) => list.sort((x, y) => x - y));
    return {
      n: 8,
      nodes,
      adj,
      edges,
      labels: ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
    };
  }

  function generateGraph(n) {
    const width = bfsCanvas.width;
    const height = bfsCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    const nodes = [];
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const jitter = radius * 0.18;
      nodes.push({
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * jitter,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * jitter
      });
    }

    const adj = Array.from({ length: n }, () => []);
    const edges = [];
    const seen = new Set();

    const addEdge = (a, b) => {
      if (a === b) return false;
      const key = Math.min(a, b) + '-' + Math.max(a, b);
      if (seen.has(key)) return false;
      seen.add(key);
      adj[a].push(b);
      adj[b].push(a);
      edges.push([a, b]);
      return true;
    };

    for (let i = 1; i < n; i++) {
      addEdge(i, Math.floor(Math.random() * i));
    }

    const targetExtra = Math.max(2, Math.floor(n * 0.5));
    let extra = 0;
    let tries = 0;
    while (extra < targetExtra && tries < 300) {
      const a = Math.floor(Math.random() * n);
      const b = Math.floor(Math.random() * n);
      if (addEdge(a, b)) extra++;
      tries++;
    }

    adj.forEach((list) => list.sort((x, y) => x - y));
    return {
      n,
      nodes,
      adj,
      edges,
      labels: Array.from({ length: n }, (_, i) => String(i))
    };
  }

  function createState(kind) {
    return {
      kind,
      visited: new Set(),
      container: [startNode],
      parent: new Array(graph.n).fill(-1),
      treeEdges: [],
      steps: 0,
      current: null,
      done: false,
      found: false,
      path: null
    };
  }

  function finishFound(state, statusEl) {
    state.done = true;
    state.found = true;
    const path = [];
    const seen = new Set();
    let cur = goalNode;
    while (cur !== -1 && !seen.has(cur)) {
      path.push(cur);
      seen.add(cur);
      if (cur === startNode) break;
      cur = state.parent[cur];
    }
    path.reverse();
    state.path = path;
    statusEl.textContent = `🎉 ${path.map((i) => graph.labels[i]).join('-')} (${path.length - 1} Schritte)`;
  }

  function resetSearch() {
    bfs = createState('bfs');
    dfs = createState('dfs');
    mode = 'idle';
    flash = { bfs: null, dfs: null };
    updateButtons();
    updateChips();
    updateStats();
    bfsStatusEl.textContent = 'bereit';
    dfsStatusEl.textContent = 'bereit';
  }

  function bfsStep() {
    if (bfs.done) return;
    if (bfs.container.length === 0) {
      bfs.done = true;
      bfsStatusEl.textContent = 'fertig (Ziel nicht gefunden)';
      return;
    }
    const u = bfs.container.shift();
    bfs.steps++;
    if (bfs.visited.has(u)) {
      bfs.current = null;
      bfsStatusEl.textContent = `${graph.labels[u]} übersprungen (Duplikat)`;
      return;
    }
    bfs.visited.add(u);
    bfs.current = u;
    if (u === goalNode) {
      finishFound(bfs, bfsStatusEl);
      return;
    }
    const newEdges = [];
    for (const v of graph.adj[u]) {
      if (!bfs.visited.has(v)) {
        if (bfs.parent[v] === -1) bfs.parent[v] = u;
        bfs.container.push(v);
        newEdges.push([u, v]);
      }
    }
    if (newEdges.length) {
      bfs.treeEdges.push(...newEdges);
      flash.bfs = { edges: newEdges, time: performance.now() };
    }
  }

  function dfsStep() {
    if (dfs.done) return;
    if (dfs.container.length === 0) {
      dfs.done = true;
      dfsStatusEl.textContent = 'fertig (Ziel nicht gefunden)';
      return;
    }
    const u = dfs.container.pop();
    dfs.steps++;
    if (dfs.visited.has(u)) {
      dfs.current = null;
      dfsStatusEl.textContent = `${graph.labels[u]} übersprungen (Duplikat)`;
      return;
    }
    dfs.visited.add(u);
    dfs.current = u;
    if (u === goalNode) {
      finishFound(dfs, dfsStatusEl);
      return;
    }
    const newEdges = [];
    for (const v of graph.adj[u]) {
      if (!dfs.visited.has(v)) {
        if (dfs.parent[v] === -1) dfs.parent[v] = u;
        dfs.container.push(v);
        newEdges.push([u, v]);
      }
    }
    if (newEdges.length) {
      dfs.treeEdges.push(...newEdges);
      flash.dfs = { edges: newEdges, time: performance.now() };
    }
  }

  function stepBoth() {
    bfsStep();
    dfsStep();
    updateChips();
    updateStats();
    if (bfs.done && dfs.done) {
      mode = 'done';
      updateButtons();
    }
  }

  function frontierSet(state) {
    const set = new Set();
    for (const node of state.container) {
      if (!state.visited.has(node)) set.add(node);
    }
    return set;
  }

  function drawBoard(ctx, state, accent) {
    const { n, nodes, edges } = graph;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const treeSet = new Set(state.treeEdges.map(([a, b]) => Math.min(a, b) + '-' + Math.max(a, b)));
    const frontier = frontierSet(state);
    const now = performance.now();
    const activeFlash = flash[state.kind];
    const flashSet = new Set();
    if (activeFlash && now - activeFlash.time < 450) {
      for (const [a, b] of activeFlash.edges) {
        flashSet.add(Math.min(a, b) + '-' + Math.max(a, b));
      }
    }

    for (const [a, b] of edges) {
      const key = Math.min(a, b) + '-' + Math.max(a, b);
      const isTree = treeSet.has(key);
      const isFlash = flashSet.has(key);
      const touched = state.visited.has(a) && state.visited.has(b);

      ctx.beginPath();
      ctx.moveTo(nodes[a].x, nodes[a].y);
      ctx.lineTo(nodes[b].x, nodes[b].y);
      if (isTree) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = isFlash ? 4 : 2.5;
        ctx.globalAlpha = 0.95;
      } else if (touched) {
        ctx.strokeStyle = COLORS.edgeVisited;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.9;
      } else {
        ctx.strokeStyle = COLORS.edge;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (isFlash) {
        const t = (now - activeFlash.time) / 450;
        ctx.beginPath();
        const mx = (nodes[a].x + nodes[b].x) / 2;
        const my = (nodes[a].y + nodes[b].y) / 2;
        ctx.arc(mx, my, 3 + t * 14, 0, 2 * Math.PI);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    for (let i = 0; i < n; i++) {
      const p = nodes[i];
      const isStart = i === startNode;
      const isGoal = i === goalNode;
      let fill = COLORS.unvisited;
      let r = 16;
      if (state.visited.has(i)) fill = COLORS.visited;
      if (frontier.has(i)) fill = COLORS.frontier;
      if (state.current === i && !state.done) {
        fill = COLORS.current;
        r = 18 + Math.sin(now / 120) * 2.5;
      }
      if (isGoal) fill = COLORS.goal;
      if (isStart && !state.visited.has(i)) fill = '#38bdf8';

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = fill;
      ctx.fill();
      if (isStart || isGoal) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = isStart ? '#38bdf8' : '#a855f7';
        ctx.stroke();
      }

      ctx.fillStyle = '#0b0f1a';
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(graph.labels[i], p.x, p.y + 0.5);
    }

    ctx.fillStyle = 'rgba(230, 236, 255, 0.55)';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Knoten: ${n}  |  Kanten: ${edges.length}`, 10, ctx.canvas.height - 10);
  }

  function render() {
    drawBoard(bfsCtx, bfs, '#38bdf8');
    drawBoard(dfsCtx, dfs, '#f472b6');
    if (ucs && greedy && astar) {
      drawWeightedBoard(ucsCtx, ucs, '#34d399', 'ucs');
      drawWeightedBoard(greedyCtx, greedy, '#fb923c', 'greedy');
      drawWeightedBoard(astarCtx, astar, '#a78bfa', 'astar');
    }
    requestAnimationFrame(render);
  }

  function updateChips() {
    bfsQueueEl.innerHTML = '';
    bfs.container.forEach((node) => {
      const chip = document.createElement('span');
      chip.className = 'chip' + (node === bfs.container[0] ? ' top' : '');
      chip.textContent = graph.labels[node];
      bfsQueueEl.appendChild(chip);
    });
    if (bfs.container.length === 0) {
      bfsQueueEl.innerHTML = '<span class="chip" style="background:#3b4664;color:#8a94b8">leer</span>';
    }

    dfsStackEl.innerHTML = '';
    const stack = dfs.container;
    for (let i = stack.length - 1; i >= 0; i--) {
      const chip = document.createElement('span');
      chip.className = 'chip' + (i === stack.length - 1 ? ' top' : '');
      chip.textContent = graph.labels[stack[i]];
      dfsStackEl.appendChild(chip);
    }
    if (stack.length === 0) {
      dfsStackEl.innerHTML = '<span class="chip" style="background:#3b4664;color:#8a94b8">leer</span>';
    }
  }

  function updateStats() {
    bfsVisitedEl.textContent = bfs.visited.size;
    dfsVisitedEl.textContent = dfs.visited.size;
    bfsStepEl.textContent = bfs.steps;
    dfsStepEl.textContent = dfs.steps;
  }

  function updateButtons() {
    btnStart.disabled = mode === 'running' || mode === 'done';
    btnPause.disabled = mode !== 'running';
    btnStep.disabled = mode === 'running' || mode === 'done';
  }

  function tick(now) {
    if (mode !== 'running') return;
    const interval = 800 / Number(speedInput.value);
    if (now - lastStepTime >= interval) {
      lastStepTime = now;
      stepBoth();
    }
  }

  function loop(now) {
    tick(now);
    tickInformed(now);
    requestAnimationFrame(loop);
  }

  function loadGraph() {
    if (graphModeSelect.value === 'example') {
      graph = buildExampleGraph();
    } else {
      graph = generateGraph(Number(nodeCountSelect.value));
    }
    startNode = 0;
    goalNode = graph.n - 1;
    startNodeSelect.innerHTML = '';
    for (let i = 0; i < graph.n; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Knoten ${graph.labels[i]}`;
      startNodeSelect.appendChild(opt);
    }
    startNodeSelect.value = '0';
    nodeCountSelect.disabled = graphModeSelect.value === 'example';
    resetSearch();
  }

  btnStart.addEventListener('click', () => {
    if (mode === 'done') return;
    mode = 'running';
    lastStepTime = 0;
    bfsStatusEl.textContent = 'läuft…';
    dfsStatusEl.textContent = 'läuft…';
    updateButtons();
  });

  btnPause.addEventListener('click', () => {
    if (mode !== 'running') return;
    mode = 'paused';
    updateButtons();
    updateStats();
  });

  btnStep.addEventListener('click', () => {
    if (mode === 'running' || mode === 'done') return;
    stepBoth();
    if (bfs.done && dfs.done) {
      mode = 'done';
      updateButtons();
    }
  });

  btnReset.addEventListener('click', resetSearch);

  btnNewGraph.addEventListener('click', loadGraph);

  graphModeSelect.addEventListener('change', loadGraph);

  speedInput.addEventListener('input', () => {
    speedValue.textContent = speedInput.value + 'x';
  });

  startNodeSelect.addEventListener('change', () => {
    startNode = Number(startNodeSelect.value);
    resetSearch();
  });

  function canvasNodeFromEvent(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((evt.clientY - rect.top) / rect.height) * canvas.height;
    let best = -1;
    let bestDist = 24;
    graph.nodes.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  [bfsCanvas, dfsCanvas].forEach((canvas) => {
    canvas.addEventListener('click', (evt) => {
      const node = canvasNodeFromEvent(canvas, evt);
      if (node === -1 || node === goalNode) return;
      startNode = node;
      startNodeSelect.value = String(node);
      resetSearch();
    });
  });

  loadGraph();
  requestAnimationFrame(render);
  requestAnimationFrame(loop);

  const ucsCanvas = document.getElementById('ucs-canvas');
  const greedyCanvas = document.getElementById('greedy-canvas');
  const astarCanvas = document.getElementById('astar-canvas');
  const ucsCtx = ucsCanvas.getContext('2d');
  const greedyCtx = greedyCanvas.getContext('2d');
  const astarCtx = astarCanvas.getContext('2d');

  const btnIStart = document.getElementById('btn-i-start');
  const btnIPause = document.getElementById('btn-i-pause');
  const btnIStep = document.getElementById('btn-i-step');
  const btnIReset = document.getElementById('btn-i-reset');
  const speed2Input = document.getElementById('speed2');
  const speed2Value = document.getElementById('speed2-value');

  const ucsOpenEl = document.getElementById('ucs-open');
  const greedyOpenEl = document.getElementById('greedy-open');
  const astarOpenEl = document.getElementById('astar-open');
  const ucsVisitedEl = document.getElementById('ucs-visited');
  const greedyVisitedEl = document.getElementById('greedy-visited');
  const astarVisitedEl = document.getElementById('astar-visited');
  const ucsStepEl = document.getElementById('ucs-step');
  const greedyStepEl = document.getElementById('greedy-step');
  const astarStepEl = document.getElementById('astar-step');
  const ucsStatusEl = document.getElementById('ucs-status');
  const greedyStatusEl = document.getElementById('greedy-status');
  const astarStatusEl = document.getElementById('astar-status');

  const W_START = 0;

  let wgraphUG = null;
  let wgraphA = null;
  let ucs = null;
  let greedy = null;
  let astar = null;
  let mode2 = 'idle';
  let lastStepTime2 = 0;
  let flash2 = { ucs: null, greedy: null, astar: null };

  function buildWeightedGraphUG() {
    const nodes = [

      { x: 75, y: 210 },
      { x: 240, y: 210 },
      { x: 240, y: 355 },
      { x: 405, y: 210 },
      { x: 405, y: 65 },
      { x: 75, y: 355 },
      { x: 75, y: 65 },
      { x: 405, y: 355 }
    ];
    const h = [5, 4, 6, 2, 4, 0];
    const edgeList = [

      [0, 1, 5], [0, 5, 3], [0, 6, 4],
      [1, 4, 8], [1, 2, 4], [2, 3, 3], [3, 7, 5], [4, 7, 4]

    ];
    const adj = Array.from({ length: 6 }, () => []);
    for (const [a, b, w] of edgeList) {
      adj[a].push({ node: b, w });
      adj[b].push({ node: a, w });
    }
    adj.forEach((list) => list.sort((x, y) => x.node - y.node));
    return {
      n: 6,
      nodes,
      adj,
      edges: edgeList,
      labels: ['S', 'A', 'B', 'C', 'D', 'G'],
      h
    };
  }

  function buildWeightedGraphAstar() {
    const nodes = [
      { x: 60, y: 210 },
      { x: 180, y: 90 },
      { x: 180, y: 330 },
      { x: 330, y: 90 },
      { x: 330, y: 330 },
      { x: 430, y: 210 }
    ];
    const h = [5, 4, 6, 2, 4, 0];
    const edgeList = [
      [0, 1, 2], [0, 2, 1], [1, 3, 2], [1, 4, 5],
      [2, 4, 2], [3, 5, 2], [4, 5, 6]
    ];
    const adj = Array.from({ length: 6 }, () => []);
    for (const [a, b, w] of edgeList) {
      adj[a].push({ node: b, w });
      adj[b].push({ node: a, w });
    }
    adj.forEach((list) => list.sort((x, y) => x.node - y.node));
    return {
      n: 6,
      nodes,
      adj,
      edges: edgeList,
      labels: ['S', 'A', 'B', 'C', 'D', 'G'],
      h
    };
  }

  function createInformedState(kind, g) {
    return {
      kind,
      graph: g,
      visited: new Set(),
      open: [{ node: W_START, g: 0, parent: -1 }],
      parent: new Array(g.n).fill(-1),
      treeEdges: [],
      steps: 0,
      current: null,
      done: false,
      found: false,
      path: null,
      cost: null
    };
  }

  function prio(mode, entry, g) {
    if (mode === 'ucs') return entry.g;
    if (mode === 'greedy') return g.h[entry.node];
    return entry.g + g.h[entry.node];
  }

  function popMin(state, mode) {
    let best = 0;
    for (let i = 1; i < state.open.length; i++) {
      if (prio(mode, state.open[i], state.graph) < prio(mode, state.open[best], state.graph)) best = i;
    }
    return state.open.splice(best, 1)[0];
  }

  function finishInformed(state, statusEl) {
    state.done = true;
    state.found = true;
    const path = [];
    const seen = new Set();
    const goal = state.graph.n - 1;
    let cur = goal;
    while (cur !== -1 && !seen.has(cur)) {
      path.push(cur);
      seen.add(cur);
      if (cur === W_START) break;
      cur = state.parent[cur];
    }
    path.reverse();
    state.path = path;
    statusEl.textContent = `🎉 ${path.map((i) => state.graph.labels[i]).join('-')} (Kosten: ${state.cost})`;
  }

  function informedStep(state, mode, statusEl) {
    if (state.done) return;
    if (state.open.length === 0) {
      state.done = true;
      statusEl.textContent = 'fertig (Ziel nicht gefunden)';
      return;
    }
    const entry = popMin(state, mode);
    state.steps++;
    if (state.visited.has(entry.node)) {
      state.current = null;
      statusEl.textContent = `${state.graph.labels[entry.node]} übersprungen (Duplikat)`;
      return;
    }
    state.visited.add(entry.node);
    state.parent[entry.node] = entry.parent;
    state.current = entry.node;
    if (entry.node === state.graph.n - 1) {
      state.cost = entry.g;
      finishInformed(state, statusEl);
      return;
    }
    const newEdges = [];
    for (const nb of state.graph.adj[entry.node]) {
      if (!state.visited.has(nb.node)) {
        state.open.push({ node: nb.node, g: entry.g + nb.w, parent: entry.node });
        newEdges.push([entry.node, nb.node]);
      }
    }
    if (newEdges.length) {
      state.treeEdges.push(...newEdges);
      flash2[state.kind] = { edges: newEdges, time: performance.now() };
    }
  }

  function sortedOpen(state, mode) {
    return state.open
      .map((e, i) => ({ e, i }))
      .sort((x, y) => prio(mode, x.e, state.graph) - prio(mode, y.e, state.graph) || x.i - y.i)
      .map((o) => o.e);
  }

  function updateInformedChips() {
    const configs = [
      [ucs, 'ucs', ucsOpenEl],
      [greedy, 'greedy', greedyOpenEl],
      [astar, 'astar', astarOpenEl]
    ];
    for (const [state, mode, el] of configs) {
      el.innerHTML = '';
      const sorted = sortedOpen(state, mode);
      sorted.forEach((entry, idx) => {
        const chip = document.createElement('span');
        chip.className = 'chip' + (idx === 0 ? ' top' : '');
        chip.textContent = `${state.graph.labels[entry.node]}:${prio(mode, entry, state.graph)}`;
        el.appendChild(chip);
      });
      if (sorted.length === 0) {
        el.innerHTML = '<span class="chip" style="background:#3b4664;color:#8a94b8">leer</span>';
      }
    }
  }

  function updateInformedStats() {
    ucsVisitedEl.textContent = ucs.visited.size;
    greedyVisitedEl.textContent = greedy.visited.size;
    astarVisitedEl.textContent = astar.visited.size;
    ucsStepEl.textContent = ucs.steps;
    greedyStepEl.textContent = greedy.steps;
    astarStepEl.textContent = astar.steps;
  }

  function updateInformedButtons() {
    btnIStart.disabled = mode2 === 'running' || mode2 === 'done';
    btnIPause.disabled = mode2 !== 'running';
    btnIStep.disabled = mode2 === 'running' || mode2 === 'done';
  }

  function resetInformed() {
    ucs = createInformedState('ucs', wgraphUG);
    greedy = createInformedState('greedy', wgraphUG);
    astar = createInformedState('astar', wgraphA);
    mode2 = 'idle';
    flash2 = { ucs: null, greedy: null, astar: null };
    ucsStatusEl.textContent = 'bereit';
    greedyStatusEl.textContent = 'bereit';
    astarStatusEl.textContent = 'bereit';
    updateInformedButtons();
    updateInformedChips();
    updateInformedStats();
  }

  function stepInformedAll() {
    informedStep(ucs, 'ucs', ucsStatusEl);
    informedStep(greedy, 'greedy', greedyStatusEl);
    informedStep(astar, 'astar', astarStatusEl);
    updateInformedChips();
    updateInformedStats();
    if (ucs.done && greedy.done && astar.done) {
      mode2 = 'done';
      updateInformedButtons();
    }
  }

  function tickInformed(now) {
    if (mode2 !== 'running') return;
    const interval = 800 / Number(speed2Input.value);
    if (now - lastStepTime2 >= interval) {
      lastStepTime2 = now;
      stepInformedAll();
    }
  }

  function drawWeightedBoard(ctx, state, accent, mode) {
    const { n, nodes, edges, h } = state.graph;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const treeSet = new Set(state.treeEdges.map(([a, b]) => Math.min(a, b) + '-' + Math.max(a, b)));
    const frontier = new Set();
    for (const entry of state.open) {
      if (!state.visited.has(entry.node)) frontier.add(entry.node);
    }
    const now = performance.now();
    const activeFlash = flash2[state.kind];
    const flashSet = new Set();
    if (activeFlash && now - activeFlash.time < 450) {
      for (const [a, b] of activeFlash.edges) {
        flashSet.add(Math.min(a, b) + '-' + Math.max(a, b));
      }
    }

    for (const [a, b, w] of edges) {
      const key = Math.min(a, b) + '-' + Math.max(a, b);
      const isTree = treeSet.has(key);
      const isFlash = flashSet.has(key);
      const touched = state.visited.has(a) && state.visited.has(b);

      ctx.beginPath();
      ctx.moveTo(nodes[a].x, nodes[a].y);
      ctx.lineTo(nodes[b].x, nodes[b].y);
      if (isTree) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = isFlash ? 4 : 2.5;
        ctx.globalAlpha = 0.95;
      } else if (touched) {
        ctx.strokeStyle = COLORS.edgeVisited;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.9;
      } else {
        ctx.strokeStyle = COLORS.edge;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (isFlash) {
        const t = (now - activeFlash.time) / 450;
        ctx.beginPath();
        const mx = (nodes[a].x + nodes[b].x) / 2;
        const my = (nodes[a].y + nodes[b].y) / 2;
        ctx.arc(mx, my, 3 + t * 14, 0, 2 * Math.PI);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const mx = (nodes[a].x + nodes[b].x) / 2;
      const my = (nodes[a].y + nodes[b].y) / 2;
      const dx = nodes[b].x - nodes[a].x;
      const dy = nodes[b].y - nodes[a].y;
      const len = Math.hypot(dx, dy) || 1;
      const ox = (-dy / len) * 12;
      const oy = (dx / len) * 12;
      const label = String(w);
      ctx.font = 'bold 11px Segoe UI, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(16, 22, 39, 0.85)';
      ctx.fillRect(mx + ox - tw / 2 - 3, my + oy - 8, tw + 6, 14);
      ctx.fillStyle = isTree ? accent : '#8a94b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx + ox, my + oy - 1);
    }

    for (let i = 0; i < n; i++) {
      const p = nodes[i];
      const isStart = i === W_START;
      const isGoal = i === n - 1;
      let fill = COLORS.unvisited;
      let r = 16;
      if (state.visited.has(i)) fill = COLORS.visited;
      if (frontier.has(i)) fill = COLORS.frontier;
      if (state.current === i && !state.done) {
        fill = COLORS.current;
        r = 18 + Math.sin(now / 120) * 2.5;
      }
      if (isGoal) fill = COLORS.goal;
      if (isStart && !state.visited.has(i)) fill = '#38bdf8';

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = fill;
      ctx.fill();
      if (isStart || isGoal) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = isStart ? '#38bdf8' : '#a855f7';
        ctx.stroke();
      }

      ctx.fillStyle = '#0b0f1a';
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.graph.labels[i], p.x, p.y + 0.5);

      ctx.fillStyle = 'rgba(230, 236, 255, 0.65)';
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.fillText(`h=${h[i]}`, p.x, p.y + r + 10);
    }
  }

  btnIStart.addEventListener('click', () => {
    if (mode2 === 'done') return;
    mode2 = 'running';
    lastStepTime2 = 0;
    ucsStatusEl.textContent = 'läuft…';
    greedyStatusEl.textContent = 'läuft…';
    astarStatusEl.textContent = 'läuft…';
    updateInformedButtons();
  });

  btnIPause.addEventListener('click', () => {
    if (mode2 !== 'running') return;
    mode2 = 'paused';
    updateInformedButtons();
  });

  btnIStep.addEventListener('click', () => {
    if (mode2 === 'running' || mode2 === 'done') return;
    stepInformedAll();
  });

  btnIReset.addEventListener('click', resetInformed);

  speed2Input.addEventListener('input', () => {
    speed2Value.textContent = speed2Input.value + 'x';
  });

  wgraphUG = buildWeightedGraphUG();
  wgraphA = buildWeightedGraphAstar();
  resetInformed();
})();
