/* ============================================================
   Gauss-Seidel Load Flow Simulation
   Interactive solver with step-by-step iteration display
   ============================================================ */
var GaussSeidelSim = (function () {
  'use strict';
  var C = PET.Complex;

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var nBus = 5;
    var busData = getDefaultBusData();
    var branchData = getDefaultBranches();
    var Ybus = null;
    var iterations = [];
    var maxIter = 100;
    var tolerance = 1e-6;
    var accelFactor = 1.6;
    var running = false;
    var currentIter = 0;

    // Build UI
    container.innerHTML = buildUI();
    var canvas = container.querySelector('#gs-network-canvas');
    var ctx = PET.setupCanvas(canvas, 500, 320);
    var logDiv = container.querySelector('#gs-log');
    var chartCanvas = container.querySelector('#gs-chart');
    var chart = null;

    // Bind controls
    container.querySelector('#gs-solve').addEventListener('click', solve);
    container.querySelector('#gs-reset').addEventListener('click', reset);
    container.querySelector('#gs-step').addEventListener('click', stepOnce);
    container.querySelector('#gs-accel').addEventListener('input', function () {
      accelFactor = parseFloat(this.value);
      container.querySelector('#gs-accel-val').textContent = accelFactor.toFixed(2);
    });

    bindSliders();
    buildYbus();
    drawNetwork();
    initChart();

    function getDefaultBusData() {
      return [
        { type: 'slack', V: new C(1.06, 0), P: 0, Q: 0, Pspec: 0, Qspec: 0, name: 'Slack' },
        { type: 'PQ', V: new C(1, 0), P: 0, Q: 0, Pspec: -0.4, Qspec: -0.2, name: 'Load A' },
        { type: 'PQ', V: new C(1, 0), P: 0, Q: 0, Pspec: -0.25, Qspec: -0.15, name: 'Load B' },
        { type: 'PV', V: new C(1.04, 0), P: 0, Q: 0, Pspec: 0.5, Qspec: 0, Vmag: 1.04, name: 'Gen 2' },
        { type: 'PQ', V: new C(1, 0), P: 0, Q: 0, Pspec: -0.5, Qspec: -0.3, name: 'Load C' }
      ];
    }

    function getDefaultBranches() {
      return [
        { from: 0, to: 1, z: new C(0.02, 0.06) },
        { from: 0, to: 2, z: new C(0.08, 0.24) },
        { from: 1, to: 2, z: new C(0.06, 0.18) },
        { from: 1, to: 3, z: new C(0.06, 0.18) },
        { from: 1, to: 4, z: new C(0.04, 0.12) },
        { from: 2, to: 3, z: new C(0.01, 0.03) },
        { from: 3, to: 4, z: new C(0.08, 0.24) }
      ];
    }

    function buildYbus() {
      Ybus = PET.buildYBus(nBus, branchData);
    }

    function solve() {
      reset();
      running = true;
      var V = busData.map(function (b) { return new C(b.V.re, b.V.im); });

      for (var iter = 0; iter < maxIter; iter++) {
        var Vprev = V.map(function (v) { return new C(v.re, v.im); });

        for (var i = 1; i < nBus; i++) { // skip slack
          if (busData[i].type === 'PQ' || busData[i].type === 'PV') {
            var Pi = busData[i].Pspec;
            var Qi = busData[i].type === 'PQ' ? busData[i].Qspec : calcQi(V, i);

            var sumYV = new C(0, 0);
            for (var k = 0; k < nBus; k++) {
              if (k !== i) sumYV = sumYV.add(Ybus[i][k].mul(V[k]));
            }

            var Sstar = new C(Pi, -Qi);
            var Vconj = V[i].conj();
            var Vinew = Sstar.div(Vconj).sub(sumYV).div(Ybus[i][i]);

            // Apply acceleration factor
            var dV = Vinew.sub(V[i]);
            Vinew = V[i].add(dV.scale(accelFactor));

            if (busData[i].type === 'PV') {
              // Maintain voltage magnitude
              var mag = busData[i].Vmag;
              var ang = Vinew.angle();
              Vinew = C.fromPolar(mag, ang * 180 / Math.PI);
            }

            V[i] = Vinew;
          }
        }

        // Compute mismatch
        var maxMismatch = 0;
        for (var i2 = 1; i2 < nBus; i2++) {
          var dV2 = V[i2].sub(Vprev[i2]).mag();
          if (dV2 > maxMismatch) maxMismatch = dV2;
        }

        iterations.push({
          iter: iter + 1,
          mismatch: maxMismatch,
          voltages: V.map(function (v) { return new C(v.re, v.im); })
        });

        updateChart();

        if (maxMismatch < tolerance) {
          logMessage('Converged in ' + (iter + 1) + ' iterations (mismatch = ' + maxMismatch.toExponential(3) + ')');
          break;
        }
      }

      if (iterations.length > 0) {
        var final = iterations[iterations.length - 1].voltages;
        for (var i3 = 0; i3 < nBus; i3++) busData[i3].V = final[i3];
      }

      drawNetwork();
      running = false;
      currentIter = iterations.length;
    }

    function stepOnce() {
      if (currentIter === 0) {
        busData = getDefaultBusData();
        buildYbus();
        iterations = [];
      }

      var V = currentIter > 0 ? iterations[currentIter - 1].voltages.map(function (v) { return new C(v.re, v.im); })
        : busData.map(function (b) { return new C(b.V.re, b.V.im); });

      var Vprev = V.map(function (v) { return new C(v.re, v.im); });

      for (var i = 1; i < nBus; i++) {
        if (busData[i].type === 'PQ' || busData[i].type === 'PV') {
          var Pi = busData[i].Pspec;
          var Qi = busData[i].type === 'PQ' ? busData[i].Qspec : calcQi(V, i);

          var sumYV = new C(0, 0);
          for (var k = 0; k < nBus; k++) {
            if (k !== i) sumYV = sumYV.add(Ybus[i][k].mul(V[k]));
          }

          var Sstar = new C(Pi, -Qi);
          var Vconj = V[i].conj();
          var Vinew = Sstar.div(Vconj).sub(sumYV).div(Ybus[i][i]);

          var dV = Vinew.sub(V[i]);
          Vinew = V[i].add(dV.scale(accelFactor));

          if (busData[i].type === 'PV') {
            var mag = busData[i].Vmag;
            var ang = Vinew.angle();
            Vinew = C.fromPolar(mag, ang * 180 / Math.PI);
          }
          V[i] = Vinew;
        }
      }

      var maxMismatch = 0;
      for (var i2 = 1; i2 < nBus; i2++) {
        var dV2 = V[i2].sub(Vprev[i2]).mag();
        if (dV2 > maxMismatch) maxMismatch = dV2;
      }

      currentIter++;
      iterations.push({ iter: currentIter, mismatch: maxMismatch, voltages: V });

      for (var i3 = 0; i3 < nBus; i3++) busData[i3].V = V[i3];

      logMessage('Iteration ' + currentIter + ': max ΔV = ' + maxMismatch.toExponential(3));
      updateChart();
      drawNetwork();
    }

    function calcQi(V, i) {
      var Qi = 0;
      for (var k = 0; k < nBus; k++) {
        var ViVk = V[i].mul(V[k].conj());
        var Yik = Ybus[i][k];
        Qi -= V[i].mag() * V[k].mag() * (Yik.re * Math.sin(V[i].angle() - V[k].angle()) - Yik.im * Math.cos(V[i].angle() - V[k].angle()));
      }
      return Qi;
    }

    function reset() {
      busData = getDefaultBusData();
      buildYbus();
      iterations = [];
      currentIter = 0;
      logDiv.innerHTML = '';
      drawNetwork();
      if (chart) { chart.data.labels = []; chart.data.datasets[0].data = []; chart.update(); }
    }

    function logMessage(msg) {
      var p = document.createElement('div');
      p.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:0.78rem;padding:0.15rem 0;color:var(--text-secondary);';
      p.textContent = msg;
      logDiv.appendChild(p);
      logDiv.scrollTop = logDiv.scrollHeight;
    }

    function initChart() {
      chart = new Chart(chartCanvas.getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Max |ΔV|', data: [], borderColor: '#00e676', backgroundColor: 'rgba(0,230,118,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { type: 'logarithmic', title: { display: true, text: 'Mismatch', color: '#90a4ae' }, grid: { color: 'rgba(38,48,70,0.5)' }, ticks: { color: '#90a4ae' } }, x: { title: { display: true, text: 'Iteration', color: '#90a4ae' }, grid: { color: 'rgba(38,48,70,0.5)' }, ticks: { color: '#90a4ae' } } },
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
      var w = 500, h = 320;
      ctx.clearRect(0, 0, w, h);
      PET.drawGrid(ctx, w, h, 30);

      var positions = [
        { x: 80, y: 60 }, { x: 250, y: 50 }, { x: 420, y: 60 },
        { x: 350, y: 200 }, { x: 150, y: 220 }
      ];

      // Draw branches
      branchData.forEach(function (br) {
        var p1 = positions[br.from], p2 = positions[br.to];
        ctx.strokeStyle = 'rgba(0,230,118,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

        // Impedance label
        ctx.font = '10px JetBrains Mono';
        ctx.fillStyle = 'rgba(144,164,174,0.6)';
        var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        ctx.fillText('z=' + br.z.re.toFixed(2) + '+j' + br.z.im.toFixed(2), mx - 30, my - 5);
      });

      // Draw buses
      positions.forEach(function (pos, i) {
        var bus = busData[i];
        var color = bus.type === 'slack' ? '#ffca28' : bus.type === 'PV' ? '#40c4ff' : '#00e676';

        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 14, 0, 2 * Math.PI); ctx.fill();

        ctx.fillStyle = '#0b0f1a';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, pos.x, pos.y);

        // Voltage label
        ctx.fillStyle = '#eceff1';
        ctx.font = '11px JetBrains Mono';
        ctx.textAlign = 'center';
        var vMag = bus.V.mag().toFixed(4);
        var vAng = bus.V.angleDeg().toFixed(2);
        ctx.fillText(vMag + '∠' + vAng + '°', pos.x, pos.y + 28);

        // Type label
        ctx.fillStyle = 'rgba(144,164,174,0.7)';
        ctx.font = '9px Inter';
        ctx.fillText(bus.name + ' (' + bus.type + ')', pos.x, pos.y - 22);
      });
    }

    function bindSliders() {
      for (var i = 1; i < nBus; i++) {
        (function (idx) {
          var pSlider = container.querySelector('#gs-p' + idx);
          var qSlider = container.querySelector('#gs-q' + idx);
          if (pSlider) {
            pSlider.addEventListener('input', function () {
              busData[idx].Pspec = parseFloat(this.value);
              container.querySelector('#gs-p' + idx + '-val').textContent = this.value;
            });
          }
          if (qSlider) {
            qSlider.addEventListener('input', function () {
              busData[idx].Qspec = parseFloat(this.value);
              container.querySelector('#gs-q' + idx + '-val').textContent = this.value;
            });
          }
        })(i);
      }
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="gs-network-canvas" width="500" height="320"></canvas></div>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:0.8rem;flex-wrap:wrap;">' +
        '<button class="btn btn-primary" id="gs-solve">Solve All</button>' +
        '<button class="btn" id="gs-step">Step Once</button>' +
        '<button class="btn" id="gs-reset">Reset</button>' +
        '</div>' +
        '<div class="sim-params">' +
        '<div class="sim-param"><label>Bus 2 P (pu)</label><div class="param-row"><input type="range" id="gs-p1" min="-1" max="1" step="0.05" value="-0.4"><span class="value-display" id="gs-p1-val">-0.40</span></div></div>' +
        '<div class="sim-param"><label>Bus 2 Q (pu)</label><div class="param-row"><input type="range" id="gs-q1" min="-1" max="1" step="0.05" value="-0.2"><span class="value-display" id="gs-q1-val">-0.20</span></div></div>' +
        '<div class="sim-param"><label>Bus 3 P (pu)</label><div class="param-row"><input type="range" id="gs-p2" min="-1" max="1" step="0.05" value="-0.25"><span class="value-display" id="gs-p2-val">-0.25</span></div></div>' +
        '<div class="sim-param"><label>Bus 3 Q (pu)</label><div class="param-row"><input type="range" id="gs-q2" min="-1" max="1" step="0.05" value="-0.15"><span class="value-display" id="gs-q2-val">-0.15</span></div></div>' +
        '<div class="sim-param"><label>Bus 5 P (pu)</label><div class="param-row"><input type="range" id="gs-p4" min="-1" max="1" step="0.05" value="-0.5"><span class="value-display" id="gs-p4-val">-0.50</span></div></div>' +
        '<div class="sim-param"><label>Bus 5 Q (pu)</label><div class="param-row"><input type="range" id="gs-q4" min="-1" max="1" step="0.05" value="-0.3"><span class="value-display" id="gs-q4-val">-0.30</span></div></div>' +
        '<div class="sim-param"><label>Accel Factor ω</label><div class="param-row"><input type="range" id="gs-accel" min="1" max="2" step="0.05" value="1.6"><span class="value-display" id="gs-accel-val">1.60</span></div></div>' +
        '</div>' +
        '<div style="display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:250px;"><div style="height:200px;"><canvas id="gs-chart"></canvas></div></div>' +
        '<div id="gs-log" style="flex:1;min-width:250px;max-height:200px;overflow-y:auto;background:var(--bg-primary);border-radius:var(--radius-sm);padding:0.5rem;border:1px solid var(--border-color);"></div>' +
        '</div>' +
        '</div>';
    }
  }

  return { create: create };
})();
