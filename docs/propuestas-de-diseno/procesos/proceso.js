/* El proceso de ejemplo que comparten todas las variantes: «Venta en el mostrador». */
window.VENTA = {
  carriles: [
    { id: 'cli', nombre: 'Cliente', icono: 'user-round' },
    { id: 'ven', nombre: 'Vendedor', icono: 'user' },
    { id: 'sis', nombre: 'Ferrebress', icono: 'monitor' }
  ],
  pasos: [
    { id: 'ini', tipo: 'inicio', nombre: 'Llega un cliente', carril: 'cli' },
    { id: 'pide', tipo: 'persona', nombre: 'Pide lo que necesita', carril: 'cli' },
    { id: 'busca', tipo: 'persona', nombre: 'Busca o escanea el producto', carril: 'ven' },
    { id: 'gp', tipo: 'decision', nombre: '¿Tiene precio?', carril: 'ven' },
    { id: 'margen', tipo: 'persona', nombre: 'Elige el margen', carril: 'ven' },
    { id: 'suma', tipo: 'sistema', nombre: 'Suma el producto a la venta', carril: 'sis' },
    { id: 'gm', tipo: 'decision', nombre: '¿Lleva algo más?', carril: 'sis' },
    { id: 'cobra', tipo: 'persona', nombre: 'Cobra en el medio que elige', carril: 'ven' },
    { id: 'espera', tipo: 'espera', nombre: 'Espera que acredite la transferencia', carril: 'sis' },
    { id: 'reg', tipo: 'sistema', nombre: 'Registra la venta y baja el stock', carril: 'sis' },
    { id: 'fin', tipo: 'fin', nombre: 'Venta registrada', carril: 'sis' },
    { id: 'nota', tipo: 'nota', nombre: 'Cuenta corriente: margen 50 %', carril: 'cli', ancho: 240 }
  ],
  flechas: [
    { de: 'ini', a: 'pide' },
    { de: 'pide', a: 'busca', s: 'r', e: 't' },
    { de: 'busca', a: 'gp' },
    { de: 'gp', a: 'margen', et: 'No' },
    { de: 'gp', a: 'suma', s: 'b', e: 'l', et: 'Sí' },
    { de: 'margen', a: 'suma', s: 'b', e: 't' },
    { de: 'suma', a: 'gm' },
    { de: 'gm', a: 'cobra', s: 'r', e: 'b', et: 'No' },
    { de: 'cobra', a: 'reg', s: 'r', e: 't' },
    { de: 'espera', a: 'reg', s: 'r', e: 'b' },
    { de: 'reg', a: 'fin' }
  ],
  asociaciones: [{ de: 'nota', a: 'margen' }]
};
/* Datos de cada paso (lo que muestra el panel) */
window.DATOS = {
  margen: { pantalla: 'Vender', como: 'Si el producto no tiene precio, tocá 300, 200, 100, 50 o 25 % sobre el costo, o escribí el precio a mano.', sigue: 'Suma el producto a la venta' },
  cobra: { pantalla: 'Vender', como: 'F5 efectivo, F6 Mercado Pago, F7 tarjeta, F8 cuenta corriente. Después, F2.', sigue: 'Registra la venta y baja el stock' }
};
window.PANTALLAS_ICONO = { Vender: 'shopping-cart', Stock: 'package', Productos: 'tags', Compras: 'truck' };
