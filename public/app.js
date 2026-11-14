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
    return { n, nodes, adj, edges };
  }

  function createState(kind) {
    return {
      kind,
      visited: new Set(),
      container: kind === 'bfs' ? [startNode] : [{ node: startNode, nextIdx: 0 }],
      treeEdges: [],
      steps: 0,
      current: null,
      done: false,
      found: false
    };
  }

  function resetSearch() {
    bfs = createState('bfs');
    dfs = createState('dfs');
    bfs.visited.add(startNode);
    dfs.visited.add(startNode);
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
      return;
    }
    bfs.visited.add(u);
    bfs.current = u;
    if (u === goalNode) {
      bfs.done = true;
      bfs.found = true;
      bfsStatusEl.textContent = '🎉 Ziel gefunden!';
      return;
    }
    for (const v of graph.adj[u]) {
      if (!bfs.visited.has(v) && !bfs.container.includes(v)) {
        bfs.container.push(v);
        bfs.treeEdges.push([u, v]);
        flash.bfs = { edge: [u, v], time: performance.now() };
      }
    }
  }

  function dfsStep() {
    if (dfs.done) return;
    if (dfs.container.length === 0) {
      dfs.done = true;
      dfsStatusEl.textContent = 'fertig (Ziel nicht gefunden)';
      return;
    }
    const top = dfs.container[dfs.container.length - 1];
    dfs.steps++;
    if (top.nextIdx === 0) {
      dfs.visited.add(top.node);
      dfs.current = top.node;
      if (top.node === goalNode) {
        dfs.done = true;
        dfs.found = true;
        dfsStatusEl.textContent = '🎉 Ziel gefunden!';
        return;
      }
    }
    while (top.nextIdx < graph.adj[top.node].length) {
      const v = graph.adj[top.node][top.nextIdx];
      top.nextIdx++;
      if (!dfs.visited.has(v) && !dfs.container.some((e) => e.node === v)) {
        dfs.container.push({ node: v, nextIdx: 0 });
        dfs.treeEdges.push([top.node, v]);
        flash.dfs = { edge: [top.node, v], time: performance.now() };
        return;
      }
    }
    dfs.container.pop();
    dfs.current = dfs.container.length
      ? dfs.container[dfs.container.length - 1].node
      : null;
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
    for (const entry of state.container) {
      const node = typeof entry === 'number' ? entry : entry.node;
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
      const [a, b] = activeFlash.edge;
      flashSet.add(Math.min(a, b) + '-' + Math.max(a, b));
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
      ctx.fillText(String(i), p.x, p.y + 0.5);
    }

    ctx.fillStyle = 'rgba(230, 236, 255, 0.55)';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Knoten: ${n}  |  Kanten: ${edges.length}`, 10, ctx.canvas.height - 10);
  }

  function render() {
    drawBoard(bfsCtx, bfs, '#38bdf8');
    drawBoard(dfsCtx, dfs, '#f472b6');
    requestAnimationFrame(render);
  }

  function updateChips() {
    bfsQueueEl.innerHTML = '';
    bfs.container.forEach((node) => {
      const chip = document.createElement('span');
      chip.className = 'chip' + (node === bfs.container[0] ? ' top' : '');
      chip.textContent = node;
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
      chip.textContent = stack[i].node;
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
    if (!bfs.done) bfsStatusEl.textContent = mode === 'running' ? 'läuft…' : mode === 'paused' ? 'pausiert' : 'bereit';
    if (!dfs.done) dfsStatusEl.textContent = mode === 'running' ? 'läuft…' : mode === 'paused' ? 'pausiert' : 'bereit';
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
    requestAnimationFrame(loop);
  }

  function newGraph() {
    const n = Number(nodeCountSelect.value);
    graph = generateGraph(n);
    startNode = 0;
    goalNode = n - 1;
    startNodeSelect.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Knoten ${i}`;
      startNodeSelect.appendChild(opt);
    }
    startNodeSelect.value = '0';
    resetSearch();
  }

  btnStart.addEventListener('click', () => {
    if (mode === 'done') return;
    mode = 'running';
    lastStepTime = 0;
    updateButtons();
    updateStats();
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

  btnNewGraph.addEventListener('click', newGraph);

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

  newGraph();
  requestAnimationFrame(render);
  requestAnimationFrame(loop);
})();
