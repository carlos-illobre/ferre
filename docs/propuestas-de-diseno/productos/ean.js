/* Dibuja un código EAN-13 de verdad en <svg class="ean" data-ean="7897065211580">. */
(function () {
  var L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
  var G = L.map(function (c) { var r = c.split("").map(function (b) { return b === "1" ? "0" : "1"; }).join(""); return r.split("").reverse().join(""); });
  var R = L.map(function (c) { return c.split("").map(function (b) { return b === "1" ? "0" : "1"; }).join(""); });
  var P = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];
  function bits(code) {
    var d = code.split("").map(Number), p = P[d[0]], s = "101";
    for (var i = 1; i <= 6; i++) s += (p[i - 1] === "L" ? L : G)[d[i]];
    s += "01010";
    for (i = 7; i <= 12; i++) s += R[d[i]];
    return s + "101";
  }
  function pintar() {
    document.querySelectorAll("svg.ean").forEach(function (svg) {
      var b = bits(svg.getAttribute("data-ean")), h = 100, out = "";
      for (var i = 0; i < b.length; i++) if (b[i] === "1") {
        var largo = i < 3 || (i >= 45 && i < 50) || i >= 92;
        out += '<rect x="' + i + '" y="0" width="1" height="' + (largo ? h : h - 10) + '"/>';
      }
      svg.setAttribute("viewBox", "0 0 95 " + h);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.innerHTML = out;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pintar); else pintar();
})();
