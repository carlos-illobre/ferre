import { PERMISOS, type Permiso } from "../principal/permisos";

// La sesión con la que corren las pruebas de pantallas. Por defecto la persona puede todo;
// `conPermisos` la deja solo con los que se le pasan, para probar qué se ve y qué no (RF-72).
const TODOS = Object.keys(PERMISOS) as Permiso[];
export const usuarioDePrueba = { id: "u1", email: "a@b", nombre: "Ana", roles: ["Gerente"], permisos: [...TODOS] as string[] };
export const conPermisos = (...claves: Permiso[]) => { usuarioDePrueba.permisos = claves; };
export const conTodosLosPermisos = () => { usuarioDePrueba.permisos = [...TODOS]; };
