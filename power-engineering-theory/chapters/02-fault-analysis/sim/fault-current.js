/* ============================================================
   Fault Current Calculator — 4-Bus Network
   Click any bus to apply a fault, choose fault type
   ============================================================ */
var FaultCurrentSim = (function () {
  'use strict';
  var C = PET.Complex;

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var nBus = 4;
    var branches = [
      { from: 0, to: 1, z1: new C(0, 0.1), z2: new C(0, 0.1), z0: new C(0, 0.3) },
      { from: 1, to: 2, z1: new C(0, 0.12), z2: new C(0, 0.12), z0: new C(0, 0.35) },
      { from: 2, to: 3, z1: new C(0, 0.08), z2: new C(0, 0.08), z0: new C(0, 0.25) },
      { from: 0, to: 3, z1: new C(0, 0.15), z2: new C(0, 0.15), z0: new C(0, 0.4) },
      { from: 1, to: 3, z1: new C(0, 0.2), z2: new C(0, 0.2), z0: new C(0, 0.5) }
    ];

    var busNames = ['Gen 1', 'Bus 2', 'Bus 3', 'Gen 4'];
    var Vpre = 1.0;
    var faultBus = -1;
    var faultType = '3PH';
    var Zf = new C(0, 0); // fault impedance

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#fc-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 350);
    var infoDiv = container.querySelector('#fc-info');

    var faultSelect = container.querySelector('#fc-type');
    faultSelect.addEventListener('change', function () {
      faultType = this.value;
      if (faultBus >= 0) compute();
    });

    container.querySelector('#fc-zf').addEventListener('input', function () {
      Zf = new C(0, parseFloat(this.value));
      container.querySelector('#fc-zf-val').textContent = parseFloat(this.value).toFixed(3);
      if (faultBus >= 0) compute();
    });

    // Click bus to fault
    canvas.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var pos = getBusPositions();
      for (var i = 0; i < nBus; i++) {
        var dx = mx - pos[i].x, dy = my - pos[i].y;
        if (dx * dx + dy * dy < 625) { faultBus = i; compute(); return; }
      }
    });

    draw();

    function getBusPositions() {
      return [
        { x: 100, y: 80 }, { x: 460, y: 80 },
        { x: 460, y: 270 }, { x: 100, y: 270 }
      ];
    }

    function buildZBus(seq) {
      var n = nBus;
      var brList = branches.map(function (br) {
        return { from: br.from, to: br.to, z: br['z' + seq] };
      });
      var Y = PET.buildYBus(n, brList);
      var Z = PET.matInverse(Y);
      return Z;
    }

    function compute() {
      var Z1 = buildZBus('1');
      var Z2 = buildZBus('2');
      var Z0 = buildZBus('0');

      if (!Z1 || !Z2 || !Z0) { infoDiv.textContent = 'Error computing Z-bus'; return; }

      var f = faultBus;
      var Vf = new C(Vpre, 0);
      var results = {};

      if (faultType === '3PH') {
        // If = Vf / (Z1[f][f] + Zf)
        var If1 = Vf.div(Z1[f][f].add(Zf));
        var If = { Ia: If1.scale(Math.sqrt(2)).scale(1 / Math.sqrt(2)), Ib: C.fromPolar(0, 0), Ic: C.fromPolar(0, 0) };
        // Actually for 3-phase: Ia = If1, Ib = a²*If1, Ic = a*If1
        If.Ia = If1;
        If.Ib = PET.a2_op.mul(If1);
        If.Ic = PET.a_op.mul(If1);
        results.If = If;
        results.If_mag = If1.mag();

        // Bus voltages during fault
        results.V = [];
        for (var i = 0; i < nBus; i++) {
          var Vi = Vf.sub(Z1[i][f].mul(If1));
          results.V.push(Vi.mag());
        }
      } else if (faultType === 'SLG') {
        // Ia1 = Vf / (Z1[f][f] + Z2[f][f] + Z0[f][f] + 3*Zf)
        var denom = Z1[f][f].add(Z2[f][f]).add(Z0[f][f]).add(Zf.scale(3));
        var Ia1 = Vf.div(denom);
        var Ia2 = Ia1;
        var Ia0 = Ia1;
        var ph = PET.seqToPhase(Ia0, Ia1, Ia2);
        results.If = ph;
        results.If_mag = ph.Ia.mag();

        results.V = [];
        for (var i2 = 0; i2 < nBus; i2++) {
          var V1 = Vf.sub(Z1[i2][f].mul(Ia1));
          var V2 = Z2[i2][f].mul(Ia2).neg();
          var V0 = Z0[i2][f].mul(Ia0).neg();
          var Vabc = PET.seqToPhase(V0, V1, V2);
          results.V.push(Math.min(Vabc.Ia.mag(), Vabc.Ib.mag(), Vabc.Ic.mag()));
        }
      } else if (faultType === 'LL') {
        // Ia1 = Vf / (Z1[f][f] + Z2[f][f] + Zf)
        var denomLL = Z1[f][f].add(Z2[f][f]).add(Zf);
        var Ia1LL = Vf.div(denomLL);
        var Ia2LL = Ia1LL.neg();
        var Ia0LL = new C(0, 0);
        var phLL = PET.seqToPhase(Ia0LL, Ia1LL, Ia2LL);
        results.If = phLL;
        results.If_mag = phLL.Ib.mag();

        results.V = [];
        for (var i3 = 0; i3 < nBus; i3++) {
          var V1LL = Vf.sub(Z1[i3][f].mul(Ia1LL));
          var V2LL = Z2[i3][f].mul(Ia2LL).neg();
          var VabcLL = PET.seqToPhase(new C(0, 0), V1LL, V2LL);
          results.V.push(Math.min(VabcLL.Ia.mag(), VabcLL.Ib.mag(), VabcLL.Ic.mag()));
        }
      } else if (faultType === 'DLG') {
        var Z1ff = Z1[f][f], Z2ff = Z2[f][f], Z0ff = Z0[f][f];
        var Zpar = Z2ff.mul(Z0ff.add(Zf.scale(3))).div(Z2ff.add(Z0ff).add(Zf.scale(3)));
        var Ia1DLG = Vf.div(Z1ff.add(Zpar));
        var Ia2DLG = Ia1DLG.neg().mul(Z0ff.add(Zf.scale(3))).div(Z2ff.add(Z0ff).add(Zf.scale(3)));
        var Ia0DLG = Ia1DLG.neg().mul(Z2ff).div(Z2ff.add(Z0ff).add(Zf.scale(3)));
        var phDLG = PET.seqToPhase(Ia0DLG, Ia1DLG, Ia2DLG);
        results.If = phDLG;
        results.If_mag = Math.max(phDLG.Ib.mag(), phDLG.Ic.mag());

        results.V = [];
        for (var i4 = 0; i4 < nBus; i4++) {
          var V1DLG = Vf.sub(Z1[i4][f].mul(Ia1DLG));
          var V2DLG = Z2[i4][f].mul(Ia2DLG).neg();
          var V0DLG = Z0[i4][f].mul(Ia0DLG).neg();
          var VabcDLG = PET.seqToPhase(V0DLG, V1DLG, V2DLG);
          results.V.push(Math.min(VabcDLG.Ia.mag(), VabcDLG.Ib.mag(), VabcDLG.Ic.mag()));
        }
      }

      draw(results);
    }

    function draw(results) {
      var w = 560, h = 350;
      ctx.clearRect(0, 0, w, h);
      PET.drawGrid(ctx, w, h, 25, 'rgba(38,48,70,0.25)');

      var pos = getBusPositions();

      // Draw branches
      branches.forEach(function (br) {
        var a = pos[br.from], b = pos[br.to];
        ctx.strokeStyle = 'rgba(64,196,255,0.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.font = '9px JetBrains Mono';
        ctx.fillStyle = '#607d8b'; ctx.textAlign = 'center';
        ctx.fillText('z₁=j' + br.z1.im.toFixed(2), mx, my - 5);
      });

      // Draw buses
      pos.forEach(function (p, i) {
        var vMag = results && results.V ? results.V[i] : 1.0;
        var vColor = vMag > 0.9 ? '#00e676' : vMag > 0.7 ? '#ffca28' : '#ff5252';

        // Voltage bar
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(p.x + 25, p.y - 35, 12, 50);
        ctx.fillStyle = vColor;
        ctx.fillRect(p.x + 25, p.y - 35 + 50 * (1 - vMag), 12, 50 * vMag);

        // Bus circle
        var isFaulted = i === faultBus;
        ctx.fillStyle = isFaulted ? '#ff5252' : (i === 0 || i === 3 ? '#ffca28' : '#40c4ff');
        if (isFaulted) {
          ctx.shadowColor = '#ff5252'; ctx.shadowBlur = 15;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, 2 * Math.PI); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0b0f1a'; ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, p.x, p.y);

        ctx.fillStyle = '#eceff1'; ctx.font = '10px JetBrains Mono';
        ctx.fillText(busNames[i], p.x, p.y - 28);
        ctx.fillText('V=' + vMag.toFixed(3), p.x, p.y + 30);
      });

      // Fault indicator
      if (faultBus >= 0) {
        var fp = pos[faultBus];
        ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(fp.x, fp.y, 24, 0, 2 * Math.PI); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff5252'; ctx.font = 'bold 10px Inter';
        ctx.fillText('⚡ ' + faultType, fp.x, fp.y + 45);
      }

      // Info
      if (results) {
        var If = results.If;
        infoDiv.innerHTML =
          '<strong style="color:#ff5252;">Fault at Bus ' + (faultBus + 1) + ' (' + faultType + ')</strong><br>' +
          '<span style="color:#00e676;">|Ia| = ' + If.Ia.mag().toFixed(4) + ' pu ∠' + If.Ia.angleDeg().toFixed(1) + '°</span> &nbsp; ' +
          '<span style="color:#40c4ff;">|Ib| = ' + If.Ib.mag().toFixed(4) + ' pu</span> &nbsp; ' +
          '<span style="color:#ffca28;">|Ic| = ' + If.Ic.mag().toFixed(4) + ' pu</span><br>' +
          '<span style="color:#b388ff;">Max Fault Current = ' + results.If_mag.toFixed(4) + ' pu</span>';
      } else {
        infoDiv.innerHTML = '<span style="color:var(--text-muted);">Click a bus to apply a fault</span>';
      }
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="fc-canvas" width="560" height="350"></canvas></div>' +
        '<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.8rem;flex-wrap:wrap;">' +
        '<label style="font-size:0.85rem;color:var(--text-secondary);">Fault Type:</label>' +
        '<select id="fc-type"><option value="3PH">3-Phase (Symmetrical)</option><option value="SLG">Single Line-to-Ground</option><option value="LL">Line-to-Line</option><option value="DLG">Double Line-to-Ground</option></select>' +
        '<div class="sim-param" style="margin-left:1rem;"><label>Fault Z (pu)</label><div class="param-row"><input type="range" id="fc-zf" min="0" max="0.2" step="0.005" value="0"><span class="value-display" id="fc-zf-val">0.000</span></div></div>' +
        '</div>' +
        '<div id="fc-info" style="margin-top:0.5rem;font-family:JetBrains Mono,monospace;font-size:0.85rem;min-height:3rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
