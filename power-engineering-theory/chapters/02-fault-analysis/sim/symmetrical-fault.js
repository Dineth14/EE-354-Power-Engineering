/* ============================================================
   Symmetrical Fault & Symmetrical Component Visualizer
   ============================================================ */
var SymmetricalFaultSim = (function () {
  'use strict';
  var C = PET.Complex;

  function create(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = buildUI();
    var canvas = container.querySelector('#sf-canvas');
    var ctx = PET.setupCanvas(canvas, 560, 380);
    var infoDiv = container.querySelector('#sf-info');

    var Vpre = 1.0;
    var Xd_pp = 0.15, Xd_p = 0.30, Xd = 1.0;
    var Td_pp = 0.03, Td_p = 1.0;
    var XR = 15;
    var time = 0;
    var paused = false;

    bindSliders();
    var anim = PET.createAnimLoop(draw);
    anim.start();

    container.querySelector('#sf-pause').addEventListener('click', function () {
      paused = !paused;
      this.textContent = paused ? '▶ Play' : '⏸ Pause';
    });
    container.querySelector('#sf-reset').addEventListener('click', function () {
      time = 0; paused = false;
      container.querySelector('#sf-pause').textContent = '⏸ Pause';
    });

    function draw(dt) {
      if (!paused) time += dt;

      var w = 560, h = 380;
      ctx.clearRect(0, 0, w, h);
      PET.drawGrid(ctx, w, h, 25, 'rgba(38,48,70,0.25)');

      // Draw axes
      var padL = 60, padR = 20, padT = 30, padB = 50;
      var gw = w - padL - padR, gh = h - padT - padB;

      ctx.strokeStyle = 'rgba(144,164,174,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, h - padB); ctx.lineTo(w - padR, h - padB); ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#90a4ae'; ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Time (s)', w / 2, h - 10);
      ctx.save(); ctx.translate(15, h / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('Fault Current (pu)', 0, 0); ctx.restore();

      var tMax = 0.5;
      var Imax = Vpre / Xd_pp * 1.5;

      function tToX(t) { return padL + (t / tMax) * gw; }
      function iToY(i) { return padT + gh / 2 - (i / Imax) * (gh / 2); }

      // Time ticks
      ctx.fillStyle = '#607d8b'; ctx.font = '10px JetBrains Mono';
      for (var tick = 0; tick <= tMax; tick += 0.1) {
        var tx = tToX(tick);
        ctx.fillText(tick.toFixed(1), tx, h - padB + 15);
        ctx.strokeStyle = 'rgba(38,48,70,0.3)'; ctx.beginPath(); ctx.moveTo(tx, padT); ctx.lineTo(tx, h - padB); ctx.stroke();
      }

      // Compute envelopes and waveform
      var omega = 2 * Math.PI * 60; // 60 Hz
      var tau = XR / omega;

      // Draw envelopes
      function envelope(t) {
        var Ipp = Vpre / Xd_pp;
        var Ip = Vpre / Xd_p;
        var Iss = Vpre / Xd;
        return (Ipp - Ip) * Math.exp(-t / Td_pp) + (Ip - Iss) * Math.exp(-t / Td_p) + Iss;
      }

      // Upper envelope
      ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
      ctx.beginPath();
      for (var t1 = 0; t1 <= tMax; t1 += 0.001) {
        var env = envelope(t1);
        var x = tToX(t1), y = iToY(env);
        if (t1 === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower envelope
      ctx.beginPath();
      for (var t2 = 0; t2 <= tMax; t2 += 0.001) {
        var env2 = -envelope(t2);
        var x2 = tToX(t2), y2 = iToY(env2);
        if (t2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // DC offset envelope
      ctx.strokeStyle = '#ffca28'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (var t3 = 0; t3 <= tMax; t3 += 0.001) {
        var dc = (Vpre / Xd_pp) * Math.exp(-t3 / tau);
        var x3 = tToX(t3), y3 = iToY(dc);
        if (t3 === 0) ctx.moveTo(x3, y3); else ctx.lineTo(x3, y3);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Actual waveform (with DC offset)
      ctx.strokeStyle = '#40c4ff'; ctx.lineWidth = 2;
      var tDraw = Math.min(time, tMax);
      ctx.beginPath();
      for (var t4 = 0; t4 <= tDraw; t4 += 0.0002) {
        var envVal = envelope(t4);
        var dcVal = (Vpre / Xd_pp) * Math.exp(-t4 / tau);
        var i = envVal * Math.sin(omega * t4) + dcVal * Math.exp(-t4 / tau);
        var x4 = tToX(t4), y4 = iToY(i);
        if (t4 === 0) ctx.moveTo(x4, y4); else ctx.lineTo(x4, y4);
      }
      ctx.stroke();

      // Labels
      ctx.font = '11px JetBrains Mono';
      ctx.fillStyle = '#ff5252'; ctx.fillText('Envelope', w - 70, padT + 15);
      ctx.fillStyle = '#40c4ff'; ctx.fillText('i(t)', w - 70, padT + 30);
      ctx.fillStyle = '#ffca28'; ctx.fillText('DC offset', w - 70, padT + 45);

      // Subtransient / transient / steady labels
      ctx.fillStyle = '#b388ff'; ctx.font = '9px Inter';
      if (tMax > 0.05) {
        ctx.fillText('Sub-transient', tToX(0.01), padT + 15);
        ctx.fillText('Transient', tToX(0.15), padT + 15);
        ctx.fillText('Steady', tToX(0.4), padT + 15);
      }

      // Info
      var Ipp_val = Vpre / Xd_pp;
      var Ip_val = Vpre / Xd_p;
      var Iss_val = Vpre / Xd;
      var peakAsym = Ipp_val * (1 + Math.exp(-Math.PI / (omega * tau)));

      infoDiv.innerHTML =
        '<span style="color:#ff5252;">I" = ' + Ipp_val.toFixed(3) + ' pu</span> &nbsp; ' +
        '<span style="color:#ffca28;">I\' = ' + Ip_val.toFixed(3) + ' pu</span> &nbsp; ' +
        '<span style="color:#00e676;">I_ss = ' + Iss_val.toFixed(3) + ' pu</span> &nbsp; ' +
        '<span style="color:#40c4ff;">Peak Asym = ' + peakAsym.toFixed(3) + ' pu</span>';
    }

    function bindSliders() {
      function bind(id, setter) {
        var el = container.querySelector('#' + id);
        if (!el) return;
        el.addEventListener('input', function () {
          setter(parseFloat(this.value));
          var valEl = container.querySelector('#' + id + '-val');
          if (valEl) valEl.textContent = parseFloat(this.value).toFixed(2);
        });
      }
      bind('sf-xdpp', function (v) { Xd_pp = v; });
      bind('sf-xdp', function (v) { Xd_p = v; });
      bind('sf-xd', function (v) { Xd = v; });
      bind('sf-tdpp', function (v) { Td_pp = v; });
      bind('sf-tdp', function (v) { Td_p = v; });
      bind('sf-xr', function (v) { XR = v; });
    }

    function buildUI() {
      return '<div class="sim-body">' +
        '<div class="sim-canvas-wrap"><canvas id="sf-canvas" width="560" height="380"></canvas></div>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:0.8rem;">' +
        '<button class="btn" id="sf-pause">⏸ Pause</button>' +
        '<button class="btn" id="sf-reset">Reset</button>' +
        '</div>' +
        '<div class="sim-params">' +
        '<div class="sim-param"><label>X"d (pu)</label><div class="param-row"><input type="range" id="sf-xdpp" min="0.05" max="0.4" step="0.01" value="0.15"><span class="value-display" id="sf-xdpp-val">0.15</span></div></div>' +
        '<div class="sim-param"><label>X\'d (pu)</label><div class="param-row"><input type="range" id="sf-xdp" min="0.1" max="0.8" step="0.01" value="0.30"><span class="value-display" id="sf-xdp-val">0.30</span></div></div>' +
        '<div class="sim-param"><label>Xd (pu)</label><div class="param-row"><input type="range" id="sf-xd" min="0.5" max="2.5" step="0.1" value="1.00"><span class="value-display" id="sf-xd-val">1.00</span></div></div>' +
        '<div class="sim-param"><label>T"d (s)</label><div class="param-row"><input type="range" id="sf-tdpp" min="0.01" max="0.1" step="0.005" value="0.03"><span class="value-display" id="sf-tdpp-val">0.03</span></div></div>' +
        '<div class="sim-param"><label>T\'d (s)</label><div class="param-row"><input type="range" id="sf-tdp" min="0.3" max="3" step="0.1" value="1.00"><span class="value-display" id="sf-tdp-val">1.00</span></div></div>' +
        '<div class="sim-param"><label>X/R ratio</label><div class="param-row"><input type="range" id="sf-xr" min="2" max="40" step="1" value="15"><span class="value-display" id="sf-xr-val">15</span></div></div>' +
        '</div>' +
        '<div id="sf-info" style="margin-top:0.8rem;font-family:JetBrains Mono,monospace;font-size:0.85rem;"></div>' +
        '</div>';
    }
  }

  return { create: create };
})();
