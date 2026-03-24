/* ============================================================
   Newton-Raphson Load Flow Simulation
   Full Jacobian solver with interactive IEEE 5-bus network
   ============================================================ */
var NewtonRaphsonSim = (function () {
  'use strict';
  var C = PET.Complex;

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var nBus = 5;
    var busData, branchData, Ybus;
    var iterations = [];
    var maxIter = 50;
    var tolerance = 1e-6;
    var displayPolar = true;

    container.innerHTML = buildUI();

    var canvas = container.querySelector('#nr-network-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 340);
    var chartCanvas = container.querySelector('#nr-chart');
    var logDiv = container.querySelector('#nr-log');
    var chart = null;

    container.querySelector('#nr-solve').addEventListener('click', solve);
    container.querySelector('#nr-reset').addEventListener('click', reset);
    container.querySelector('#nr-display-toggle').addEventListener('click', function () {
      displayPolar = !displayPolar;
      this.textContent = displayPolar ? 'Polar' : 'Rectangular';
      drawNetwork();
    });

    reset();
    initChart();

    function initBusData() {
      busData = [
        { type: 'slack', Vmag: 1.06, Vang: 0, Pspec: 0, Qspec: 0, name: 'Slack' },
        { type: 'PQ', Vmag: 1.0, Vang: 0, Pspec: -0.4, Qspec: -0.2, name: 'PQ-2' },
        { type: 'PQ', Vmag: 1.0, Vang: 0, Pspec: -0.25, Qspec: -0.15, name: 'PQ-3' },
        { type: 'PV', Vmag: 1.04, Vang: 0, Pspec: 0.5, Qspec: 0, name: 'PV-4' },
        { type: 'PQ', Vmag: 1.0, Vang: 0, Pspec: -0.5, Qspec: -0.3, name: 'PQ-5' }
      ];
      branchData = [
        { from: 0, to: 1, z: new C(0.02, 0.06) },
        { from: 0, to: 2, z: new C(0.08, 0.24) },
        { from: 1, to: 2, z: new C(0.06, 0.18) },
        { from: 1, to: 3, z: new C(0.06, 0.18) },
        { from: 1, to: 4, z: new C(0.04, 0.12) },
        { from: 2, to: 3, z: new C(0.01, 0.03) },
        { from: 3, to: 4, z: new C(0.08, 0.24) }
      ];
      Ybus = PET.buildYBus(nBus, branchData);
    }

    function solve() {
      initBusData();
      readSliders();
      iterations = [];
      logDiv.innerHTML = '';

      var V = busData.map(function (b) { return b.Vmag; });
      var theta = busData.map(function (b) { return b.Vang; });

      var pqBuses = [], pvBuses = [];
      for (var i = 1; i < nBus; i++) {
        if (busData[i].type === 'PQ') { pqBuses.push(i); pvBuses.push(i); }
        else if (busData[i].type === 'PV') { pvBuses.push(i); }
      }

      for (var iter = 0; iter < maxIter; iter++) {
        // Compute P and Q injections
        var Pcalc = [], Qcalc = [];
        for (var i2 = 0; i2 < nBus; i2++) {
          var Pi = 0, Qi = 0;
          for (var k = 0; k < nBus; k++) {
            var Gik = Ybus[i2][k].re, Bik = Ybus[i2][k].im;
            var thetaIK = theta[i2] - theta[k];
            Pi += V[i2] * V[k] * (Gik * Math.cos(thetaIK) + Bik * Math.sin(thetaIK));
            Qi += V[i2] * V[k] * (Gik * Math.sin(thetaIK) - Bik * Math.cos(thetaIK));
          }
          Pcalc[i2] = Pi;
          Qcalc[i2] = Qi;
        }

        // Mismatch vector
        var dP = [], dQ = [];
        pvBuses.forEach(function (i) { dP.push(busData[i].Pspec - Pcalc[i]); });
        pqBuses.forEach(function (i) { dQ.push(busData[i].Qspec - Qcalc[i]); });

        var mismatch = dP.concat(dQ);
        var maxMis = 0;
        mismatch.forEach(function (m) { if (Math.abs(m) > maxMis) maxMis = Math.abs(m); });

        iterations.push({ iter: iter + 1, mismatch: maxMis, V: V.slice(), theta: theta.slice() });
        updateChart();

        logMsg('Iter ' + (iter + 1) + ': max|ΔS| = ' + maxMis.toExponential(3));

        if (maxMis < tolerance) {
          logMsg('✓ Converged in ' + (iter + 1) + ' iterations');
          break;
        }

        // Build Jacobian
        var nPV = pvBuses.length, nPQ = pqBuses.length;
        var dim = nPV + nPQ;
        var J = [];
        for (var r = 0; r < dim; r++) { J[r] = []; for (var c = 0; c < dim; c++) J[r][c] = 0; }

        // J1: dP/dθ
        for (var ri = 0; ri < nPV; ri++) {
          var i3 = pvBuses[ri];
          for (var ci = 0; ci < nPV; ci++) {
            var j = pvBuses[ci];
            if (i3 === j) {
              var sum = 0;
              for (var k2 = 0; k2 < nBus; k2++) {
                if (k2 !== i3) sum += V[i3] * V[k2] * (-Ybus[i3][k2].re * Math.sin(theta[i3] - theta[k2]) + Ybus[i3][k2].im * Math.cos(theta[i3] - theta[k2]));
              }
              J[ri][ci] = sum;
            } else {
              J[ri][ci] = V[i3] * V[j] * (Ybus[i3][j].re * Math.sin(theta[i3] - theta[j]) - Ybus[i3][j].im * Math.cos(theta[i3] - theta[j]));
            }
          }
        }

        // J2: dP/d|V| (only PQ buses)
        for (var ri2 = 0; ri2 < nPV; ri2++) {
          var i4 = pvBuses[ri2];
          for (var ci2 = 0; ci2 < nPQ; ci2++) {
            var j2 = pqBuses[ci2];
            if (i4 === j2) {
              var sum2 = 0;
              for (var k3 = 0; k3 < nBus; k3++) {
                if (k3 !== i4) sum2 += V[k3] * (Ybus[i4][k3].re * Math.cos(theta[i4] - theta[k3]) + Ybus[i4][k3].im * Math.sin(theta[i4] - theta[k3]));
              }
              J[ri2][nPV + ci2] = sum2 + 2 * V[i4] * Ybus[i4][i4].re;
            } else {
              J[ri2][nPV + ci2] = V[i4] * (Ybus[i4][j2].re * Math.cos(theta[i4] - theta[j2]) + Ybus[i4][j2].im * Math.sin(theta[i4] - theta[j2]));
            }
          }
        }

        // J3: dQ/dθ (only PQ buses)
        for (var ri3 = 0; ri3 < nPQ; ri3++) {
          var i5 = pqBuses[ri3];
          for (var ci3 = 0; ci3 < nPV; ci3++) {
            var j3 = pvBuses[ci3];
            if (i5 === j3) {
              var sum3 = 0;
              for (var k4 = 0; k4 < nBus; k4++) {
                if (k4 !== i5) sum3 += V[i5] * V[k4] * (Ybus[i5][k4].re * Math.cos(theta[i5] - theta[k4]) + Ybus[i5][k4].im * Math.sin(theta[i5] - theta[k4]));
              }
              J[nPV + ri3][ci3] = sum3;
            } else {
              J[nPV + ri3][ci3] = V[i5] * V[j3] * (-Ybus[i5][j3].re * Math.cos(theta[i5] - theta[j3]) - Ybus[i5][j3].im * Math.sin(theta[i5] - theta[j3]));
            }
          }
        }

        // J4: dQ/d|V| (PQ × PQ)
        for (var ri4 = 0; ri4 < nPQ; ri4++) {
          var i6 = pqBuses[ri4];
          for (var ci4 = 0; ci4 < nPQ; ci4++) {
            var j4 = pqBuses[ci4];
            if (i6 === j4) {
              var sum4 = 0;
              for (var k5 = 0; k5 < nBus; k5++) {
                if (k5 !== i6) sum4 += V[k5] * (Ybus[i6][k5].re * Math.sin(theta[i6] - theta[k5]) - Ybus[i6][k5].im * Math.cos(theta[i6] - theta[k5]));
              }
              J[nPV + ri4][nPV + ci4] = sum4 - 2 * V[i6] * Ybus[i6][i6].im;
            } else {
              J[nPV + ri4][nPV + ci4] = V[i6] * (Ybus[i6][j4].re * Math.sin(theta[i6] - theta[j4]) - Ybus[i6][j4].im * Math.cos(theta[i6] - theta[j4]));
            }
          }
        }

        // Solve J * [Δθ; Δ|V|] = [ΔP; ΔQ]
        var correction = PET.realSolve(J, mismatch);
        if (!correction) { logMsg('✗ Jacobian singular!'); break; }

        // Update
        for (var ui = 0; ui < nPV; ui++) theta[pvBuses[ui]] += correction[ui];
        for (var ui2 = 0; ui2 < nPQ; ui2++) V[pqBuses[ui2]] += correction[nPV + ui2];
      }

      // Update busData
      for (var fi = 0; fi < nBus; fi++) {
        busData[fi].Vmag = V[fi];
        busData[fi].Vang = theta[fi];
      }
      drawNetwork();
    }

    function reset() {
      initBusData();
      iterations = [];
      if (logDiv) logDiv.innerHTML = '';
      drawNetwork();
      if (chart) { chart.data.labels = []; chart.data.datasets[0].data = []; chart.update(); }
    }

    function readSliders() {
      for (var i = 1; i < nBus; i++) {
        var pEl = container.querySelector('#nr-p' + i);
        var qEl = container.querySelector('#nr-q' + i);
        if (pEl) busData[i].Pspec = parseFloat(pEl.value);
        if (qEl) busData[i].Qspec = parseFloat(qEl.value);
      }
    }

    function logMsg(msg) {
      var d = document.createElement('div');
      d.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:0.78rem;padding:0.1rem 0;color:var(--text-secondary);';
      d.textContent = msg;
      logDiv.appendChild(d);
      logDiv.scrollTop = logDiv.scrollHeight;
    }

    function initChart() {
      chart = new Chart(chartCanvas.getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'NR Max |ΔS|', data: [], borderColor: '#40c4ff', backgroundColor: 'rgba(64,196,255,0.1)', fill: true, tension: 0.3, pointRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            y: { type: 'logarithmic', title: { display: true, text: 'Max Mismatch', color: '#90a4ae' }, grid: { color: 'rgba(38,48,70,0.5)' }, ticks: { color: '#90a4ae' } },
            x: { title: { display: true, text: 'Iteration', color: '#90a4ae' }, grid: { color: 'rgba(38,48,70,0.5)' }, ticks: { color: '#90a4ae' } }
          },
          plugins: { legend: { labels: { color: '#eceff1' } } }
        }
      });
    }

    function updateChart() {
      chart.data.labels = iterations.map(function (it) { return it.iter; });
      chart.data.datasets[0].data = iterations.map(function (it) { return it.mismatch; });
      chart.update();
    }

    function drawNetwork() {
      var w = 560, h = 340;
      ctx.clearRect(0, 0, w, h);
      PET.drawGrid(ctx, w, h, 30);

      var pos = [
        { x: 80, y: 60 }, { x: 280, y: 50 }, { x: 480, y: 60 },
        { x: 400, y: 220 }, { x: 160, y: 240 }
      ];

      // Branches
      branchData.forEach(function (br) {
        var a = pos[br.from], b = pos[br.to];
        ctx.strokeStyle = 'rgba(64,196,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });

      // Buses
      pos.forEach(function (p, i) {
        var b = busData[i];
        var col = b.type === 'slack' ? '#ffca28' : b.type === 'PV' ? '#40c4ff' : '#00e676';

        // Glow
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, 2 * Math.PI); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0b0f1a';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, p.x, p.y);

        // Voltage
        ctx.fillStyle = '#eceff1';
        ctx.font = '11px JetBrains Mono';
        if (displayPolar) {
          ctx.fillText(b.Vmag.toFixed(4) + '∠' + (b.Vang * 180 / Math.PI).toFixed(2) + '°', p.x, p.y + 30);
        } else {
          var re = b.Vmag * Math.cos(b.Vang);
          var im = b.Vmag * Math.sin(b.Vang);
          var sign = im >= 0 ? '+' : '-';
          ctx.fillText(re.toFixed(4) + sign + 'j' + Math.abs(im).toFixed(4), p.x, p.y + 30);
        }

        ctx.font = '9px Inter';
        ctx.fillStyle = 'rgba(144,164,174,0.7)';
        ctx.fillText(b.name, p.x, p.y - 24);
      });
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="nr-network-canvas" width="560" height="340"></canvas></div>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:0.8rem;flex-wrap:wrap;">' +
        '<button class="btn btn-primary" id="nr-solve">Solve (N-R)</button>' +
        '<button class="btn" id="nr-reset">Reset</button>' +
        '<button class="btn" id="nr-display-toggle">Polar</button>' +
        '</div>' +
        '<div class="sim-params">' +
        '<div class="sim-param"><label>Bus 2 P (pu)</label><div class="param-row"><input type="range" id="nr-p1" min="-1.5" max="1" step="0.05" value="-0.4"><span class="value-display" id="nr-p1-val">-0.40</span></div></div>' +
        '<div class="sim-param"><label>Bus 2 Q (pu)</label><div class="param-row"><input type="range" id="nr-q1" min="-1" max="1" step="0.05" value="-0.2"><span class="value-display" id="nr-q1-val">-0.20</span></div></div>' +
        '<div class="sim-param"><label>Bus 3 P (pu)</label><div class="param-row"><input type="range" id="nr-p2" min="-1.5" max="1" step="0.05" value="-0.25"><span class="value-display" id="nr-p2-val">-0.25</span></div></div>' +
        '<div class="sim-param"><label>Bus 5 P (pu)</label><div class="param-row"><input type="range" id="nr-p4" min="-1.5" max="1" step="0.05" value="-0.5"><span class="value-display" id="nr-p4-val">-0.50</span></div></div>' +
        '<div class="sim-param"><label>Bus 5 Q (pu)</label><div class="param-row"><input type="range" id="nr-q4" min="-1" max="1" step="0.05" value="-0.3"><span class="value-display" id="nr-q4-val">-0.30</span></div></div>' +
        '<div class="sim-param"><label>Gen 4 P (pu)</label><div class="param-row"><input type="range" id="nr-p3" min="0" max="1.5" step="0.05" value="0.5"><span class="value-display" id="nr-p3-val">0.50</span></div></div>' +
        '</div>' +
        '<div style="display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:280px;height:220px;"><canvas id="nr-chart"></canvas></div>' +
        '<div id="nr-log" style="flex:1;min-width:250px;max-height:220px;overflow-y:auto;background:var(--bg-primary);border-radius:var(--radius-sm);padding:0.5rem;border:1px solid var(--border-color);"></div>' +
        '</div></div>';
    }

    // Bind slider value displays
    container.querySelectorAll('.sim-param input[type="range"]').forEach(function (sl) {
      var valSpan = container.querySelector('#' + sl.id + '-val');
      if (valSpan) {
        sl.addEventListener('input', function () { valSpan.textContent = parseFloat(sl.value).toFixed(2); });
      }
    });
  }

  return { create: create };
})();
