/* Listas de precios: datos ficticios de las maquetas (los mismos en las seis).
   Cada fila: f foto, n nombre, d marca · código, a costo antes, c costo nuevo, m margen (null: sin
   precio), u ubicación, t tipo (cambia, nuevo, noesta, saltea). Las cuentas cierran:
   costo = lista − 25 % − 5 %; precio = costo × (1 + margen) × 1,21, redondeado hacia arriba a $1.000. */
(function () {
  function F(f, n, d, a, c, m, u, extra) { var o = { f: f, n: n, d: d, a: a, c: c, m: m, u: u, t: "cambia" }; for (var k in extra) o[k] = extra[k]; return o; }
  function N(f, n, d, c, u) { return { f: f, n: n, d: d, a: null, c: c, m: null, u: u, t: "nuevo" }; }
  function X(f, n, d, a, que, clase) { return { f: f, n: n, d: d, a: a, c: null, m: null, t: "noesta", que: que, clase: clase }; }
  function S(fila, texto, motivo) { return { n: "Fila " + fila + " · " + texto, d: "", t: "saltea", motivo: motivo }; }

  var LISTAS = {
    bulonera: {
      prov: "Bulonera Centro", fecha: "17/10/2026", corta: "17/10", icono: "mail",
      archivo: "bulonera-centro-octubre.xlsx", llego: "llegó por correo hoy 08:12", hora: "08:12",
      leidos: 7096, cambian: 876, pc: "+8,4 %", nuevos: 4, sin: 6216, noestan: 12, salteadas: 6, subas: 23, precios: 641, igual: 235,
      aviso: true, contado: 5,
      familias: [["Tornillería y bulones", 60, "+12,1 %", 212], ["Fijaciones y tarugos", 44, "+8,9 %", 171], ["Herramientas de mano", 31, "+6,3 %", 148], ["Electricidad", -9, "−1,8 %", 46]],
      filas: {
        cambian: [
          F("tornillos", "Tornillo autoperforante T2 8 × 1\" × 100", "Bulonera · TA8-1", 5100, 6050, 50, "A-01-04"),
          F("mecha", "Mecha acero rápido HSS 8 mm", "Ezeta · ME080", 2290, 2479.5, 100, "B-03-12"),
          F("clavos", "Clavos punta París 2\" por kilo", "Acindar · CP2-KG", 2640, 2900, 100, "A-02-01"),
          F("tarugos", "Tarugos nylon S8 con tope × 100", "Fischer · TS8-100", 3820, 4150, null, "B-01-06"),
          F("lampara", "Lámpara LED 9 W luz fría E27", "Philips · LED9F", 1290, 1240, 150, "D-02-03"),
          F("llave-combinada", "Llave combinada 13 mm", "Bahco · LLC13", 6900, 7380, 50, "C-04-08")
        ],
        subas: [
          F("tornillos", "Tornillo autoperforante T2 8 × 1\" × 100", "Bulonera · TA8-1", 5100, 6050, 50, "A-01-04"),
          F("tornillos", "Varilla roscada zincada 3/8 × 1 m", "Bulonera · VR38-1", 2253, 2640, 100, "A-03-02"),
          F("tornillos", "Arandela grower M8 × 100", "Bulonera · AG8-100", 1069, 1240, 100, "A-01-09"),
          F("tornillos", "Tuerca hexagonal M10 × 100", "Bulonera · TH10-100", 3410, 3940, 100, "A-01-11"),
          F("clavos", "Clavos espiralados 2 ½\" por kilo", "Acindar · CE25-KG", 3020, 3480, 100, "A-02-03")
        ],
        nuevos: [
          N("puntas", "Puntas Torx T25 × 50 mm × 2", "Bremen · PT25-2", 1920, "B-04-02"),
          N("tornillos", "Bulón hexagonal 1/4 × 2\" × 50", "Bulonera · BH14-2", 4380, "A-01-15"),
          N("cinta-metrica", "Cinta métrica 5 m × 19 mm", "Stanley · 30-497", 5130, "C-01-03"),
          N("pinza", "Pinza universal 8\" aislada", "Bremen · PU8A", 7410, "C-02-05")
        ],
        noestan: [
          X("tornillos", "Tuerca mariposa M6 × 100", "Bulonera · TM6-100", 2950, "8 un. en stock", "urgente"),
          X("tarugos", "Taco Fischer SX 6 × 100", "Fischer · SX6-100", 2310, "Sigue con Distribuidora Oeste", "logro"),
          X("tornillos", "Abrazadera sinfín 16-25 mm × 10", "Bulonera · AS1625", 1880, "Sin stock", ""),
          X("tornillos", "Remache pop 4 × 10 mm × 100", "Bulonera · RP410", 2140, "Sin stock", ""),
          X("clavos", "Grampa para alambre 1\" por kilo", "Acindar · GA1-KG", 3120, "Sin stock", "")
        ],
        salteadas: [
          S("10", "TUERCA MARIPOSA M6 X100", "Dice «CONSULTAR» en el precio"),
          S("233", "sin descripción", "No tiene código"),
          S("1.204", "ESPARRAGO 1/2 X 1M", "El precio es 0"),
          S("3.871", "TA8-1", "Código repetido"),
          S("5.002", "BROCA SDS 10X210", "Precio «12.5OO» con letras"),
          S("6.950", "TOTAL HOJA 3", "Es una fila de totales")
        ]
      }
    },
    sur: {
      prov: "Ferretera del Sur", fecha: "18/10/2026", corta: "18/10", icono: "globe",
      archivo: "ferretera-del-sur-1810.xlsx", llego: "bajada de su portal anoche 23:40", hora: "ayer",
      leidos: 3412, cambian: 214, pc: "+5,2 %", nuevos: 2, sin: 3190, noestan: 3, salteadas: 3, subas: 4, precios: 158, igual: 56,
      aviso: false, contado: 5,
      familias: [["Herramientas de mano", 52, "+6,8 %", 88], ["Pinturería", 34, "+4,9 %", 41], ["Medición", 20, "+5,3 %", 29]],
      filas: {
        cambian: [
          F("llave-combinada", "Llave combinada 13 mm", "Bahco · LLC13", 6900, 7380, 50, "C-04-08"),
          F("pinza", "Pinza universal 8\" aislada", "Bremen · PU8A", 6480, 6950, 50, "C-02-05"),
          F("cinta-metrica", "Cinta métrica 5 m × 19 mm", "Stanley · 30-497", 4950, 5210, 50, "C-01-03"),
          F("martillo", "Martillo galponero 27 mm mango de fibra", "Bremen · MG27", 8100, 8420, 50, "C-03-01"),
          F("pintura", "Látex interior blanco mate 4 l", "Alba · LIB4", 14200, 14900, 40, "E-01-02")
        ],
        subas: [
          F("pinza", "Pinza de punta 6\" aislada", "Bremen · PP6A", 5200, 6100, 50, "C-02-06"),
          F("martillo", "Maza de goma 450 g", "Bremen · MZ450", 4300, 5010, 50, "C-03-04")
        ],
        nuevos: [
          N("pintura", "Esmalte sintético negro brillante 1 l", "Alba · ESN1", 6820, "E-02-04"),
          N("cinta-metrica", "Cinta métrica 8 m × 25 mm", "Stanley · 30-456", 7940, "C-01-04")
        ],
        noestan: [
          X("martillo", "Martillo carpintero 16 oz", "Bremen · MC16", 7400, "3 un. en stock", "urgente"),
          X("pinza", "Pinza pelacables 7\"", "Bremen · PPC7", 5600, "Sin stock", "")
        ],
        salteadas: [
          S("4", "LISTA PORTAL · HOJA 1", "Es el encabezado del portal"),
          S("1.880", "PINCEL Nº 20", "El precio es 0"),
          S("3.402", "sin descripción", "No tiene código")
        ]
      }
    },
    nueva: {
      prov: "Herrajes Avellaneda", fecha: "19/10/2026", corta: "19/10", icono: "file-up",
      archivo: "herrajes-avellaneda-oct.xlsx", llego: "la subiste recién", hora: "recién",
      leidos: 1842, cambian: 97, pc: "+3,4 %", nuevos: 1, sin: 1733, noestan: 9, salteadas: 2, subas: 0, precios: 61, igual: 36,
      aviso: false, contado: 5,
      familias: [["Tornillería", 38, "+3,1 %", 41], ["Fijaciones", 26, "+3,9 %", 12], ["Puntas y mechas", 18, "+4,9 %", 8]],
      filas: {
        cambian: [
          F("tornillos", "Tornillo para madera 6 × 1 ½\" × 100", "Herrajes Av. · TM6-15", 2150, 2210, 100, "A-01-07"),
          F("tarugos", "Tarugo nylon S6 × 100", "Fischer · TS6-100", 2400, 2560, 100, "B-01-05"),
          F("puntas", "Puntas Phillips PH2 × 50 mm × 2", "Bremen · PH2-50", 1620, 1700, 100, "B-04-01"),
          F("clavos", "Clavos cabeza plana 1 ½\" por kilo", "Acindar · CC15-KG", 2380, 2450, 100, "A-02-02")
        ],
        subas: [],
        nuevos: [N("tornillos", "Bisagra libro 3\" zincada × 2", "Herrajes Av. · BL3Z", 2860, "D-05-01")],
        noestan: [
          X("tornillos", "Pasador de puerta 4\" zincado", "Herrajes Av. · PP4Z", 1920, "Sin stock", ""),
          X("tornillos", "Cerrojo de seguridad 60 mm", "Herrajes Av. · CS60", 8700, "2 un. en stock", "urgente")
        ],
        salteadas: [S("12", "PRECIOS SUJETOS A CAMBIO", "Es una nota"), S("1.901", "sin descripción", "No tiene código")]
      }
    }
  };

  // Lo que queda para remarcar después de aplicar Bulonera Centro, en el orden de los pasillos.
  var REMARCAR = [
    ["mecha", "Mecha acero rápido HSS 8 mm", "Ezeta · ME080", "B-03-12", 6000, 7000, "+8,3 %", 14],
    ["tarugos", "Tarugos nylon S8 con tope × 100", "Fischer · TS8-100", "B-03-14", 9000, 10000, "+8,6 %", 22],
    ["puntas", "Puntas Phillips PH2 × 50 mm × 2", "Bremen · PH2-50", "B-04-01", 4000, 5000, "+4,9 %", 31],
    ["tornillos", "Tornillo fix 4 × 40 mm × 100", "Bulonera · TF440", "B-04-06", 5000, 6000, "+11,2 %", 9],
    ["mecha", "Mecha para hormigón 6 mm", "Ezeta · MH060", "B-05-02", 3000, 4000, "+9,1 %", 18],
    ["tarugos", "Tarugo nylon S10 × 50", "Fischer · TS10-50", "B-05-09", 6000, 7000, "+8,9 %", 12],
    ["llave-combinada", "Llave combinada 10 mm", "Bahco · LLC10", "B-06-03", 11000, 12000, "+6,4 %", 5],
    ["clavos", "Clavos punta París 1\" por kilo", "Acindar · CP1-KG", "B-06-11", 7000, 8000, "+9,8 %", 26]
  ];

  // Para la tabla y la explicación: lista = costo ÷ (0,75 × (1 − contado)).
  function lista(fila, contado) { return fila.c / (0.75 * (1 - (contado || 5) / 100)); }

  // Lo que hay que remarcar al aplicar la lista k: [foto, nombre, detalle, ubicación, decía, ahora], por pasillo.
  function precio(c, m) { return Math.ceil(c * (1 + m / 100) * 1.21 / 1000) * 1000; }
  function remarcarDe(k) {
    var vistas = {}, out = [];
    ["cambian", "subas"].forEach(function (f) {
      LISTAS[k].filas[f].forEach(function (r) {
        if (r.m == null || vistas[r.n]) return;
        var pa = precio(r.a, r.m), pn = precio(r.c, r.m);
        if (pa === pn) return;
        vistas[r.n] = 1; out.push([r.f, r.n, r.d, r.u, pa, pn]);
      });
    });
    if (k === "bulonera") REMARCAR.forEach(function (r) { if (!vistas[r[1]]) { vistas[r[1]] = 1; out.push(r.slice(0, 6)); } });
    return out.sort(function (a, b) { return a[3] < b[3] ? -1 : 1; });
  }
  var PASILLOS = [["A", 202], ["B", 188], ["C", 141], ["D", 77], ["E", 33]];

  window.DATOS = { listas: LISTAS, remarcar: REMARCAR, lista: lista, remarcarDe: remarcarDe, pasillos: PASILLOS };
})();
