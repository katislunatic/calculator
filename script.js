(() => {
  const display = document.getElementById("display");
  const historyEl = document.getElementById("history");
  const buttons = [...document.querySelectorAll(".btn")];

  const clearBtn = document.getElementById("clear");
  const backBtn = document.getElementById("back");
  const equalsBtn = document.getElementById("equals");
  const degRadBtn = document.getElementById("degRadBtn");

  const ansBtn = document.getElementById("ansBtn");
  const piBtn = document.getElementById("piBtn");

  // Graph elements
  const graphBtn = document.getElementById("graphBtn");
  const graphModal = document.getElementById("graphModal");
  const closeGraph = document.getElementById("closeGraph");
  const plotBtn = document.getElementById("plotBtn");
  const clearPlot = document.getElementById("clearPlot");

  const graphExpr = document.getElementById("graphExpr");
  const xminInput = document.getElementById("xmin");
  const xmaxInput = document.getElementById("xmax");
  const graphCanvas = document.getElementById("graphCanvas");

  let state = {
    expr: "",
    ans: 0,
    angleMode: "deg",
  };

  function setDisplay(val) {
    display.textContent = val || "0";
  }

  function push(val) {
    state.expr += val;
    setDisplay(state.expr);
  }

  function factorial(n) {
    n = Number(n);
    if (n < 0) return NaN;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function safeEval(expr) {
    let s = expr
      .replace(/\^/g, "**")
      .replace(/(\d+)!/g, (m) => `factorial(${m.replace("!", "")})`)
      .replace(/π/g, "PI");

    const context = {
      PI: Math.PI,
      factorial,
      sin: (v) =>
        state.angleMode === "deg" ? Math.sin((v * Math.PI) / 180) : Math.sin(v),
      cos: (v) =>
        state.angleMode === "deg" ? Math.cos((v * Math.PI) / 180) : Math.cos(v),
      tan: (v) =>
        state.angleMode === "deg" ? Math.tan((v * Math.PI) / 180) : Math.tan(v),
      log: (v) => Math.log10(v),
      ln: (v) => Math.log(v),
      sqrt: Math.sqrt,
      Math,
    };

    const fn = new Function(
      ...Object.keys(context),
      `return (${s});`
    );

    return fn(...Object.values(context));
  }

  // Button presses
  buttons.forEach((btn) => {
    if (btn.dataset.value) {
      btn.onclick = () => push(btn.dataset.value);
    }
  });

  clearBtn.onclick = () => {
    state.expr = "";
    setDisplay("");
  };

  backBtn.onclick = () => {
    state.expr = state.expr.slice(0, -1);
    setDisplay(state.expr);
  };

  equalsBtn.onclick = () => {
    try {
      const res = safeEval(state.expr);
      state.ans = res;
      historyEl.textContent = state.expr + " =";
      state.expr = String(res);
      setDisplay(res);
    } catch {
      setDisplay("ERR");
      state.expr = "";
    }
  };

  degRadBtn.onclick = () => {
    state.angleMode = state.angleMode === "deg" ? "rad" : "deg";
    degRadBtn.textContent = state.angleMode.toUpperCase();
  };

  ansBtn.onclick = () => push(String(state.ans));
  piBtn.onclick = () => push("π");

  // Keyboard support
  window.onkeydown = (e) => {
    if ("0123456789+-*/().^".includes(e.key)) push(e.key);
    if (e.key === "Enter") equalsBtn.onclick();
    if (e.key === "Backspace") backBtn.onclick();
  };

  // Graph modal
  graphBtn.onclick = () => graphModal.classList.remove("hidden");
  closeGraph.onclick = () => graphModal.classList.add("hidden");

  clearPlot.onclick = () => {
    const ctx = graphCanvas.getContext("2d");
    ctx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
  };

  plotBtn.onclick = () => {
    const expr = graphExpr.value.trim();
    if (!expr) return;

    const xmin = Number(xminInput.value);
    const xmax = Number(xmaxInput.value);
    const ctx = graphCanvas.getContext("2d");
    const w = graphCanvas.width;
    const h = graphCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#4fe";
    ctx.lineWidth = 2;

    ctx.beginPath();
    let first = true;

    for (let px = 0; px < w; px++) {
      const x = xmin + (px / w) * (xmax - xmin);
      let y;
      try {
        const s = expr.replace(/x/g, `(${x})`);
        y = safeEval(s);
      } catch {
        continue;
      }
      if (!isFinite(y)) continue;

      const py = h / 2 - y * 20; // simple scale
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  };
})();
