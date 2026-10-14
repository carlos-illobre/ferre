// Lo que el servidor responde sobre los clientes. Solo tipos: el cliente web los toma al
// compilar (ADR-018), así que acá no va código ni nombres de tablas.

// GET /clientes: los activos, por nombre, con su deuda (lo vendido a cuenta corriente,
// confirmado y sin pagar), que llega como texto.
export type Cliente = { id: string; nombre: string; telefono: string | null; cuenta_corriente: boolean; deuda: string };

// POST /clientes: sin nombre no se da de alta. Responde el cliente nuevo.
export type ClienteEntrada = { nombre?: string; telefono?: string; cuenta_corriente?: boolean };
