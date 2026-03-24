/* ============================================================
   Torque-Speed Characteristic Simulator
   Shows torque curve with rotor resistance variation and
   operating regions (motoring, generating, braking)
   ============================================================ */
var TorqueSpeedSim = (function () {
  'use strict';

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var V1 = 1.0;
    var R1 = 0.03, X1 = 0.06, R2 = 0.02, X2 = 0.06;
    var showMultiR2 = false;

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#ts-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 400);
    var infoDiv = container.querySelector('#ts-info');

    var sliders = {
      R2: container.querySelector('#ts-r2'),
      X2: container.querySelector('#ts-x2')
    };
    var displays = {
      R2: container.querySelector('#ts-r2-val'),
      X2: container.querySelector('#ts-x2-val')
    };

    Object.keys(sliders).forEach(function (k) {
      sliders[k].addEventListener('input', function () {
        displays[k].textContent = parseFloat(this.value).toFixed(3);
        draw();
      });
    });

    container.querySelector('#ts-multi').addEventListener('change', function () {
      showMultiR2 = this.checked;
      draw();
    });

    draw();

    function torque(s, r2) {
      if (Math.abs(s) < 0.0001) s = 0.0001;
      var Zth_r = R1, Zth_x = X1; // Approximate Thevenin
      var Vth = V1; // Simplified
      var num = Vth * Vth * (r2 / s);
      var den = (Zth_r + r2 / s) * (Zth_r + r2 / s) + (Zth_x + X2) * (Zth_x + X2);
      return num / den;
    }

    function draw() {
      R2 = parseFloat(sliders.R2.value);
      X2 = parseFloat(sliders.X2.value);

      var w = 560, h = 400;
      ctx.clearRect(0, 0, w, h);

      var ml = 60, mr = 30, mt = 20, mb = 50;
      var pw = w - ml - mr, ph = h - mt - mb;

      // Speed range: -0.5 to 2.0 (ns = 1 pu)
      var sMin = -0.5, sMax = 2.0;
      var nMin = 1 - sMax, nMax = 1 - sMin; // speed = 1-s

      // Find max torque for scaling
      var Tmax = 0;
      for (var ss = 0.001; ss <= 1; ss += 0.01) {
        Tmax = Math.max(Tmax, Math.abs(torque(ss, R2)));
      }
      Tmax *= 1.3;

      var byScale = ph / (2 * Tmax);
      var zeroY = mt + ph / 2;

      // Speed axis
      ctx.strokeStyle = 'rgba(236,239,241,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ml, zeroY); ctx.lineTo(w - mr, zeroY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ml, mt); ctx.lineTo(ml, h - mb); ctx.stroke();

      ctx.fillStyle = '#607d8b'; ctx.font = '11px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('Speed (n/ns)', ml + pw / 2, h - 8);
      ctx.save(); ctx.translate(15, mt + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('Torque (pu)', 0, 0); ctx.restore();

      // Speed ticks
      for (var n = -1.0; n <= 1.5; n += 0.5) {
        var nx = ml + ((n - nMin) / (nMax - nMin)) * pw;
        if (nx < ml || nx > w - mr) continue;
        ctx.strokeStyle = 'rgba(236,239,241,0.07)';
        ctx.beginPath(); ctx.moveTo(nx, mt); ctx.lineTo(nx, h - mb); ctx.stroke();
        ctx.fillStyle = '#607d8b'; ctx.font = '9px JetBrains Mono';
        ctx.fillText(n.toFixed(1), nx, h - mb + 15);
      }

      // Synchronous speed line
      var nsX = ml + ((1.0 - nMin) / (nMax - nMin)) * pw;
      ctx.strokeStyle = 'rgba(236,239,241,0.15)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(nsX, mt); ctx.lineTo(nsX, h - mb); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#607d8b'; ctx.font = '10px JetBrains Mono';
      ctx.fillText('ns', nsX, mt + 12);

      // Operating regions shading
      // Braking: n < 0 (s > 1)
      var brkLeft = ml;
      var brkRight = ml + ((0 - nMin) / (nMax - nMin)) * pw;
      ctx.fillStyle = 'rgba(255,82,82,0.06)';
      ctx.fillRect(brkLeft, mt, brkRight - brkLeft, ph);
      ctx.fillStyle = '#ff5252'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText('Braking', (brkLeft + brkRight) / 2, mt + 15);

      // Motoring: 0 < n < ns (0 < s < 1)
      var motRight = nsX;
      ctx.fillStyle = 'rgba(0,230,118,0.06)';
      ctx.fillRect(brkRight, mt, motRight - brkRight, ph);
      ctx.fillStyle = '#00e676';
      ctx.fillText('Motoring', (brkRight + motRight) / 2, mt + 15);

      // Generating: n > ns (s < 0)
      var genRight = w - mr;
      ctx.fillStyle = 'rgba(64,196,255,0.06)';
      ctx.fillRect(motRight, mt, genRight - motRight, ph);
      ctx.fillStyle = '#40c4ff';
      ctx.fillText('Generating', (motRight + genRight) / 2, mt + 15);

      // Multi-R2 curves
      if (showMultiR2) {
        var r2vals = [0.01, 0.03, 0.06, 0.10, 0.15];
        var alphas = [0.3, 0.4, 0.5, 0.6, 0.7];
        r2vals.forEach(function (rv, idx) {
          ctx.strokeStyle = 'rgba(255,202,40,' + alphas[idx] + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (var ss2 = sMin; ss2 <= sMax; ss2 += 0.005) {
            var n2 = 1 - ss2;
            var px = ml + ((n2 - nMin) / (nMax - nMin)) * pw;
            var T = torque(ss2, rv);
            var py = zeroY - T * byScale;
            py = PET.clamp(py, mt, h - mb);
            if (ss2 === sMin) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          // Label
          var labelS = rv; // ~max torque slip
          var labelN = 1 - labelS;
          var lx = ml + ((labelN - nMin) / (nMax - nMin)) * pw;
          ctx.fillStyle = 'rgba(255,202,40,' + alphas[idx] + ')';
          ctx.font = '8px JetBrains Mono'; ctx.textAlign = 'left';
          ctx.fillText('R2=' + rv.toFixed(2), lx + 5, zeroY - torque(labelS, rv) * byScale - 5);
        });
      }

      // Main curve
      ctx.strokeStyle = PET.colors.green; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var ss3 = sMin; ss3 <= sMax; ss3 += 0.005) {
        var n3 = 1 - ss3;
        var px3 = ml + ((n3 - nMin) / (nMax - nMin)) * pw;
        var T3 = torque(ss3, R2);
        var py3 = zeroY - T3 * byScale;
        py3 = PET.clamp(py3, mt, h - mb);
        if (ss3 === sMin) ctx.moveTo(px3, py3); else ctx.lineTo(px3, py3);
      }
      ctx.stroke();

      // Find max torque (motoring)
      var Tmax_mot = 0, sMaxT = 0;
      for (var ss4 = 0.001; ss4 <= 1.0; ss4 += 0.001) {
        var Tv = torque(ss4, R2);
        if (Tv > Tmax_mot) { Tmax_mot = Tv; sMaxT = ss4; }
      }

      // Mark max torque
      var nMaxT = 1 - sMaxT;
      var mxX = ml + ((nMaxT - nMin) / (nMax - nMin)) * pw;
      var mxY = zeroY - Tmax_mot * byScale;
      ctx.fillStyle = '#00e676';
      ctx.beginPath(); ctx.arc(mxX, mxY, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#eceff1'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'left';
      ctx.fillText('Tmax=' + Tmax_mot.toFixed(3), mxX + 8, mxY - 8);

      // Pull-out slip
      var s_pullout = R2 / Math.sqrt(R1 * R1 + (X1 + X2) * (X1 + X2));

      infoDiv.innerHTML =
        '<strong>Torque-Speed Characteristic</strong><br>' +
        '<span style="color:#00e676;">T_max = ' + Tmax_mot.toFixed(4) + ' pu at s = ' + sMaxT.toFixed(3) + '</span><br>' +
        'Pull-out slip (approx) = ' + s_pullout.toFixed(3) +
        ' &nbsp; Starting torque (s=1) = ' + torque(1, R2).toFixed(4) + ' pu';
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="ts-canvas" width="560" height="400"></canvas></div>' +
        '<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:0.8rem;">' +
        '<div class="sim-param"><label>R2 (pu)</label><div class="param-row"><input type="range" id="ts-r2" min="0.005" max="0.2" step="0.005" value="0.02"><span class="value-display" id="ts-r2-val">0.020</span></div></div>' +
        '<div class="sim-param"><label>X2 (pu)</label><div class="param-row"><input type="range" id="ts-x2" min="0.02" max="0.3" step="0.005" value="0.06"><span class="value-display" id="ts-x2-val">0.060</span></div></div>' +
        '<label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:var(--text-secondary);align-self:flex-end;">' +
        '<input type="checkbox" id="ts-multi"> Show R2 family</label>' +
        '</div>' +
        '<div id="ts-info" style="font-family:JetBrains Mono,monospace;font-size:0.85rem;min-height:2.5rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
