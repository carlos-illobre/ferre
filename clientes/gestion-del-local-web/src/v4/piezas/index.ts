// Las piezas compartidas. Las pantallas importan todo desde acá: `import { Boton, Pagina } from "../piezas";`
export { Icono, NOMBRES_DE_ICONOS, type NombreDeIcono } from "./Icono";
export { Boton, Pastilla, Tarjeta, Lista, Renglon, Iniciales, Figura, TituloDeSeccion, clases, tonoDe, type Tono } from "./basicas";
export { Campo, Buscador, Cantidad, Segmentos, Margenes, leerPesos } from "./campos";
export { Hoja, Confirmar, Explicado, Escaner, Qr } from "./hojas";
export { Aviso, AvisoFlotante, AvisosFlotantes, avisar, cerrarAviso, DURACION_DEL_AVISO, Vacio, Cargando, ErrorDeCarga, Exito } from "./estados";
export { FotoDeProducto } from "./Foto";
export { Pagina, Encabezado, BarraDeAccion } from "./Pagina";
