/* ============================================================
   Induction Machine Equivalent Circuit Simulator
   Shows per-phase circuit with power flow breakdown
   ============================================================ */
var EquivCircuitSim = (function () {
  'use strict';

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var V1 = 1.0; // Vph pu
    var R1 = 0.03, X1 = 0.06; // stator
    var R2 = 0.02, X2 = 0.06; // rotor (referred)
    var Xm = 3.0;             // magnetising
    var s = 0.03;              // slip

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#ec-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 340);
    var infoDiv = container.querySelector('#ec-info');

    var sliders = {
      R1: container.querySelector('#ec-r1'),
      X1: container.querySelector('#ec-x1'),
      R2: container.querySelector('#ec-r2'),
      X2: container.querySelector('#ec-x2'),
      Xm: container.querySelector('#ec-xm'),
      s:  container.querySelector('#ec-s')
    };
    var displays = {
      R1: container.querySelector('#ec-r1-val'),
      X1: container.querySelector('#ec-x1-val'),
      R2: container.querySelector('#ec-r2-val'),
      X2: container.querySelector('#ec-x2-val'),
      Xm: container.querySelector('#ec-xm-val'),
      s:  container.querySelector('#ec-s-val')
    };

    Object.keys(sliders).forEach(function (k) {
      sliders[k].addEventListener('input', function () {
        displays[k].textContent = parseFloat(this.value).toFixed(k === 's' ? 3 : 2);
        update();
      });
    });

    update();

    function update() {
      R1 = parseFloat(sliders.R1.value);
      X1 = parseFloat(sliders.X1.value);
      R2 = parseFloat(sliders.R2.value);
      X2 = parseFloat(sliders.X2.value);
      Xm = parseFloat(sliders.Xm.value);
      s = parseFloat(sliders.s.value);
      if (s < 0.001) s = 0.001;
      draw();
    }

    function draw() {
      var w = 560, h = 340;
      ctx.clearRect(0, 0, w, h);

      // Circuit diagram
      var y0 = 100, xl = 40, xr = 520;

      // Stator impedance box
      drawComponent(ctx, xl + 30, y0, 'R1=' + R1.toFixed(3), '#ff5252');
      drawComponent(ctx, xl + 130, y0, 'jX1=' + X1.toFixed(3), '#40c4ff');

      // Magnetising branch
      var xmid = xl + 230;
      ctx.strokeStyle = 'rgba(236,239,241,0.3)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xmid, y0); ctx.lineTo(xmid, y0 + 80); ctx.stroke();
      ctx.fillStyle = '#ffca28'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('jXm=' + Xm.toFixed(1), xmid, y0 + 50);

      // Rotor impedance box
      drawComponent(ctx, xmid + 50, y0, 'jX2=' + X2.toFixed(3), '#40c4ff');
      drawComponent(ctx, xmid + 150, y0, 'R2/s=' + (R2 / s).toFixed(3), '#00e676');

      // Connections
      ctx.strokeStyle = 'rgba(236,239,241,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Top line
      ctx.moveTo(xl, y0); ctx.lineTo(xl + 30, y0);
      ctx.moveTo(xl + 100, y0); ctx.lineTo(xl + 130, y0);
      ctx.moveTo(xl + 200, y0); ctx.lineTo(xmid + 50, y0);
      ctx.moveTo(xmid + 120, y0); ctx.lineTo(xmid + 150, y0);
      ctx.moveTo(xmid + 220, y0); ctx.lineTo(xr, y0);
      // Bottom return
      ctx.moveTo(xl, y0 + 80); ctx.lineTo(xr, y0 + 80);
      ctx.moveTo(xl, y0); ctx.lineTo(xl, y0 + 80);
      ctx.moveTo(xr, y0); ctx.lineTo(xr, y0 + 80);
      ctx.moveTo(xmid, y0 + 80); ctx.lineTo(xmid, y0 + 80);
      ctx.stroke();

      // V1 label
      ctx.fillStyle = '#00e676'; ctx.font = 'bold 12px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('V₁ = ' + V1.toFixed(2) + ' pu', xl, y0 - 15);

      // Labels
      ctx.fillStyle = '#eceff1'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
      ctx.fillText('Stator', xl + 60, y0 - 25);
      ctx.fillText('Air Gap', xmid - 15, y0 - 25);
      ctx.fillText('Rotor (referred)', xmid + 90, y0 - 25);

      // Compute circuit
      var C = PET.Complex;
      var Zs = new C(R1, X1);
      var Zm = new C(0, Xm);
      var Zr = new C(R2 / s, X2);

      // Z_parallel = Zm || Zr
      var Zpar = Zm.mul(Zr).div(Zm.add(Zr));
      var Ztot = Zs.add(Zpar);

      var Vs = new C(V1, 0);
      var I1 = Vs.div(Ztot);
      var I1_mag = I1.mag();

      // Voltage across parallel branch
      var Vpar = I1.mul(Zpar);
      var Im = Vpar.div(Zm);
      var I2 = Vpar.div(Zr);
      var I2_mag = I2.mag();

      // Powers
      var Pcu1 = I1_mag * I1_mag * R1;
      var Pcu2 = I2_mag * I2_mag * R2;
      var Pag = I2_mag * I2_mag * R2 / s; // air-gap power
      var Pmech = Pag * (1 - s);
      var Pin = Vs.mul(I1.conj()).re;
      var Qin = Vs.mul(I1.conj()).im;
      var eff = Pmech / Math.max(Pin, 0.0001) * 100;
      var Torque = Pag; // in pu (Pag / ωs = torque, ωs=1 pu)

      // Power flow Sankey (simplified bars)
      var barY = 210, barH = 25;
      var maxBar = Math.max(Pin, 0.01);
      var barScale = 400 / maxBar;

      ctx.fillStyle = 'rgba(0,230,118,0.2)';
      ctx.fillRect(80, barY, Pin * barScale, barH);
      ctx.fillStyle = '#00e676'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'left';
      ctx.fillText('P_in = ' + Pin.toFixed(4), 80, barY - 5);

      ctx.fillStyle = 'rgba(255,82,82,0.3)';
      ctx.fillRect(80, barY + 35, Pcu1 * barScale, barH);
      ctx.fillStyle = '#ff5252';
      ctx.fillText('P_cu1 = ' + Pcu1.toFixed(4), 80, barY + 30);

      ctx.fillStyle = 'rgba(64,196,255,0.2)';
      ctx.fillRect(80, barY + 70, Pag * barScale, barH);
      ctx.fillStyle = '#40c4ff';
      ctx.fillText('P_ag = ' + Pag.toFixed(4), 80, barY + 65);

      ctx.fillStyle = 'rgba(255,202,40,0.2)';
      ctx.fillRect(80, barY + 105, Pmech * barScale, barH);
      ctx.fillStyle = '#ffca28';
      ctx.fillText('P_mech = ' + Pmech.toFixed(4), 80, barY + 100);

      infoDiv.innerHTML =
        '<strong>Equivalent Circuit Analysis</strong> &nbsp; slip = ' + (s * 100).toFixed(1) + '%<br>' +
        '<span style="color:#00e676;">|I₁| = ' + I1_mag.toFixed(4) + ' pu</span> &nbsp; ' +
        '<span style="color:#40c4ff;">|I₂| = ' + I2_mag.toFixed(4) + ' pu</span> &nbsp; ' +
        'PF = ' + (Math.cos(I1.angle())).toFixed(3) + '<br>' +
        'η = ' + eff.toFixed(1) + '% &nbsp; ' +
        'T = ' + Torque.toFixed(4) + ' pu &nbsp; ' +
        'Q = ' + Qin.toFixed(4) + ' pu';
    }

    function drawComponent(ctx, x, y, label, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(x, y - 12, 70, 24);
      ctx.fillStyle = color; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText(label, x + 35, y + 4);
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="ec-canvas" width="560" height="340"></canvas></div>' +
        '<div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.8rem;">' +
        '<div class="sim-param"><label>R1 (pu)</label><div class="param-row"><input type="range" id="ec-r1" min="0.01" max="0.15" step="0.005" value="0.03"><span class="value-display" id="ec-r1-val">0.03</span></div></div>' +
        '<div class="sim-param"><label>X1 (pu)</label><div class="param-row"><input type="range" id="ec-x1" min="0.02" max="0.2" step="0.005" value="0.06"><span class="value-display" id="ec-x1-val">0.06</span></div></div>' +
        '<div class="sim-param"><label>R2 (pu)</label><div class="param-row"><input type="range" id="ec-r2" min="0.01" max="0.15" step="0.005" value="0.02"><span class="value-display" id="ec-r2-val">0.02</span></div></div>' +
        '<div class="sim-param"><label>X2 (pu)</label><div class="param-row"><input type="range" id="ec-x2" min="0.02" max="0.2" step="0.005" value="0.06"><span class="value-display" id="ec-x2-val">0.06</span></div></div>' +
        '<div class="sim-param"><label>Xm (pu)</label><div class="param-row"><input type="range" id="ec-xm" min="1.0" max="6.0" step="0.1" value="3.0"><span class="value-display" id="ec-xm-val">3.00</span></div></div>' +
        '<div class="sim-param"><label>Slip</label><div class="param-row"><input type="range" id="ec-s" min="0.001" max="1.0" step="0.001" value="0.03"><span class="value-display" id="ec-s-val">0.030</span></div></div>' +
        '</div>' +
        '<div id="ec-info" style="font-family:JetBrains Mono,monospace;font-size:0.85rem;min-height:3rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
