/* ============================================================
   Sequence Network Visualizer & Symmetrical Component Decomposer
   ============================================================ */
var SequenceNetworksSim = (function () {
  'use strict';
  var C = PET.Complex;

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#seq-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 420);
    var infoDiv = container.querySelector('#seq-info');

    // Phasor magnitudes and angles (degrees)
    var Ia_mag = 1.0, Ia_ang = 0;
    var Ib_mag = 1.0, Ib_ang = -120;
    var Ic_mag = 1.0, Ic_ang = 120;

    var time = 0;
    var paused = false;
    var draggingPhasor = -1;

    bindSliders();

    container.querySelector('#seq-pause').addEventListener('click', function () {
      paused = !paused;
      this.textContent = paused ? '▶ Play' : '⏸ Pause';
    });
    container.querySelector('#seq-reset').addEventListener('click', function () {
      Ia_mag = 1.0; Ia_ang = 0;
      Ib_mag = 1.0; Ib_ang = -120;
      Ic_mag = 1.0; Ic_ang = 120;
      time = 0; paused = false;
      updateSliderDisplays();
      container.querySelector('#seq-pause').textContent = '⏸ Pause';
    });

    // Drag phasor tips
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', doDrag);
    canvas.addEventListener('mouseup', function () { draggingPhasor = -1; });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); startDrag(touchToMouse(e)); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); doDrag(touchToMouse(e)); }, { passive: false });
    canvas.addEventListener('touchend', function () { draggingPhasor = -1; });

    function touchToMouse(e) {
      var t = e.touches[0];
      return { clientX: t.clientX, clientY: t.clientY };
    }

    var cx1 = 150, cy1 = 210, scale = 80;

    function startDrag(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var tips = [
        { x: cx1 + Ia_mag * scale * Math.cos(PET.degToRad(Ia_ang)), y: cy1 - Ia_mag * scale * Math.sin(PET.degToRad(Ia_ang)) },
        { x: cx1 + Ib_mag * scale * Math.cos(PET.degToRad(Ib_ang)), y: cy1 - Ib_mag * scale * Math.sin(PET.degToRad(Ib_ang)) },
        { x: cx1 + Ic_mag * scale * Math.cos(PET.degToRad(Ic_ang)), y: cy1 - Ic_mag * scale * Math.sin(PET.degToRad(Ic_ang)) }
      ];
      for (var i = 0; i < 3; i++) {
        var dx = mx - tips[i].x, dy = my - tips[i].y;
        if (dx * dx + dy * dy < 400) { draggingPhasor = i; break; }
      }
    }

    function doDrag(e) {
      if (draggingPhasor < 0) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left - cx1;
      var my = -(e.clientY - rect.top - cy1);
      var mag = Math.sqrt(mx * mx + my * my) / scale;
      var ang = PET.radToDeg(Math.atan2(my, mx));
      mag = PET.clamp(mag, 0.05, 2.0);

      if (draggingPhasor === 0) { Ia_mag = mag; Ia_ang = ang; }
      else if (draggingPhasor === 1) { Ib_mag = mag; Ib_ang = ang; }
      else { Ic_mag = mag; Ic_ang = ang; }
      updateSliderDisplays();
    }

    var anim = PET.createAnimLoop(draw);
    anim.start();

    function draw(dt) {
      if (!paused) time += dt;

      var w = 560, h = 420;
      ctx.clearRect(0, 0, w, h);

      // Left panel: original phasors
      drawPhasorPanel(cx1, cy1, 'Original Phasors (Phase Domain)');

      // Compute sequence components
      var Ia = C.fromPolar(Ia_mag, Ia_ang);
      var Ib = C.fromPolar(Ib_mag, Ib_ang);
      var Ic = C.fromPolar(Ic_mag, Ic_ang);
      var seq = PET.phaseToSeq(Ia, Ib, Ic);

      // Right panel: sequence components
      var cx2 = 400, cy2 = 100;

      // Positive sequence (blue)
      drawSeqSet(cx2, cy2, seq.I1, 'Positive Seq', '#40c4ff', 1);

      // Negative sequence (red)
      drawSeqSet(cx2, cy2 + 120, seq.I2, 'Negative Seq', '#ff5252', -1);

      // Zero sequence (orange)
      var cx3 = cx2, cy3 = cy2 + 240;
      ctx.fillStyle = '#ffca28'; ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center'; ctx.fillText('Zero Seq', cx3, cy3 - 55);
      var i0_ang = seq.I0.angleDeg();
      var rotOff = time * 40;
      for (var k = 0; k < 3; k++) {
        PET.drawPhasor(ctx, cx3, cy3, seq.I0.mag(), PET.degToRad(i0_ang + rotOff), '#ffca28', '', scale * 0.5);
      }

      // Info
      infoDiv.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.3rem;">' +
        '<div><span style="color:#40c4ff;">I₁ = ' + seq.I1.mag().toFixed(3) + '∠' + seq.I1.angleDeg().toFixed(1) + '°</span></div>' +
        '<div><span style="color:#ff5252;">I₂ = ' + seq.I2.mag().toFixed(3) + '∠' + seq.I2.angleDeg().toFixed(1) + '°</span></div>' +
        '<div><span style="color:#ffca28;">I₀ = ' + seq.I0.mag().toFixed(3) + '∠' + seq.I0.angleDeg().toFixed(1) + '°</span></div>' +
        '</div>';
    }

    function drawPhasorPanel(cx, cy, title) {
      // Title
      ctx.fillStyle = '#eceff1'; ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'center'; ctx.fillText(title, cx, cy - scale - 15);

      // Circle
      ctx.strokeStyle = 'rgba(144,164,174,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, scale, 0, 2 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, scale * 0.5, 0, 2 * Math.PI); ctx.stroke();

      // Axes
      ctx.strokeStyle = 'rgba(144,164,174,0.2)';
      ctx.beginPath(); ctx.moveTo(cx - scale - 10, cy); ctx.lineTo(cx + scale + 10, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - scale - 10); ctx.lineTo(cx, cy + scale + 10); ctx.stroke();

      // Phase A (green)
      PET.drawPhasor(ctx, cx, cy, Ia_mag, PET.degToRad(Ia_ang), '#00e676', 'Ia', scale);
      // Phase B (blue)
      PET.drawPhasor(ctx, cx, cy, Ib_mag, PET.degToRad(Ib_ang), '#40c4ff', 'Ib', scale);
      // Phase C (amber)
      PET.drawPhasor(ctx, cx, cy, Ic_mag, PET.degToRad(Ic_ang), '#ffca28', 'Ic', scale);

      // Drag handles
      var tips = [
        { mag: Ia_mag, ang: Ia_ang, col: '#00e676' },
        { mag: Ib_mag, ang: Ib_ang, col: '#40c4ff' },
        { mag: Ic_mag, ang: Ic_ang, col: '#ffca28' }
      ];
      tips.forEach(function (t) {
        var tx = cx + t.mag * scale * Math.cos(PET.degToRad(t.ang));
        var ty = cy - t.mag * scale * Math.sin(PET.degToRad(t.ang));
        ctx.fillStyle = t.col;
        ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#0b0f1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 2 * Math.PI); ctx.stroke();
      });
    }

    function drawSeqSet(cx, cy, I1, title, color, dir) {
      ctx.fillStyle = color; ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center'; ctx.fillText(title, cx, cy - 55);

      var rotOff = time * 40 * dir;
      var baseAng = I1.angleDeg();
      var mag = I1.mag();

      for (var k = 0; k < 3; k++) {
        var ang = baseAng + rotOff + k * (dir > 0 ? -120 : 120);
        PET.drawPhasor(ctx, cx, cy, mag, PET.degToRad(ang), color, '', scale * 0.5);
      }
    }

    function updateSliderDisplays() {
      var ids = ['seq-ia-mag', 'seq-ia-ang', 'seq-ib-mag', 'seq-ib-ang', 'seq-ic-mag', 'seq-ic-ang'];
      var vals = [Ia_mag, Ia_ang, Ib_mag, Ib_ang, Ic_mag, Ic_ang];
      ids.forEach(function (id, i) {
        var el = container.querySelector('#' + id);
        var vEl = container.querySelector('#' + id + '-val');
        if (el) el.value = vals[i];
        if (vEl) vEl.textContent = vals[i].toFixed(i % 2 === 0 ? 2 : 0);
      });
    }

    function bindSliders() {
      function bind(id, setter, dec) {
        var el = container.querySelector('#' + id);
        if (!el) return;
        el.addEventListener('input', function () {
          setter(parseFloat(this.value));
          var v = container.querySelector('#' + id + '-val');
          if (v) v.textContent = parseFloat(this.value).toFixed(dec || 2);
        });
      }
      bind('seq-ia-mag', function (v) { Ia_mag = v; }, 2);
      bind('seq-ia-ang', function (v) { Ia_ang = v; }, 0);
      bind('seq-ib-mag', function (v) { Ib_mag = v; }, 2);
      bind('seq-ib-ang', function (v) { Ib_ang = v; }, 0);
      bind('seq-ic-mag', function (v) { Ic_mag = v; }, 2);
      bind('seq-ic-ang', function (v) { Ic_ang = v; }, 0);
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="seq-canvas" width="560" height="420"></canvas></div>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">' +
        '<button class="btn" id="seq-pause">⏸ Pause</button>' +
        '<button class="btn" id="seq-reset">Reset</button>' +
        '</div>' +
        '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">Drag phasor tips to create unbalanced conditions</p>' +
        '<div class="sim-params">' +
        '<div class="sim-param"><label>|Ia|</label><div class="param-row"><input type="range" id="seq-ia-mag" min="0.05" max="2" step="0.05" value="1"><span class="value-display" id="seq-ia-mag-val">1.00</span></div></div>' +
        '<div class="sim-param"><label>∠Ia (°)</label><div class="param-row"><input type="range" id="seq-ia-ang" min="-180" max="180" step="5" value="0"><span class="value-display" id="seq-ia-ang-val">0</span></div></div>' +
        '<div class="sim-param"><label>|Ib|</label><div class="param-row"><input type="range" id="seq-ib-mag" min="0.05" max="2" step="0.05" value="1"><span class="value-display" id="seq-ib-mag-val">1.00</span></div></div>' +
        '<div class="sim-param"><label>∠Ib (°)</label><div class="param-row"><input type="range" id="seq-ib-ang" min="-180" max="180" step="5" value="-120"><span class="value-display" id="seq-ib-ang-val">-120</span></div></div>' +
        '<div class="sim-param"><label>|Ic|</label><div class="param-row"><input type="range" id="seq-ic-mag" min="0.05" max="2" step="0.05" value="1"><span class="value-display" id="seq-ic-mag-val">1.00</span></div></div>' +
        '<div class="sim-param"><label>∠Ic (°)</label><div class="param-row"><input type="range" id="seq-ic-ang" min="-180" max="180" step="5" value="120"><span class="value-display" id="seq-ic-ang-val">120</span></div></div>' +
        '</div>' +
        '<div id="seq-info" style="margin-top:0.8rem;font-family:JetBrains Mono,monospace;font-size:0.85rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
