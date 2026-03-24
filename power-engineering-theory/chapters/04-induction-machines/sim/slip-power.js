/* ============================================================
   Slip-Power Recovery (Doubly-Fed) Visualizer
   Shows power flow at different slip values and V/f control
   ============================================================ */
var SlipPowerSim = (function () {
  'use strict';

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var Prated = 1.0; // pu
    var sRange = 0.3; // slip range ±

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#sp-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 380);
    var infoDiv = container.querySelector('#sp-info');

    var slipSlider = container.querySelector('#sp-slip');
    var slipDisp = container.querySelector('#sp-slip-val');
    var freqSlider = container.querySelector('#sp-freq');
    var freqDisp = container.querySelector('#sp-freq-val');
    var modeSelect = container.querySelector('#sp-mode');

    slipSlider.addEventListener('input', function () {
      slipDisp.textContent = parseFloat(this.value).toFixed(3);
      draw();
    });
    freqSlider.addEventListener('input', function () {
      freqDisp.textContent = parseFloat(this.value).toFixed(1);
      draw();
    });
    modeSelect.addEventListener('change', function () { draw(); });

    draw();

    function draw() {
      var s = parseFloat(slipSlider.value);
      var fRatio = parseFloat(freqSlider.value) / 50; // frequency ratio
      var mode = modeSelect.value;

      var w = 560, h = 380;
      ctx.clearRect(0, 0, w, h);
      PET.drawGrid(ctx, w, h, 30, 'rgba(38,48,70,0.15)');

      if (mode === 'vf') {
        drawVFControl(ctx, w, h, fRatio);
      } else {
        drawSlipPowerFlow(ctx, w, h, s);
      }
    }

    function drawSlipPowerFlow(ctx, w, h, s) {
      var cx = w / 2, cy = 140;

      // Machine box
      ctx.strokeStyle = 'rgba(236,239,241,0.4)'; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 60, cy - 30, 120, 60);
      ctx.fillStyle = '#eceff1'; ctx.font = 'bold 13px Inter'; ctx.textAlign = 'center';
      ctx.fillText('Induction', cx, cy - 5);
      ctx.fillText('Machine', cx, cy + 12);

      // Stator power (left)
      var Ps = Prated; // stator input power ≈ constant
      var Pag = Ps * 0.97; // air-gap power (minus stator losses)
      var Protor = Pag * s; // rotor copper loss = s * Pag
      var Pmech = Pag * (1 - s);

      // Arrows
      drawPowerArrow(ctx, 30, cy, cx - 65, cy, '#00e676', 'P_stator', Ps.toFixed(3));

      // Mechanical output (right)
      drawPowerArrow(ctx, cx + 65, cy, w - 30, cy, '#ffca28', 'P_mech', Pmech.toFixed(3));

      // Rotor loss (down)
      if (s > 0.001) {
        drawPowerArrow(ctx, cx, cy + 35, cx, cy + 120, '#ff5252', 'P_rotor = s·P_ag', Protor.toFixed(3));
      }

      // Slip-power recovery path
      if (Math.abs(s) > 0.05) {
        ctx.strokeStyle = '#e040fb'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy + 100);
        ctx.lineTo(cx + 120, cy + 100);
        ctx.lineTo(cx + 120, cy + 150);
        ctx.lineTo(cx - 120, cy + 150);
        ctx.lineTo(cx - 120, cy);
        ctx.lineTo(cx - 65, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#e040fb'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('Slip Power Recovery', cx, cy + 165);
        ctx.fillText('(Back to grid)', cx, cy + 178);
      }

      // Power balance bar chart
      var barY = 250, barW = 350, barH = 20;
      var barX = (w - barW) / 2;

      ctx.fillStyle = 'rgba(0,230,118,0.15)';
      ctx.fillRect(barX, barY, barW, barH);

      var mechW = barW * Pmech / Ps;
      var rotorW = barW * Protor / Ps;
      var statorW = barW * 0.03; // ~3% stator loss

      ctx.fillStyle = 'rgba(255,202,40,0.4)';
      ctx.fillRect(barX, barY, mechW, barH);
      ctx.fillStyle = 'rgba(255,82,82,0.4)';
      ctx.fillRect(barX + mechW, barY, rotorW, barH);
      ctx.fillStyle = 'rgba(236,239,241,0.2)';
      ctx.fillRect(barX + mechW + rotorW, barY, statorW, barH);

      ctx.fillStyle = '#eceff1'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('Mech ' + (Pmech / Ps * 100).toFixed(1) + '%', barX + mechW / 2, barY + 13);
      if (rotorW > 40) {
        ctx.fillText('Rotor ' + (Protor / Ps * 100).toFixed(1) + '%', barX + mechW + rotorW / 2, barY + 13);
      }

      ctx.fillStyle = '#607d8b'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText('Power Balance', w / 2, barY - 5);

      // Efficiency bar
      var eff = Pmech / Ps * 100;
      ctx.fillStyle = '#607d8b'; ctx.font = '10px JetBrains Mono';
      ctx.fillText('η = ' + eff.toFixed(1) + '%', w / 2, barY + barH + 20);

      var speed = (1 - s) * 100;
      infoDiv.innerHTML =
        '<strong>Slip-Power Flow</strong> &nbsp; s = ' + (s * 100).toFixed(1) + '% &nbsp; speed = ' + speed.toFixed(1) + '% of n_s<br>' +
        '<span style="color:#00e676;">P_stator = ' + Ps.toFixed(3) + '</span> &nbsp; ' +
        '<span style="color:#ffca28;">P_mech = ' + Pmech.toFixed(3) + '</span> &nbsp; ' +
        '<span style="color:#ff5252;">P_rotor_loss = ' + Protor.toFixed(3) + '</span><br>' +
        'η = ' + eff.toFixed(1) + '% &nbsp; Recoverable slip power = ' + (Protor * 0.95).toFixed(3) + ' pu';
    }

    function drawVFControl(ctx, w, h, fRatio) {
      var ml = 70, mr = 30, mt = 30, mb = 50;
      var pw = w - ml - mr, ph = h - mt - mb;

      // Axes
      ctx.strokeStyle = 'rgba(236,239,241,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ml, h - mb); ctx.lineTo(w - mr, h - mb); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ml, mt); ctx.lineTo(ml, h - mb); ctx.stroke();

      ctx.fillStyle = '#607d8b'; ctx.font = '11px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('Speed (× n_s)', ml + pw / 2, h - 8);
      ctx.save(); ctx.translate(15, mt + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('Torque (pu)', 0, 0); ctx.restore();

      // T-n curves at different frequencies
      var freqs = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2];
      var Tscale = 2.0;
      var colors = ['#ff5252', '#e040fb', '#ffca28', '#40c4ff', '#00e676', '#b388ff'];

      freqs.forEach(function (f, idx) {
        var ns = f; // synchronous speed proportional to frequency
        ctx.strokeStyle = colors[idx];
        ctx.lineWidth = f === fRatio ? 3 : 1;
        ctx.globalAlpha = f === fRatio ? 1 : 0.4;

        ctx.beginPath();
        for (var n = 0; n <= 1.5; n += 0.005) {
          var s_local = (ns - n) / ns;
          if (Math.abs(s_local) < 0.001) s_local = 0.001;
          if (s_local > 2 || s_local < -1) { continue; }

          // V/f = const => V = f*V_rated
          var V = f * 1.0;
          var R2 = 0.02, X1 = 0.06 * f, X2 = 0.06 * f, R1 = 0.03;
          var num = V * V * (R2 / s_local);
          var den = (R1 + R2 / s_local) * (R1 + R2 / s_local) + (X1 + X2) * (X1 + X2);
          var T = num / den;

          if (T > Tscale || T < -Tscale * 0.5) continue;

          var px = ml + (n / 1.5) * pw;
          var py = (h - mb) - (T / Tscale) * ph;
          py = PET.clamp(py, mt, h - mb);

          if (n === 0 || px === ml) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Label
        ctx.fillStyle = colors[idx]; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'left';
        var labelX = ml + (ns / 1.5) * pw;
        ctx.fillText(f.toFixed(1) + 'f', labelX - 10, mt + 12);
      });

      // Constant torque line
      ctx.strokeStyle = 'rgba(236,239,241,0.2)'; ctx.setLineDash([4, 4]);
      var constTy = (h - mb) - (0.8 / Tscale) * ph;
      ctx.beginPath(); ctx.moveTo(ml, constTy); ctx.lineTo(w - mr, constTy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#607d8b'; ctx.font = '9px Inter';
      ctx.fillText('Const. T region', ml + 10, constTy - 5);

      infoDiv.innerHTML =
        '<strong>V/f Speed Control</strong> &nbsp; f = ' + (fRatio * 50).toFixed(1) + ' Hz (' + fRatio.toFixed(2) + '×)<br>' +
        'Synchronous speed ∝ f &nbsp; → n_s = ' + (fRatio * 100).toFixed(0) + '% of rated<br>' +
        '<span style="color:var(--text-muted);">V/f = const maintains flux and torque capability below rated speed</span>';
    }

    function drawPowerArrow(ctx, x1, y1, x2, y2, color, label, value) {
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

      // Arrowhead
      var angle = Math.atan2(y2 - y1, x2 - x1);
      var headLen = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
      ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
      ctx.closePath(); ctx.fill();

      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      ctx.fillStyle = color; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText(label, mx, my - 12);
      ctx.fillText(value + ' pu', mx, my - 2);
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="sp-canvas" width="560" height="380"></canvas></div>' +
        '<div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-bottom:0.8rem;align-items:flex-end;">' +
        '<div class="sim-param"><label>Mode</label><select id="sp-mode"><option value="slip">Slip-Power Flow</option><option value="vf">V/f Control</option></select></div>' +
        '<div class="sim-param"><label>Slip</label><div class="param-row"><input type="range" id="sp-slip" min="0.001" max="0.5" step="0.001" value="0.03"><span class="value-display" id="sp-slip-val">0.030</span></div></div>' +
        '<div class="sim-param"><label>Frequency (Hz)</label><div class="param-row"><input type="range" id="sp-freq" min="10" max="60" step="0.5" value="50"><span class="value-display" id="sp-freq-val">50.0</span></div></div>' +
        '</div>' +
        '<div id="sp-info" style="font-family:JetBrains Mono,monospace;font-size:0.85rem;min-height:2.5rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
