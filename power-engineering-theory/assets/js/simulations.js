/* ============================================================
   Shared Simulation Utilities
   Phasor drawing, per-unit helpers, complex math, matrix ops,
   Y-bus formation, canvas helpers, animation loop
   ============================================================ */
var PET = (function () {
  'use strict';

  /* =====================================================
     Complex Number Arithmetic
     ===================================================== */
  function Complex(re, im) {
    this.re = re || 0;
    this.im = im || 0;
  }

  Complex.fromPolar = function (mag, angleDeg) {
    var rad = angleDeg * Math.PI / 180;
    return new Complex(mag * Math.cos(rad), mag * Math.sin(rad));
  };

  Complex.prototype.mag = function () { return Math.sqrt(this.re * this.re + this.im * this.im); };
  Complex.prototype.angle = function () { return Math.atan2(this.im, this.re); };
  Complex.prototype.angleDeg = function () { return this.angle() * 180 / Math.PI; };
  Complex.prototype.conj = function () { return new Complex(this.re, -this.im); };

  Complex.prototype.add = function (b) { return new Complex(this.re + b.re, this.im + b.im); };
  Complex.prototype.sub = function (b) { return new Complex(this.re - b.re, this.im - b.im); };
  Complex.prototype.mul = function (b) {
    return new Complex(this.re * b.re - this.im * b.im, this.re * b.im + this.im * b.re);
  };
  Complex.prototype.div = function (b) {
    var d = b.re * b.re + b.im * b.im;
    if (d === 0) return new Complex(Infinity, Infinity);
    return new Complex((this.re * b.re + this.im * b.im) / d, (this.im * b.re - this.re * b.im) / d);
  };
  Complex.prototype.scale = function (s) { return new Complex(this.re * s, this.im * s); };
  Complex.prototype.neg = function () { return new Complex(-this.re, -this.im); };
  Complex.prototype.toString = function (decimals) {
    var d = decimals || 4;
    var sign = this.im >= 0 ? '+' : '-';
    return this.re.toFixed(d) + ' ' + sign + ' j' + Math.abs(this.im).toFixed(d);
  };
  Complex.prototype.toPolar = function (d) {
    d = d || 4;
    return this.mag().toFixed(d) + '∠' + this.angleDeg().toFixed(2) + '°';
  };

  /* =====================================================
     Matrix Operations (2D arrays of Complex)
     ===================================================== */
  function matCreate(n, m) {
    var M = [];
    for (var i = 0; i < n; i++) {
      M[i] = [];
      for (var j = 0; j < m; j++) M[i][j] = new Complex(0, 0);
    }
    return M;
  }

  function matClone(A) {
    var n = A.length, m = A[0].length;
    var B = matCreate(n, m);
    for (var i = 0; i < n; i++) for (var j = 0; j < m; j++) B[i][j] = new Complex(A[i][j].re, A[i][j].im);
    return B;
  }

  /* Gauss-Jordan inversion of a complex matrix */
  function matInverse(A) {
    var n = A.length;
    var aug = matCreate(n, 2 * n);
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) aug[i][j] = new Complex(A[i][j].re, A[i][j].im);
      aug[i][n + i] = new Complex(1, 0);
    }
    for (var col = 0; col < n; col++) {
      // Partial pivoting
      var maxMag = aug[col][col].mag(), maxRow = col;
      for (var r = col + 1; r < n; r++) {
        if (aug[r][col].mag() > maxMag) { maxMag = aug[r][col].mag(); maxRow = r; }
      }
      if (maxRow !== col) { var tmp = aug[col]; aug[col] = aug[maxRow]; aug[maxRow] = tmp; }
      var pivot = aug[col][col];
      if (pivot.mag() < 1e-12) return null; // singular
      for (var j2 = 0; j2 < 2 * n; j2++) aug[col][j2] = aug[col][j2].div(pivot);
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === col) continue;
        var factor = aug[r2][col];
        for (var j3 = 0; j3 < 2 * n; j3++) {
          aug[r2][j3] = aug[r2][j3].sub(factor.mul(aug[col][j3]));
        }
      }
    }
    var inv = matCreate(n, n);
    for (var i2 = 0; i2 < n; i2++) for (var j4 = 0; j4 < n; j4++) inv[i2][j4] = aug[i2][n + j4];
    return inv;
  }

  /* Real matrix inversion (Gauss-Jordan) for Jacobian */
  function realMatInverse(A) {
    var n = A.length;
    var aug = [];
    for (var i = 0; i < n; i++) {
      aug[i] = [];
      for (var j = 0; j < n; j++) aug[i][j] = A[i][j];
      for (var j2 = 0; j2 < n; j2++) aug[i][n + j2] = (i === j2) ? 1 : 0;
    }
    for (var col = 0; col < n; col++) {
      var maxVal = Math.abs(aug[col][col]), maxRow = col;
      for (var r = col + 1; r < n; r++) {
        if (Math.abs(aug[r][col]) > maxVal) { maxVal = Math.abs(aug[r][col]); maxRow = r; }
      }
      if (maxRow !== col) { var tmp = aug[col]; aug[col] = aug[maxRow]; aug[maxRow] = tmp; }
      var piv = aug[col][col];
      if (Math.abs(piv) < 1e-14) return null;
      for (var j3 = 0; j3 < 2 * n; j3++) aug[col][j3] /= piv;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === col) continue;
        var fac = aug[r2][col];
        for (var j4 = 0; j4 < 2 * n; j4++) aug[r2][j4] -= fac * aug[col][j4];
      }
    }
    var inv = [];
    for (var i2 = 0; i2 < n; i2++) {
      inv[i2] = [];
      for (var j5 = 0; j5 < n; j5++) inv[i2][j5] = aug[i2][n + j5];
    }
    return inv;
  }

  /* Solve Ax = b for real system using LU-style approach */
  function realSolve(A, b) {
    var Ainv = realMatInverse(A);
    if (!Ainv) return null;
    var n = b.length, x = [];
    for (var i = 0; i < n; i++) {
      x[i] = 0;
      for (var j = 0; j < n; j++) x[i] += Ainv[i][j] * b[j];
    }
    return x;
  }

  /* =====================================================
     Y-Bus Formation
     ===================================================== */
  /**
   * Build the bus admittance matrix.
   * @param {number} nBus - number of buses
   * @param {Array} branches - [{from, to, z: Complex, b_half: Complex (optional, shunt)}]
   * @returns {Complex[][]} Y-bus matrix
   */
  function buildYBus(nBus, branches) {
    var Y = matCreate(nBus, nBus);
    branches.forEach(function (br) {
      var i = br.from, j = br.to;
      var y = new Complex(1, 0).div(br.z); // series admittance
      var b_half = br.b_half || new Complex(0, 0);
      Y[i][i] = Y[i][i].add(y).add(b_half);
      Y[j][j] = Y[j][j].add(y).add(b_half);
      Y[i][j] = Y[i][j].sub(y);
      Y[j][i] = Y[j][i].sub(y);
    });
    return Y;
  }

  /* =====================================================
     Per-Unit Helpers
     ===================================================== */
  function perUnitBaseConversion(Zold, kVold, MVAold, kVnew, MVAnew) {
    return Zold * (kVold * kVold / MVAold) / (kVnew * kVnew / MVAnew);
  }

  function calcBaseImpedance(kV, MVA) {
    return (kV * kV) / MVA;
  }

  function calcBaseCurrent(MVA, kV) {
    return (MVA * 1e3) / (Math.sqrt(3) * kV);
  }

  /* =====================================================
     Phasor Drawing on Canvas
     ===================================================== */
  function drawPhasor(ctx, cx, cy, mag, angleRad, color, label, scale) {
    scale = scale || 1;
    var len = mag * scale;
    var ex = cx + len * Math.cos(angleRad);
    var ey = cy - len * Math.sin(angleRad);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Arrowhead
    var headLen = 10;
    var angle = Math.atan2(cy - ey, ex - cx);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle - 0.3), ey + headLen * Math.sin(angle - 0.3));
    ctx.lineTo(ex - headLen * Math.cos(angle + 0.3), ey + headLen * Math.sin(angle + 0.3));
    ctx.closePath();
    ctx.fill();

    // Label
    if (label) {
      ctx.font = '600 13px "JetBrains Mono", monospace';
      var lx = ex + 10 * Math.cos(angleRad);
      var ly = ey - 10 * Math.sin(angleRad);
      ctx.fillText(label, lx, ly);
    }

    ctx.restore();
  }

  function drawGrid(ctx, w, h, spacing, color) {
    ctx.save();
    ctx.strokeStyle = color || 'rgba(38,48,70,0.5)';
    ctx.lineWidth = 0.5;
    for (var x = 0; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = 0; y < h; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawAxes(ctx, cx, cy, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color || 'rgba(144,164,174,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.restore();
  }

  /* =====================================================
     Canvas HiDPI Setup
     ===================================================== */
  function setupCanvas(canvas, width, height) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  /* =====================================================
     Animation Loop Helper
     ===================================================== */
  function createAnimLoop(callback) {
    var running = true;
    var lastTime = 0;
    var animId;

    function loop(timestamp) {
      if (!running) return;
      var dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
      dt = Math.min(dt, 0.1); // cap to avoid spiral of death
      lastTime = timestamp;
      callback(dt, timestamp);
      animId = requestAnimationFrame(loop);
    }

    return {
      start: function () { running = true; lastTime = 0; animId = requestAnimationFrame(loop); },
      stop: function () { running = false; cancelAnimationFrame(animId); },
      toggle: function () { if (running) this.stop(); else this.start(); return running; },
      isRunning: function () { return running; }
    };
  }

  /* =====================================================
     Color Helpers
     ===================================================== */
  var colors = {
    green: '#00e676',
    blue: '#40c4ff',
    amber: '#ffca28',
    red: '#ff5252',
    purple: '#b388ff',
    white: '#eceff1',
    muted: '#607d8b',
    gridLine: 'rgba(38,48,70,0.5)',
    positive: '#00e676',
    negative: '#ff5252',
    zero: '#ffca28'
  };

  /* =====================================================
     Utility Functions
     ===================================================== */
  function degToRad(d) { return d * Math.PI / 180; }
  function radToDeg(r) { return r * 180 / Math.PI; }
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function formatNumber(n, decimals) {
    decimals = decimals === undefined ? 4 : decimals;
    return Number(n).toFixed(decimals);
  }

  /* =====================================================
     Sequence Component Transform (for fault analysis)
     ===================================================== */
  var a_op = Complex.fromPolar(1, 120); // operator a = 1∠120°
  var a2_op = Complex.fromPolar(1, 240); // a² = 1∠240°

  /* [A] matrix: transforms sequence → phase */
  function seqToPhase(I0, I1, I2) {
    var Ia = I0.add(I1).add(I2);
    var Ib = I0.add(a2_op.mul(I1)).add(a_op.mul(I2));
    var Ic = I0.add(a_op.mul(I1)).add(a2_op.mul(I2));
    return { Ia: Ia, Ib: Ib, Ic: Ic };
  }

  /* Inverse [A]: phase → sequence */
  function phaseToSeq(Ia, Ib, Ic) {
    var one3 = new Complex(1 / 3, 0);
    var I0 = Ia.add(Ib).add(Ic).mul(one3);
    var I1 = Ia.add(a_op.mul(Ib)).add(a2_op.mul(Ic)).mul(one3);
    var I2 = Ia.add(a2_op.mul(Ib)).add(a_op.mul(Ic)).mul(one3);
    return { I0: I0, I1: I1, I2: I2 };
  }

  /* =====================================================
     Public API
     ===================================================== */
  return {
    Complex: Complex,
    matCreate: matCreate,
    matClone: matClone,
    matInverse: matInverse,
    realMatInverse: realMatInverse,
    realSolve: realSolve,
    buildYBus: buildYBus,
    perUnitBaseConversion: perUnitBaseConversion,
    calcBaseImpedance: calcBaseImpedance,
    calcBaseCurrent: calcBaseCurrent,
    drawPhasor: drawPhasor,
    drawGrid: drawGrid,
    drawAxes: drawAxes,
    setupCanvas: setupCanvas,
    createAnimLoop: createAnimLoop,
    colors: colors,
    degToRad: degToRad,
    radToDeg: radToDeg,
    clamp: clamp,
    lerp: lerp,
    formatNumber: formatNumber,
    a_op: a_op,
    a2_op: a2_op,
    seqToPhase: seqToPhase,
    phaseToSeq: phaseToSeq
  };
})();
