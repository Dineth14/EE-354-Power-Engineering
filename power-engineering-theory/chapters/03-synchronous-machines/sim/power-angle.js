/* ============================================================
   Power-Angle Curve Simulator
   P = (Ef*Vt/Xs)*sin(δ) with stability regions and equal-area
   ============================================================ */
var PowerAngleSim = (function () {
  'use strict';

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var Ef = 1.5, Vt = 1.0, Xs = 1.2;
    var Pm = 0.6; // mechanical power (pu)
    var showEAC = false;
    var faultClearAngle = 50; // deg

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#pa-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 380);
    var infoDiv = container.querySelector('#pa-info');

    var sliders = {
      Ef: container.querySelector('#pa-ef'),
      Vt: container.querySelector('#pa-vt'),
      Xs: container.querySelector('#pa-xs'),
      Pm: container.querySelector('#pa-pm'),
      fca: container.querySelector('#pa-fca')
    };
    var displays = {
      Ef: container.querySelector('#pa-ef-val'),
      Vt: container.querySelector('#pa-vt-val'),
      Xs: container.querySelector('#pa-xs-val'),
      Pm: container.querySelector('#pa-pm-val'),
      fca: container.querySelector('#pa-fca-val')
    };

    Object.keys(sliders).forEach(function (k) {
      sliders[k].addEventListener('input', function () {
        displays[k].textContent = parseFloat(this.value).toFixed(k === 'fca' ? 0 : 2);
        update();
      });
    });

    container.querySelector('#pa-eac-toggle').addEventListener('change', function () {
      showEAC = this.checked;
      update();
    });

    update();

    function update() {
      Ef = parseFloat(sliders.Ef.value);
      Vt = parseFloat(sliders.Vt.value);
      Xs = parseFloat(sliders.Xs.value);
      Pm = parseFloat(sliders.Pm.value);
      faultClearAngle = parseFloat(sliders.fca.value);
      draw();
    }

    function Pcurve(dDeg) {
      return (Ef * Vt / Xs) * Math.sin(PET.degToRad(dDeg));
    }

    function draw() {
      var w = 560, h = 380;
      ctx.clearRect(0, 0, w, h);

      var ml = 60, mr = 30, mt = 20, mb = 50;
      var pw = w - ml - mr, ph = h - mt - mb;
      var Pmax = Ef * Vt / Xs;

      // Axes
      ctx.strokeStyle = 'rgba(236,239,241,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ml, mt); ctx.lineTo(ml, h - mb); ctx.lineTo(w - mr, h - mb); ctx.stroke();

      ctx.fillStyle = '#607d8b'; ctx.font = '11px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('δ (degrees)', ml + pw / 2, h - 8);
      ctx.save(); ctx.translate(15, mt + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('P (pu)', 0, 0); ctx.restore();

      // Grid ticks
      for (var g = 0; g <= 180; g += 30) {
        var gx = ml + (g / 180) * pw;
        ctx.strokeStyle = 'rgba(236,239,241,0.07)';
        ctx.beginPath(); ctx.moveTo(gx, mt); ctx.lineTo(gx, h - mb); ctx.stroke();
        ctx.fillStyle = '#607d8b'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText(g + '°', gx, h - mb + 15);
      }

      var yScale = ph / (Pmax * 1.2);
      for (var pTick = 0; pTick <= Pmax * 1.2; pTick += 0.5) {
        var gy = h - mb - pTick * yScale;
        if (gy < mt) break;
        ctx.strokeStyle = 'rgba(236,239,241,0.05)';
        ctx.beginPath(); ctx.moveTo(ml, gy); ctx.lineTo(w - mr, gy); ctx.stroke();
        ctx.fillStyle = '#607d8b'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'right';
        ctx.fillText(pTick.toFixed(1), ml - 5, gy + 3);
      }

      // P-δ curve
      ctx.strokeStyle = PET.colors.green; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var d = 0; d <= 180; d++) {
        var px = ml + (d / 180) * pw;
        var py = h - mb - Pcurve(d) * yScale;
        if (d === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Pm line
      ctx.strokeStyle = PET.colors.amber; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      var pmY = h - mb - Pm * yScale;
      ctx.beginPath(); ctx.moveTo(ml, pmY); ctx.lineTo(w - mr, pmY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = PET.colors.amber; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'left';
      ctx.fillText('Pm = ' + Pm.toFixed(2), w - mr - 75, pmY - 6);

      // Operating point (stable)
      var delta0 = PET.radToDeg(Math.asin(PET.clamp(Pm / Pmax, -1, 1)));
      var opX = ml + (delta0 / 180) * pw;
      var opY = h - mb - Pm * yScale;
      ctx.fillStyle = PET.colors.green;
      ctx.beginPath(); ctx.arc(opX, opY, 6, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#eceff1'; ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText('δ₀=' + delta0.toFixed(1) + '°', opX + 10, opY - 8);

      // Unstable equilibrium
      var deltaMax = 180 - delta0;
      var umX = ml + (deltaMax / 180) * pw;
      ctx.fillStyle = '#ff5252';
      ctx.beginPath(); ctx.arc(umX, pmY, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#ff5252'; ctx.font = '10px JetBrains Mono';
      ctx.fillText('δ_max=' + deltaMax.toFixed(1) + '°', umX + 8, pmY - 8);

      // Equal-Area Criterion
      if (showEAC) {
        var fcaDeg = faultClearAngle;

        // Accelerating area (delta0 to fca where Pm > Pe_fault)
        // During fault: Pe_fault = 0 (simplified bolted fault at terminals)
        ctx.fillStyle = 'rgba(255,82,82,0.25)';
        ctx.beginPath();
        ctx.moveTo(ml + (delta0 / 180) * pw, pmY);
        for (var da = delta0; da <= fcaDeg; da++) {
          ctx.lineTo(ml + (da / 180) * pw, h - mb); // Pe=0 during fault
        }
        ctx.lineTo(ml + (fcaDeg / 180) * pw, pmY);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff5252'; ctx.font = 'bold 10px Inter';
        ctx.fillText('A_acc', ml + ((delta0 + fcaDeg) / 2 / 180) * pw, pmY + 15);

        // Decelerating area (fca to delta_max where Pe > Pm)
        ctx.fillStyle = 'rgba(0,230,118,0.2)';
        ctx.beginPath();
        ctx.moveTo(ml + (fcaDeg / 180) * pw, pmY);
        for (var dd = fcaDeg; dd <= deltaMax; dd++) {
          var py2 = h - mb - Pcurve(dd) * yScale;
          ctx.lineTo(ml + (dd / 180) * pw, py2);
        }
        ctx.lineTo(ml + (deltaMax / 180) * pw, pmY);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#00e676'; ctx.font = 'bold 10px Inter';
        var midDec = (fcaDeg + deltaMax) / 2;
        ctx.fillText('A_dec', ml + (midDec / 180) * pw, h - mb - Pcurve(midDec) * yScale - 10);

        // Fault clearing angle line
        var fcaX = ml + (fcaDeg / 180) * pw;
        ctx.strokeStyle = '#e040fb'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(fcaX, mt); ctx.lineTo(fcaX, h - mb); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#e040fb'; ctx.font = '10px JetBrains Mono';
        ctx.fillText('δ_cl=' + fcaDeg + '°', fcaX + 5, mt + 15);

        // Compute areas
        var Aacc = 0, Adec = 0;
        for (var k = delta0; k < fcaDeg; k++) {
          Aacc += (Pm - 0) * PET.degToRad(1); // Pe=0 during fault
        }
        for (var m = fcaDeg; m < deltaMax; m++) {
          Adec += (Pcurve(m) - Pm) * PET.degToRad(1);
        }

        var stable = Adec >= Aacc;
        infoDiv.innerHTML =
          '<strong>Power-Angle Curve</strong> &nbsp; Pmax = ' + Pmax.toFixed(3) + ' pu<br>' +
          'δ₀ = ' + delta0.toFixed(1) + '° &nbsp; δ_max = ' + deltaMax.toFixed(1) + '°<br>' +
          '<span style="color:#ff5252;">A_acc = ' + Aacc.toFixed(3) + '</span> &nbsp; ' +
          '<span style="color:#00e676;">A_dec = ' + Adec.toFixed(3) + '</span> &nbsp; ' +
          '<strong style="color:' + (stable ? '#00e676' : '#ff5252') + ';">' +
          (stable ? '✓ STABLE' : '✗ UNSTABLE') + '</strong>';
      } else {
        infoDiv.innerHTML =
          '<strong>Power-Angle Curve</strong> &nbsp; Pmax = ' + Pmax.toFixed(3) + ' pu<br>' +
          'δ₀ = ' + delta0.toFixed(1) + '° &nbsp; δ_max = ' + deltaMax.toFixed(1) + '°<br>' +
          '<span style="color:var(--text-muted);">Enable Equal-Area Criterion to see stability analysis</span>';
      }
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="pa-canvas" width="560" height="380"></canvas></div>' +
        '<div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-bottom:0.8rem;">' +
        '<div class="sim-param"><label>Ef (pu)</label><div class="param-row"><input type="range" id="pa-ef" min="0.8" max="2.5" step="0.05" value="1.50"><span class="value-display" id="pa-ef-val">1.50</span></div></div>' +
        '<div class="sim-param"><label>Vt (pu)</label><div class="param-row"><input type="range" id="pa-vt" min="0.8" max="1.2" step="0.01" value="1.00"><span class="value-display" id="pa-vt-val">1.00</span></div></div>' +
        '<div class="sim-param"><label>Xs (pu)</label><div class="param-row"><input type="range" id="pa-xs" min="0.5" max="2.5" step="0.05" value="1.20"><span class="value-display" id="pa-xs-val">1.20</span></div></div>' +
        '<div class="sim-param"><label>Pm (pu)</label><div class="param-row"><input type="range" id="pa-pm" min="0.1" max="1.5" step="0.05" value="0.60"><span class="value-display" id="pa-pm-val">0.60</span></div></div>' +
        '<div class="sim-param"><label>δ_cl (deg)</label><div class="param-row"><input type="range" id="pa-fca" min="10" max="170" step="1" value="50"><span class="value-display" id="pa-fca-val">50</span></div></div>' +
        '<label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:var(--text-secondary);align-self:flex-end;">' +
        '<input type="checkbox" id="pa-eac-toggle"> Equal-Area Criterion</label>' +
        '</div>' +
        '<div id="pa-info" style="font-family:JetBrains Mono,monospace;font-size:0.85rem;min-height:3rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
