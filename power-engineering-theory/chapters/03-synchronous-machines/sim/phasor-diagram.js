/* ============================================================
   Synchronous Machine Phasor Diagram
   Interactive: adjust Vt, If, power angle δ, PF angle φ
   ============================================================ */
var PhasorDiagramSim = (function () {
  'use strict';

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var Vt = 1.0, Xs = 1.2, Ra = 0.0;
    var delta = 30; // power angle in degrees
    var mode = 'gen'; // 'gen' or 'motor'

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#pd-canvas');
    var ctx = PET.setupCanvas(canvas, 520, 420);

    var sliders = {
      Vt: container.querySelector('#pd-vt'),
      Xs: container.querySelector('#pd-xs'),
      delta: container.querySelector('#pd-delta'),
      Ra: container.querySelector('#pd-ra')
    };
    var displays = {
      Vt: container.querySelector('#pd-vt-val'),
      Xs: container.querySelector('#pd-xs-val'),
      delta: container.querySelector('#pd-delta-val'),
      Ra: container.querySelector('#pd-ra-val')
    };
    var infoDiv = container.querySelector('#pd-info');
    var modeBtn = container.querySelector('#pd-mode');

    Object.keys(sliders).forEach(function (k) {
      sliders[k].addEventListener('input', function () {
        displays[k].textContent = parseFloat(this.value).toFixed(k === 'delta' ? 0 : 2);
        update();
      });
    });

    modeBtn.addEventListener('click', function () {
      mode = mode === 'gen' ? 'motor' : 'gen';
      modeBtn.textContent = mode === 'gen' ? 'Generator' : 'Motor';
      modeBtn.style.background = mode === 'gen' ? '#00e676' : '#40c4ff';
      update();
    });

    update();

    function update() {
      Vt = parseFloat(sliders.Vt.value);
      Xs = parseFloat(sliders.Xs.value);
      Ra = parseFloat(sliders.Ra.value);
      delta = parseFloat(sliders.delta.value);

      draw();
    }

    function draw() {
      var w = 520, h = 420;
      ctx.clearRect(0, 0, w, h);
      PET.drawGrid(ctx, w, h, 25, 'rgba(38,48,70,0.2)');

      var ox = 200, oy = 280; // origin
      var scale = 120;

      var dRad = PET.degToRad(delta);
      var sign = mode === 'gen' ? 1 : -1;

      // Ef leads Vt by δ for generator, lags for motor
      var VtVec = { x: Vt, y: 0 };
      var EfMag, Ia_x, Ia_y;

      // For generator: Ef = Vt + (Ra + jXs)*Ia
      // We determine Ef from Vt and δ: Ef at angle δ
      var Ef_x = Vt + (Xs * Vt * Math.sin(sign * dRad)) / Xs;
      // More rigorously: Ef∠δ  =>  Ef_x = Ef*cos(δ), Ef_y = Ef*sin(δ)
      // Ia = (Ef - Vt) / (Ra + jXs)

      // For round-rotor: P = (Ef*Vt/Xs)*sin(δ)
      // Given δ, compute Ef such that diagram looks right
      // Let's fix |Ef| from P formula: P = |Ef|*|Vt|*sin(δ)/Xs
      // For visualization, let Ef_mag be a function of excitation
      EfMag = Vt * 1.5; // over-excited default

      var efx = EfMag * Math.cos(sign * dRad);
      var efy = EfMag * Math.sin(sign * dRad);

      // Ia = (Ef - Vt) / (Ra + jXs)
      var diff_r = efx - Vt;
      var diff_i = efy;
      var Zs_r = Ra, Zs_i = Xs;
      var Zs_mag2 = Zs_r * Zs_r + Zs_i * Zs_i;
      Ia_x = (diff_r * Zs_r + diff_i * Zs_i) / Zs_mag2;
      Ia_y = (diff_i * Zs_r - diff_r * Zs_i) / Zs_mag2;

      var Ia_mag = Math.sqrt(Ia_x * Ia_x + Ia_y * Ia_y);
      var phi = Math.atan2(Ia_y, Ia_x);
      var pf = Math.cos(phi);
      var P = Vt * Ia_mag * pf;
      var Q = Vt * Ia_mag * Math.sin(phi);

      // Draw axes
      ctx.strokeStyle = 'rgba(236,239,241,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(50, oy); ctx.lineTo(w - 30, oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, 30); ctx.lineTo(ox, h - 30); ctx.stroke();
      ctx.fillStyle = '#607d8b'; ctx.font = '10px JetBrains Mono';
      ctx.fillText('Re', w - 25, oy - 5);
      ctx.fillText('Im', ox + 5, 35);

      // Vt phasor (along real axis)
      PET.drawPhasor(ctx, ox, oy, ox + VtVec.x * scale, oy, PET.colors.green, 3, 'V_t');

      // Ef phasor
      PET.drawPhasor(ctx, ox, oy, ox + efx * scale, oy - efy * scale, PET.colors.amber, 3, 'E_f');

      // Ia phasor
      PET.drawPhasor(ctx, ox, oy, ox + Ia_x * scale, oy - Ia_y * scale, PET.colors.blue, 2.5, 'I_a');

      // jXs*Ia drop (from Vt tip to Ef tip)
      var jXsIa_r = -Xs * Ia_y; // j*Xs * (Ia_x + jIa_y) = -Xs*Ia_y + jXs*Ia_x
      var jXsIa_i = Xs * Ia_x;
      var RaIa_r = Ra * Ia_x;
      var RaIa_i = Ra * Ia_y;

      // Ra*Ia from Vt tip
      var vtTipX = ox + Vt * scale, vtTipY = oy;
      if (Ra > 0.01) {
        ctx.strokeStyle = '#e040fb'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(vtTipX, vtTipY);
        ctx.lineTo(vtTipX + RaIa_r * scale, vtTipY - RaIa_i * scale);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#e040fb'; ctx.font = '10px JetBrains Mono';
        ctx.fillText('RaIa', vtTipX + RaIa_r * scale / 2, vtTipY - RaIa_i * scale / 2 - 8);
      }

      // jXsIa from (Vt + RaIa) to Ef
      var midX = vtTipX + RaIa_r * scale;
      var midY = vtTipY - RaIa_i * scale;
      ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(ox + efx * scale, oy - efy * scale);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ff5252'; ctx.font = '10px JetBrains Mono';
      ctx.fillText('jXsIa', (midX + ox + efx * scale) / 2 + 5, (midY + oy - efy * scale) / 2 - 8);

      // Power angle arc
      if (Math.abs(delta) > 1) {
        ctx.strokeStyle = '#ffca28'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ox, oy, 40, -sign * dRad * (sign > 0 ? 1 : -1), 0, sign > 0);
        ctx.stroke();
        ctx.fillStyle = '#ffca28'; ctx.font = '11px JetBrains Mono';
        ctx.fillText('δ=' + delta + '°', ox + 45, oy - 10);
      }

      // PF angle arc
      ctx.strokeStyle = '#40c4ff'; ctx.lineWidth = 1;
      var phiEnd = -phi;
      ctx.beginPath();
      ctx.arc(ox, oy, 30, Math.min(0, phiEnd), Math.max(0, phiEnd));
      ctx.stroke();
      ctx.fillStyle = '#40c4ff'; ctx.font = '10px JetBrains Mono';
      ctx.fillText('φ', ox + 32, oy + 15);

      // Info
      infoDiv.innerHTML =
        '<strong>' + (mode === 'gen' ? 'Generator' : 'Motor') + ' Mode</strong><br>' +
        '<span style="color:#00e676;">|Vt| = ' + Vt.toFixed(3) + ' pu</span> &nbsp; ' +
        '<span style="color:#ffca28;">|Ef| = ' + EfMag.toFixed(3) + ' pu</span> &nbsp; ' +
        '<span style="color:#40c4ff;">|Ia| = ' + Ia_mag.toFixed(3) + ' pu</span><br>' +
        'P = ' + P.toFixed(3) + ' pu &nbsp; Q = ' + Q.toFixed(3) + ' pu &nbsp; ' +
        'PF = ' + Math.abs(pf).toFixed(3) + (pf >= 0 ? ' lag' : ' lead') + '<br>' +
        'δ = ' + delta + '° &nbsp; φ = ' + PET.radToDeg(phi).toFixed(1) + '°';
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="pd-canvas" width="520" height="420"></canvas></div>' +
        '<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:0.8rem;">' +
        '<div class="sim-param"><label>Vt (pu)</label><div class="param-row"><input type="range" id="pd-vt" min="0.8" max="1.2" step="0.01" value="1.0"><span class="value-display" id="pd-vt-val">1.00</span></div></div>' +
        '<div class="sim-param"><label>Xs (pu)</label><div class="param-row"><input type="range" id="pd-xs" min="0.5" max="2.5" step="0.05" value="1.20"><span class="value-display" id="pd-xs-val">1.20</span></div></div>' +
        '<div class="sim-param"><label>δ (deg)</label><div class="param-row"><input type="range" id="pd-delta" min="0" max="90" step="1" value="30"><span class="value-display" id="pd-delta-val">30</span></div></div>' +
        '<div class="sim-param"><label>Ra (pu)</label><div class="param-row"><input type="range" id="pd-ra" min="0" max="0.2" step="0.01" value="0.00"><span class="value-display" id="pd-ra-val">0.00</span></div></div>' +
        '<button id="pd-mode" style="height:32px;padding:0 14px;border:none;border-radius:4px;background:#00e676;color:#0b0f1a;font-weight:700;cursor:pointer;align-self:flex-end;">Generator</button>' +
        '</div>' +
        '<div id="pd-info" style="font-family:JetBrains Mono,monospace;font-size:0.85rem;min-height:3.5rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
