/* ============================================================
   Salient-Pole Machine — Two-Reaction Theory Visualiser
   Shows Xd/Xq decomposition, reluctance torque, power curves
   ============================================================ */
var SalientPoleSim = (function () {
  'use strict';

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var Vt = 1.0, Ef = 1.5, Xd = 1.2, Xq = 0.8;

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#sp-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 420);
    var infoDiv = container.querySelector('#sp-info');

    var sliders = {
      Ef: container.querySelector('#sp-ef'),
      Xd: container.querySelector('#sp-xd'),
      Xq: container.querySelector('#sp-xq')
    };
    var displays = {
      Ef: container.querySelector('#sp-ef-val'),
      Xd: container.querySelector('#sp-xd-val'),
      Xq: container.querySelector('#sp-xq-val')
    };

    Object.keys(sliders).forEach(function (k) {
      sliders[k].addEventListener('input', function () {
        displays[k].textContent = parseFloat(this.value).toFixed(2);
        draw();
      });
    });

    draw();

    function Ptotal(dDeg) {
      var dRad = PET.degToRad(dDeg);
      var P1 = (Ef * Vt / Xd) * Math.sin(dRad);
      var P2 = Vt * Vt * ((1 / Xq) - (1 / Xd)) * Math.sin(2 * dRad) / 2;
      return P1 + P2;
    }
    function Pexc(dDeg) {
      return (Ef * Vt / Xd) * Math.sin(PET.degToRad(dDeg));
    }
    function Prel(dDeg) {
      var dRad = PET.degToRad(dDeg);
      return Vt * Vt * ((1 / Xq) - (1 / Xd)) * Math.sin(2 * dRad) / 2;
    }

    function draw() {
      Ef = parseFloat(sliders.Ef.value);
      Xd = parseFloat(sliders.Xd.value);
      Xq = parseFloat(sliders.Xq.value);

      var w = 560, h = 420;
      ctx.clearRect(0, 0, w, h);

      var ml = 60, mr = 30, mt = 20, mb = 50;
      var pw = w - ml - mr, ph = h - mt - mb;

      // Find max P for scaling
      var maxP = 0;
      for (var i = 0; i <= 180; i++) {
        maxP = Math.max(maxP, Math.abs(Ptotal(i)));
      }
      maxP = Math.max(maxP, 0.5) * 1.15;
      var yScale = ph / (2 * maxP);

      var zeroY = mt + ph / 2; // P=0 line

      // Axes
      ctx.strokeStyle = 'rgba(236,239,241,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ml, zeroY); ctx.lineTo(w - mr, zeroY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ml, mt); ctx.lineTo(ml, h - mb); ctx.stroke();

      ctx.fillStyle = '#607d8b'; ctx.font = '11px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('δ (degrees)', ml + pw / 2, h - 8);
      ctx.save(); ctx.translate(15, mt + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('P (pu)', 0, 0); ctx.restore();

      // Grid
      for (var g = 0; g <= 180; g += 30) {
        var gx = ml + (g / 180) * pw;
        ctx.strokeStyle = 'rgba(236,239,241,0.06)';
        ctx.beginPath(); ctx.moveTo(gx, mt); ctx.lineTo(gx, h - mb); ctx.stroke();
        ctx.fillStyle = '#607d8b'; ctx.font = '9px JetBrains Mono';
        ctx.fillText(g + '°', gx, h - mb + 15);
      }

      // Excitation torque curve (Pexc)
      ctx.strokeStyle = PET.colors.amber; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
      ctx.beginPath();
      for (var d = 0; d <= 180; d++) {
        var px = ml + (d / 180) * pw;
        var py = zeroY - Pexc(d) * yScale;
        if (d === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.setLineDash([]);

      // Reluctance torque curve (Prel)
      ctx.strokeStyle = '#e040fb'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (var d2 = 0; d2 <= 180; d2++) {
        var px2 = ml + (d2 / 180) * pw;
        var py2 = zeroY - Prel(d2) * yScale;
        if (d2 === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
      }
      ctx.stroke(); ctx.setLineDash([]);

      // Total P curve
      ctx.strokeStyle = PET.colors.green; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var d3 = 0; d3 <= 180; d3++) {
        var px3 = ml + (d3 / 180) * pw;
        var py3 = zeroY - Ptotal(d3) * yScale;
        if (d3 === 0) ctx.moveTo(px3, py3); else ctx.lineTo(px3, py3);
      }
      ctx.stroke();

      // Legend
      var lx = ml + pw - 160, ly = mt + 15;
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = PET.colors.green; ctx.fillText('— Total P', lx, ly);
      ctx.fillStyle = PET.colors.amber; ctx.fillText('--- Excitation', lx, ly + 15);
      ctx.fillStyle = '#e040fb'; ctx.fillText('--- Reluctance', lx, ly + 30);

      // Find Pmax
      var Pmax_total = 0, dMax = 0;
      for (var s = 0; s <= 180; s++) {
        var pv = Ptotal(s);
        if (pv > Pmax_total) { Pmax_total = pv; dMax = s; }
      }

      // Peak marker
      var pmx = ml + (dMax / 180) * pw;
      var pmy = zeroY - Pmax_total * yScale;
      ctx.fillStyle = PET.colors.green;
      ctx.beginPath(); ctx.arc(pmx, pmy, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#eceff1'; ctx.font = '10px JetBrains Mono';
      ctx.fillText('Pmax=' + Pmax_total.toFixed(3), pmx + 8, pmy - 8);

      // Saliency ratio
      var saliency = Xd / Xq;
      var relFrac = Math.abs(Prel(45)) / Math.max(Pmax_total, 0.001) * 100;

      infoDiv.innerHTML =
        '<strong>Salient-Pole Power Characteristics</strong><br>' +
        '<span style="color:#00e676;">P_max = ' + Pmax_total.toFixed(3) + ' pu at δ = ' + dMax + '°</span><br>' +
        'Saliency ratio Xd/Xq = ' + saliency.toFixed(2) +
        ' &nbsp; Reluctance torque contribution ≈ ' + relFrac.toFixed(1) + '%<br>' +
        '<span style="color:#ffca28;">P_exc_peak = ' + (Ef * Vt / Xd).toFixed(3) + ' pu</span> &nbsp; ' +
        '<span style="color:#e040fb;">P_rel_peak = ' + (Vt * Vt * (1 / Xq - 1 / Xd) / 2).toFixed(3) + ' pu</span>';
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="sp-canvas" width="560" height="420"></canvas></div>' +
        '<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:0.8rem;">' +
        '<div class="sim-param"><label>Ef (pu)</label><div class="param-row"><input type="range" id="sp-ef" min="0.5" max="2.5" step="0.05" value="1.50"><span class="value-display" id="sp-ef-val">1.50</span></div></div>' +
        '<div class="sim-param"><label>Xd (pu)</label><div class="param-row"><input type="range" id="sp-xd" min="0.5" max="2.5" step="0.05" value="1.20"><span class="value-display" id="sp-xd-val">1.20</span></div></div>' +
        '<div class="sim-param"><label>Xq (pu)</label><div class="param-row"><input type="range" id="sp-xq" min="0.3" max="2.0" step="0.05" value="0.80"><span class="value-display" id="sp-xq-val">0.80</span></div></div>' +
        '</div>' +
        '<div id="sp-info" style="font-family:JetBrains Mono,monospace;font-size:0.85rem;min-height:3rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
