// script.js
(() => {
  const display = document.getElementById('display');
  const historyEl = document.getElementById('history');
  const buttons = Array.from(document.querySelectorAll('.btn'));
  const clearBtn = document.getElementById('clear');
  const backBtn = document.getElementById('back');
  const equalsBtn = document.getElementById('equals');
  const degRadBtn = document.getElementById('degRadBtn');
  const graphBtn = document.getElementById('graphBtn');
  const graphModal = document.getElementById('graphModal');
  const closeGraph = document.getElementById('closeGraph');
  const plotBtn = document.getElementById('plotBtn');
  const graphCanvas = document.getElementById('graphCanvas');
  const graphExpr = document.getElementById('graphExpr');
  const xminInput = document.getElementById('xmin');
  const xmaxInput = document.getElementById('xmax');
  const clearPlot = document.getElementById('clearPlot');
  const ansBtn = document.getElementById('ansBtn');
  const piBtn = document.getElementById('piBtn');

  let state = { expr: '', ans: null, angleMode: 'deg' };

  function setDisplay(txt) {
    display.textContent = txt === '' ? '0' : txt;
  }

  function push(val) {
    if (state.expr === '0') state.expr = '';
    state.expr += val;
    setDisplay(state.expr);
  }

  function safeExprForEval(expr) {
    // Replace caret with **, factorial, percentage, and map common math functions
    let s = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/\^/g, '**')
      // factorial naive: n! => factorial(n) (only single number or parenthesis)
      .replace(/(\d+|\))!/g, (m) => `factorial(${m.replace('!','')})`)
      .replace(/π/g, 'PI');

    // map functions to Math equivalents
    const map = {
      'sin(': 'sin(',
      'cos(': 'cos(',
      'tan(': 'tan(',
      'sqrt(': 'Math.sqrt(',
      'ln(': 'Math.log(',
      'log10(': 'Math.log10 ? Math.log10(' : 'Math.log(',
      'log(': 'Math.log10 ? Math.log10(' : 'Math.log(',
    };
    // we will replace with wrappers later; simpler approach: leave sin/cos/tan and evaluate via the context with our functions
    return s;
  }

  function factorial(n) {
    n = Number(n);
    if (!Number.isFinite(n) || n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= Math.floor(n); i++) res *= i;
    return res;
  }

  // Evaluate expression with safe context
  function evaluateExpression(raw) {
    if (!raw || raw.trim() === '') return 0;
    const expr = raw.replace(/\s+/g, '');
    // create a function with limited scope
    const s = safeExprForEval(expr);

    // Provide safe math context
    const context = {
      PI: Math.PI,
      E: Math.E,
      factorial,
      sin: (v) => state.angleMode === 'deg' ? Math.sin(v * Math.PI/180) : Math.sin(v),
      cos: (v) => state.angleMode === 'deg' ? Math.cos(v * Math.PI/180) : Math.cos(v),
      tan: (v) => state.angleMode === 'deg' ? Math.tan(v * Math.PI/180) : Math.tan(v),
      sqrt: Math.sqrt,
      ln: Math.log,
      log: (v) => Math.log10 ? Math.log10(v) : Math.log(v)/Math.LN10,
      Math
    };

    // Build code string that references context safely
    // We'll use Function with context variables injected as params
    try {
      const names = Object.keys(context);
      const vals = Object.values(context);
      const func = new Function(...names, `return (${s});`);
      const result = func(...vals);
      return result;
    } catch (e) {
      // second try: allow x (for graph functions); replace ^ with **
      try {
        const func2 = new Function(...Object.keys(context), `return (${s});`);
        return func2(...Object.values(context));
      } catch (err) {
        throw new Error('Syntax error');
      }
    }
  }

  // button click handling
  buttons.forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.value;
      if (v !== undefined) {
        push(v);
      }
    });
  });

  clearBtn.addEventListener('click', () => {
    state.expr = '';
    setDisplay('');
  });

  backBtn.addEventListener('click', () => {
    state.expr = state.expr.slice(0, -1);
    setDisplay(state.expr);
  });

  equalsBtn.addEventListener('click', () => {
    try {
      const res = evaluateExpression(state.expr);
      historyEl.textContent = state.expr + ' =';
      state.ans = res;
      state.expr = String(res);
      setDisplay(state.expr);
    } catch (e) {
      setDisplay('ERR');
      state.expr = '';
    }
  });

  degRadBtn.addEventListener('click', () => {
    state.angleMode = state.angleMode === 'deg' ? 'rad' : 'deg';
    degRadBtn.textContent = state.angleMode.toUpperCase();
  });

  ansBtn.addEventListener('click', () => {
    if (state.ans !== null) push(String(state.ans));
  });

  piBtn.addEventListener('click', () => push('π'));

  // Keyboard support
  window.addEventListener('keydown', (ev) => {
    if (ev.key >= '0' && ev.key <= '9') push(ev.key);
    else if (ev.key === 'Enter') equalsBtn.click();
    else if (ev.key === 'Backspace') backBtn.click();
    else if (ev.key === 'Escape') clearBtn.click();
    else if ('+-*/().%^,'.includes(ev.key)) push(ev.key);
  });

  // Graph modal
  graphBtn.addEventListener('click', () => {
    graphModal.classList.remove('hidden');
    graphModal.setAttribute('aria-hidden','false');
  });
  closeGraph.addEventListener('click', () => {
    graphModal.classList.add('hidden');
    graphModal.setAttribute('aria-hidden','true');
  });

  // Plot
  function drawAxes(ctx, w, h, xmin, xmax, ymin, ymax) {
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#021b25';
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle = '#446';
    ctx.lineWidth = 1;
    // grid
    for (let x = Math.ceil(xmin); x <= Math.floor(xmax); x++) {
      const px = (x - xmin)/(xmax - xmin) * w;
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,h); ctx.stroke();
    }
    for (let y = Math.ceil(ymin); y <= Math.floor(ymax); y++) {
      const py = (1 - (y - ymin)/(ymax - ymin)) * h;
      ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(w,py); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = '#99b';
    ctx.lineWidth = 2;
    // y axis at x=0
    if (xmin <= 0 && xmax >= 0) {
      const px = (0 - xmin)/(xmax - xmin) * w;
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,h); ctx.stroke();
    }
    // x axis at y=0
    if (ymin <= 0 && ymax >= 0) {
      const py = (1 - (0 - ymin)/(ymax - ymin)) * h;
      ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(w,py); ctx.stroke();
    }
  }

  plotBtn.addEventListener('click', () => {
    const expr = graphExpr.value.trim();
    if (!expr) return alert('Enter a function in x, e.g. sin(x)');
    const xmin = parseFloat(xminInput.value) || -10;
    const xmax = parseFloat(xmaxInput.value) || 10;
    const canvas = graphCanvas;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // compute y range by sampling
    const sampleCount = w;
    const xs = new Float32Array(sampleCount);
    const ys = new Float32Array(sampleCount);
    let ymin=Infinity, ymax=-Infinity;
    for (let i=0;i<sampleCount;i++){
      const x = xmin + (i/(sampleCount-1))*(xmax-xmin);
      xs[i] = x;
    }

    // prepare evaluator that has x defined
    try {
      const s = safeExprForEval(expr);
      const context = {
        PI: Math.PI,
        E: Math.E,
        factorial,
        sin: (v) => state.angleMode === 'deg' ? Math.sin(v * Math.PI/180) : Math.sin(v),
        cos: (v) => state.angleMode === 'deg' ? Math.cos(v * Math.PI/180) : Math.cos(v),
        tan: (v) => state.angleMode === 'deg' ? Math.tan(v * Math.PI/180) : Math.tan(v),
        sqrt: Math.sqrt,
        ln: Math.log,
        log: (v) => Math.log10 ? Math.log10(v) : Math.log(v)/Math.LN10,
        Math
      };
      const names = Object.keys(context).concat(['x']);
      const vals = Object.values(context);
      // function that accepts x as last argument
      const f = new Function(...names, `return (${s});`);
      for (let i=0;i<sampleCount;i++){
        const x = xs[i];
        let y = f(...vals, x);
        ys[i] = (Number.isFinite(y) ? y : NaN);
        if (Number.isFinite(y)) {
          ymin = Math.min(ymin, y);
          ymax = Math.max(ymax, y);
        }
      }
    } catch (err) {
      alert('Bad expression: ' + err.message);
      return;
    }

    if (!isFinite(ymin) || !isFinite(ymax)) {
      ymin = -10; ymax = 10;
    }
    // add margins
    const ypad = (ymax - ymin) * 0.1 || 1;
    ymin -= ypad; ymax += ypad;

    drawAxes(ctx, w, h, xmin, xmax, ymin, ymax);
    // draw graph
    ctx.strokeStyle = '#4fe';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let moved = false;
    for (let i=0;i<xs.length;i++){
      const x = xs[i], y = ys[i];
      const px = (x - xmin)/(xmax - xmin) * w;
      const py = (1 - (y - ymin)/(ymax - ymin)) * h;
      if (!Number.isFinite(y)) { moved = false; continue; }
      if (!moved) { ctx.moveTo(px, py); moved = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });

  clearPlot.addEventListener('click', () => {
    const ctx = graphCanvas.getContext('2d');
    ctx.clearRect(0,0,graphCanvas.width, graphCanvas.height);
  });

  // Responsive canvas sizing (pixel ratio)
  function resizeCanvasForHiDPI(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    canvas.height = Math.max(150, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }
  // when modal shown, adjust canvas
  const observer = new ResizeObserver(() => {
    if (!graphModal.classList.contains('hidden')) {
      const rect = graphCanvas.getBoundingClientRect();
      graphCanvas.width = Math.floor(rect.width);
      graphCanvas.height = Math.floor(rect.height);
    }
  });
  observer.observe(graphCanvas);

  // initial display
  setDisplay('');
})();
