import type { ReactNode } from "react";
import { hayCamara } from "../../../plataforma/camara";
import { irA } from "../rutas";
import { Icono, Lista, type NombreDeIcono } from "../componentes/base";
import { destinoDeMas, type MenuDelCelular } from "./menu-del-celular";
import type { VincularDesdeAca } from "./useVincularDesdeAca";

function OpcionDeMas({ icono, nombre, detalle, alTocar, testId, testIdDelDetalle }: { icono: NombreDeIcono; nombre: string; detalle: ReactNode; alTocar: () => void; testId: string; testIdDelDetalle?: string }) {
  return (
    <button type="button" className="fila con-foto" onClick={alTocar} data-testid={testId}>
      <span className="miniatura mas-icono"><Icono nombre={icono} tam={22} /></span>
      <span className="nombre">{nombre}</span>
      <Icono nombre="derecha" tam={18} grosor={2.4} />
      <span className="detalle" data-testid={testIdDelDetalle}>{detalle}</span>
    </button>
  );
}

// Más: vincular con la computadora (si hay cámara y no está vinculado), lo que no pasó a Negocio y Salir.
export function MenuDeMas({ m, vincular, emparejado, nombre, salir }: { m: MenuDelCelular; vincular: VincularDesdeAca; emparejado: boolean; nombre: string; salir: () => void }) {
  return (
    <main className="contenido" data-testid="mas">
      <div className="encabezado"><h1 className="titulo">Más</h1></div>
      {!emparejado && hayCamara() && (
        <Lista>
          <OpcionDeMas icono="escanear" nombre="Vincular con la computadora" detalle="Escaneá el código que muestra la computadora, sin salir de acá" alTocar={vincular.escanear} testId="vincular-con-la-compu" />
          {vincular.errorDeCodigo && <p className="aviso-suave" role="alert" data-testid="codigo-no-reconocido">{vincular.errorDeCodigo}</p>}
        </Lista>
      )}
      <Lista>
        {m.deMas.map((d) => <OpcionDeMas key={d.parte} icono={d.icono} nombre={d.nombre} detalle={d.detalle} alTocar={() => irA(destinoDeMas(d, m.primeras))} testId={`mas-${d.parte}`} />)}
      </Lista>
      <Lista>
        <OpcionDeMas icono="salir" nombre="Salir" detalle={`Entraste como ${nombre}`} alTocar={salir} testId="salir" testIdDelDetalle="usuario" />
      </Lista>
    </main>
  );
}
