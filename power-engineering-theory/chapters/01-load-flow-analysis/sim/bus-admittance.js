/* ============================================================
   Y-Bus Builder & P-V Nose Curve Explorer
   Interactive admittance matrix visualiser + voltage collapse
   ============================================================ */

/* ---------- Y-Bus Builder ---------- */
var YBusBuilderSim = (function () {
  'use strict';
  var C = PET.Complex;

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var buses = [
      { x: 100, y: 80, name: '1' },
      { x: 300, y: 60, name: '2' },
      { x: 200, y: 220, name: '3' }
    ];
    var branches = [
      { from: 0, to: 1, r: 0.02, x: 0.06 },
      { from: 0, to: 2, r: 0.04, x: 0.12 },
      { from: 1, to: 2, r: 0.03, x: 0.09 }
    ];
    var selectedBus = -1;
    var dragging = false;

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#ybus-canvas');
    var ctx = PET.setupCanvas(canvas, 460, 300);
    var matDiv = container.querySelector('#ybus-matrix');

    container.querySelector('#ybus-add-bus').addEventListener('click', addBus);
    container.querySelector('#ybus-reset').addEventListener('click', resetAll);
    container.querySelector('#ybus-add-branch').addEventListener('click', addBranch);

    // Drag buses
    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      selectedBus = -1;
      for (var i = 0; i < buses.length; i++) {
        var dx = mx - buses[i].x, dy = my - buses[i].y;
        if (dx * dx + dy * dy < 400) { selectedBus = i; dragging = true; break; }
      }
    });
    canvas.addEventListener('mousemove', function (e) {
      if (!dragging || selectedBus < 0) return;
      var rect = canvas.getBoundingClientRect();
      buses[selectedBus].x = PET.clamp(e.clientX - rect.left, 20, 440);
      buses[selectedBus].y = PET.clamp(e.clientY - rect.top, 20, 280);
      draw();
    });
    canvas.addEventListener('mouseup', function () { dragging = false; });

    // Touch support
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var t = e.touches[0];
      var mx = t.clientX - rect.left, my = t.clientY - rect.top;
      selectedBus = -1;
      for (var i = 0; i < buses.length; i++) {
        var dx = mx - buses[i].x, dy = my - buses[i].y;
        if (dx * dx + dy * dy < 600) { selectedBus = i; dragging = true; break; }
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (!dragging || selectedBus < 0) return;
      var rect = canvas.getBoundingClientRect();
      var t = e.touches[0];
      buses[selectedBus].x = PET.clamp(t.clientX - rect.left, 20, 440);
      buses[selectedBus].y = PET.clamp(t.clientY - rect.top, 20, 280);
      draw();
    }, { passive: false });
    canvas.addEventListener('touchend', function () { dragging = false; });

    draw();

    function addBus() {
      buses.push({ x: 100 + Math.random() * 260, y: 60 + Math.random() * 180, name: '' + (buses.length + 1) });
      draw();
    }

    function addBranch() {
      var fromEl = container.querySelector('#ybus-br-from');
      var toEl = container.querySelector('#ybus-br-to');
      var rEl = container.querySelector('#ybus-br-r');
      var xEl = container.querySelector('#ybus-br-x');
      var f = parseInt(fromEl.value) - 1, t = parseInt(toEl.value) - 1;
      var r = parseFloat(rEl.value), xv = parseFloat(xEl.value);
      if (f < 0 || t < 0 || f >= buses.length || t >= buses.length || f === t) return;
      if (isNaN(r) || isNaN(xv) || (r === 0 && xv === 0)) return;
      // Check for existing branch
      for (var i = 0; i < branches.length; i++) {
        if ((branches[i].from === f && branches[i].to === t) || (branches[i].from === t && branches[i].to === f)) {
          branches[i].r = r; branches[i].x = xv; draw(); return;
        }
      }
      branches.push({ from: f, to: t, r: r, x: xv });
      draw();
    }

    function resetAll() {
      buses = [
        { x: 100, y: 80, name: '1' },
        { x: 300, y: 60, name: '2' },
        { x: 200, y: 220, name: '3' }
      ];
      branches = [
        { from: 0, to: 1, r: 0.02, x: 0.06 },
        { from: 0, to: 2, r: 0.04, x: 0.12 },
        { from: 1, to: 2, r: 0.03, x: 0.09 }
      ];
      draw();
    }

    function computeYBus() {
      var n = buses.length;
      var brComplex = branches.map(function (br) {
        return { from: br.from, to: br.to, z: new C(br.r, br.x) };
      });
      return PET.buildYBus(n, brComplex);
    }

    function draw() {
      var w = 460, h = 300;
      ctx.clearRect(0, 0, w, h);
      PET.drawGrid(ctx, w, h, 25, 'rgba(38,48,70,0.3)');

      // Branches
      branches.forEach(function (br) {
        var a = buses[br.from], b = buses[br.to];
        ctx.strokeStyle = 'rgba(0,230,118,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.font = '10px JetBrains Mono';
        ctx.fillStyle = '#90a4ae';
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.fillText(br.r.toFixed(3) + '+j' + br.x.toFixed(3), mx + 4, my - 4);
      });

      // Buses
      buses.forEach(function (b, i) {
        ctx.fillStyle = i === 0 ? '#ffca28' : '#00e676';
        ctx.beginPath(); ctx.arc(b.x, b.y, 14, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#0b0f1a';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.name, b.x, b.y);
      });

      // Update matrix display
      var Y = computeYBus();
      renderMatrix(Y);
    }

    function renderMatrix(Y) {
      var n = Y.length;
      var html = '<table style="font-family:JetBrains Mono,monospace;font-size:0.75rem;border-collapse:collapse;">';
      html += '<tr><th style="padding:4px 8px;color:var(--text-muted);"></th>';
      for (var j = 0; j < n; j++) html += '<th style="padding:4px 8px;color:var(--accent-blue);">Bus ' + (j + 1) + '</th>';
      html += '</tr>';
      for (var i = 0; i < n; i++) {
        html += '<tr><td style="padding:4px 8px;color:var(--accent-blue);font-weight:600;">Bus ' + (i + 1) + '</td>';
        for (var j2 = 0; j2 < n; j2++) {
          var val = Y[i][j2];
          var isDiag = i === j2;
          var color = isDiag ? '#00e676' : (val.mag() > 0.001 ? '#40c4ff' : 'var(--text-muted)');
          var bgIntensity = Math.min(val.mag() / 40, 0.3);
          var bg = isDiag ? 'rgba(0,230,118,' + bgIntensity + ')' : 'rgba(64,196,255,' + bgIntensity + ')';
          html += '<td style="padding:4px 6px;color:' + color + ';background:' + bg + ';text-align:center;border:1px solid var(--border-color);">';
          html += val.re.toFixed(2) + (val.im >= 0 ? '+' : '') + 'j' + val.im.toFixed(2);
          html += '</td>';
        }
        html += '</tr>';
      }
      html += '</table>';
      matDiv.innerHTML = html;
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div style="display:flex;gap:1rem;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:300px;"><div class="sim-canvas-wrap"><canvas id="ybus-canvas" width="460" height="300"></canvas></div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">' +
        '<button class="btn" id="ybus-add-bus">+ Add Bus</button>' +
        '<button class="btn" id="ybus-reset">Reset</button>' +
        '</div>' +
        '<div style="display:flex;gap:0.3rem;align-items:center;margin-top:0.5rem;flex-wrap:wrap;">' +
        '<label style="font-size:0.8rem;color:var(--text-secondary);">Branch:</label>' +
        '<input id="ybus-br-from" type="number" min="1" max="10" value="1" style="width:40px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:4px;padding:2px 4px;font-size:0.8rem;">' +
        '<span style="color:var(--text-muted);">→</span>' +
        '<input id="ybus-br-to" type="number" min="1" max="10" value="2" style="width:40px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:4px;padding:2px 4px;font-size:0.8rem;">' +
        '<label style="font-size:0.8rem;color:var(--text-secondary);margin-left:0.3rem;">R:</label>' +
        '<input id="ybus-br-r" type="number" step="0.01" value="0.05" style="width:55px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:4px;padding:2px 4px;font-size:0.8rem;">' +
        '<label style="font-size:0.8rem;color:var(--text-secondary);">X:</label>' +
        '<input id="ybus-br-x" type="number" step="0.01" value="0.15" style="width:55px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:4px;padding:2px 4px;font-size:0.8rem;">' +
        '<button class="btn btn-sm" id="ybus-add-branch">Add</button>' +
        '</div></div>' +
        '<div style="flex:1;min-width:300px;overflow-x:auto;" id="ybus-matrix"></div>' +
        '</div></div>';
    }
  }

  return { create: create };
})();


/* ---------- P-V Nose Curve Explorer ---------- */
var PVCurveSim = (function () {
  'use strict';
  var C = PET.Complex;

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = buildUI();
    var chartCanvas = container.querySelector('#pv-chart');
    var infoDiv = container.querySelector('#pv-info');
    var qcompSlider = container.querySelector('#pv-qcomp');
    var xSlider = container.querySelector('#pv-xline');
    var chart = null;
    var animId = null;
    var animRunning = false;
    var animProgress = 0;

    qcompSlider.addEventListener('input', function () {
      container.querySelector('#pv-qcomp-val').textContent = parseFloat(this.value).toFixed(2);
      computeCurve();
    });
    xSlider.addEventListener('input', function () {
      container.querySelector('#pv-xline-val').textContent = parseFloat(this.value).toFixed(2);
      computeCurve();
    });

    container.querySelector('#pv-animate').addEventListener('click', toggleAnim);
    container.querySelector('#pv-reset').addEventListener('click', function () {
      animRunning = false; animProgress = 0;
      if (animId) cancelAnimationFrame(animId);
      computeCurve();
    });

    initChart();
    computeCurve();

    function computeCurve() {
      var Vs = 1.0; // Sending end voltage
      var X = parseFloat(xSlider.value);
      var Qcomp = parseFloat(qcompSlider.value);

      var points = [];
      var maxP = 0, maxPv = 0, collapsed = false;

      for (var Pload = 0; Pload <= 3; Pload += 0.01) {
        var Qload = Pload * 0.5 - Qcomp; // pf = 0.894 lagging, minus compensation
        // V^4 + (2*X*Q - Vs^2)*V^2 + X^2*(P^2+Q^2) = 0
        var a = 1;
        var b = 2 * X * Qload - Vs * Vs;
        var c = X * X * (Pload * Pload + Qload * Qload);
        var disc = b * b - 4 * a * c;

        if (disc < 0) { collapsed = true; break; }

        var V2_high = (-b + Math.sqrt(disc)) / 2;
        var V2_low = (-b - Math.sqrt(disc)) / 2;

        if (V2_high < 0) { collapsed = true; break; }
        var Vhigh = Math.sqrt(V2_high);
        var Vlow = V2_low > 0 ? Math.sqrt(V2_low) : 0;

        points.push({ P: Pload, Vh: Vhigh, Vl: Vlow });

        if (Pload > maxP) { maxP = Pload; maxPv = Vhigh; }
      }

      // Find nose point
      var noseP = maxP, noseV = maxPv;
      if (points.length > 0) {
        var last = points[points.length - 1];
        noseP = last.P;
        noseV = last.Vh;
      }

      // Update chart
      var upperData = points.map(function (p) { return { x: p.P, y: p.Vh }; });
      var lowerData = points.filter(function (p) { return p.Vl > 0; }).map(function (p) { return { x: p.P, y: p.Vl }; });

      chart.data.datasets[0].data = upperData;
      chart.data.datasets[1].data = lowerData;

      // Operating point animation
      if (animRunning && animProgress < points.length) {
        var op = points[Math.floor(animProgress)];
        chart.data.datasets[2].data = [{ x: op.P, y: op.Vh }];
      } else {
        chart.data.datasets[2].data = [];
      }

      // Nose point
      chart.data.datasets[3].data = [{ x: noseP, y: noseV }];

      chart.update();

      infoDiv.innerHTML = '<span style="color:var(--accent-green);">Max Loadability: ' + noseP.toFixed(3) + ' pu</span> &nbsp; ' +
        '<span style="color:var(--accent-amber);">Critical Voltage: ' + noseV.toFixed(4) + ' pu</span>';
    }

    function toggleAnim() {
      if (animRunning) {
        animRunning = false;
        if (animId) cancelAnimationFrame(animId);
        return;
      }
      animRunning = true;
      animProgress = 0;
      function step() {
        if (!animRunning) return;
        animProgress += 0.5;
        computeCurve();
        var Vs = 1.0, X = parseFloat(xSlider.value), Qcomp = parseFloat(qcompSlider.value);
        var maxPts = Math.floor(3 / 0.01);
        if (animProgress >= maxPts - 1) { animRunning = false; return; }
        animId = requestAnimationFrame(step);
      }
      animId = requestAnimationFrame(step);
    }

    function initChart() {
      chart = new Chart(chartCanvas.getContext('2d'), {
        type: 'scatter',
        data: {
          datasets: [
            { label: 'Upper (stable)', data: [], showLine: true, borderColor: '#00e676', backgroundColor: 'rgba(0,230,118,0.05)', fill: false, pointRadius: 0, borderWidth: 2 },
            { label: 'Lower (unstable)', data: [], showLine: true, borderColor: '#ff5252', backgroundColor: 'rgba(255,82,82,0.05)', borderDash: [5, 3], fill: false, pointRadius: 0, borderWidth: 1.5 },
            { label: 'Operating Point', data: [], pointRadius: 8, pointBackgroundColor: '#ffca28', pointBorderColor: '#ffca28', showLine: false },
            { label: 'Nose Point', data: [], pointRadius: 8, pointStyle: 'triangle', pointBackgroundColor: '#ff5252', pointBorderColor: '#ff5252', showLine: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Load P (pu)', color: '#90a4ae' }, min: 0, max: 3, grid: { color: 'rgba(38,48,70,0.5)' }, ticks: { color: '#90a4ae' } },
            y: { title: { display: true, text: '|V| (pu)', color: '#90a4ae' }, min: 0, max: 1.2, grid: { color: 'rgba(38,48,70,0.5)' }, ticks: { color: '#90a4ae' } }
          },
          plugins: { legend: { labels: { color: '#eceff1' } } }
        }
      });
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div style="height:300px;margin-bottom:0.8rem;"><canvas id="pv-chart"></canvas></div>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:0.8rem;">' +
        '<button class="btn btn-primary" id="pv-animate">▶ Animate</button>' +
        '<button class="btn" id="pv-reset">Reset</button>' +
        '</div>' +
        '<div class="sim-params">' +
        '<div class="sim-param"><label>Reactive Compensation Qc (pu)</label><div class="param-row"><input type="range" id="pv-qcomp" min="0" max="1" step="0.05" value="0"><span class="value-display" id="pv-qcomp-val">0.00</span></div></div>' +
        '<div class="sim-param"><label>Line Reactance X (pu)</label><div class="param-row"><input type="range" id="pv-xline" min="0.1" max="1" step="0.05" value="0.4"><span class="value-display" id="pv-xline-val">0.40</span></div></div>' +
        '</div>' +
        '<div id="pv-info" style="margin-top:0.8rem;font-family:JetBrains Mono,monospace;font-size:0.85rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
