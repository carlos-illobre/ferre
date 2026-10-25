import type { ReactNode } from "react";
import type { Disponibilidad } from "../../../negocio/conexion";
import { Icono, Marca } from "../base/ui";
import { partirEnDos, QUE_HACE, SELLOS, TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";
import { irA } from "../base/rutas";
// Las arma tests/capturas/entrada-compu.py con las capas de Carlos y una captura real de Vender.
import fondoDeLaEntrada from "../base/imagenes/entrar-fondo.jpg";
import celularVendiendo from "../base/imagenes/entrar-celular.png";

// La entrada de la computadora (decisión 93): copia la imagen de referencia de Carlos, armada con
// sus capas. El verde con la marca a la izquierda; en el medio, la foto del local entre dos bordes
// curvos, con un celular que muestra una venta (una captura real de Vender); a la derecha, la
// tarjeta para entrar. En el celular la entrada es otra y no cambia.
export function MarcoDeEntradaConCelular({ conexion, children }: { conexion: Disponibilidad; children: ReactNode }) {
  return (
    <main className="entrar-cc" data-testid="entrar">
      <div className="entrar-cc-escena">
        <div className="entrar-cc-fondo" style={{ backgroundImage: `url(${fondoDeLaEntrada})` }} aria-hidden="true" />
        <LaMarca />
        <img className="entrar-cc-celular" src={celularVendiendo} alt="" aria-hidden="true" />
        {/* Esta computadora y si llega al servidor (decisión 118): sin servidor no se puede entrar. */}
        <p className="entrar-cc-estado">
          <span><Icono nombre="computadora" tam={16} />{TEXTOS_DE_ENTRADA.estaComputadora}</span>
          <span className={`entrar-cc-conexion ${conexion}`} role="status" data-testid="entrar-conexion" data-estado={conexion}>{TEXTOS_DE_ENTRADA.conexion[conexion]}</span>
        </p>
        <div className="entrar-cc-derecha">
          <section className="entrar-cc-tarjeta">
            {children}
            <p className="entrar-cc-pie"><span><Icono nombre="candado" tam={18} />{TEXTOS_DE_ENTRADA.protegidos}</span><span className="raya" aria-hidden="true" /><img src={`${import.meta.env.BASE_URL}logotipo-ferrebress.png`} alt="Ferrebress" /></p>
          </section>
          <ul className="entrar-cc-sellos" data-testid="sellos">
            {SELLOS.map((s) => <li key={s.icono}><Icono nombre={s.icono} tam={26} grosor={1.7} /><span>{s.renglones[0]}<br />{s.renglones[1]}</span></li>)}
          </ul>
        </div>
      </div>
    </main>
  );
}

function LaMarca() {
  return (
    <section className="entrar-cc-marca">
      <Marca tam={64} />
      <p className="entrar-cc-antetitulo">{TEXTOS_DE_ENTRADA.antetitulo}</p>
      <h1>Precios al día,<br />ventas y stock<br /><em>de la ferretería.</em></h1>
      <p className="entrar-cc-bajada">{TEXTOS_DE_ENTRADA.bajada}</p>
      <ul className="entrar-cc-puntos">
        {QUE_HACE.map((q) => { const [a, b] = partirEnDos(q.texto); return <li key={q.icono}><span><Icono nombre={q.icono} tam={30} /></span><span className="texto">{a}<br />{b}</span></li>; })}
      </ul>
      {/* Abre el manual de uso, en la misma pestaña (RF-97). */}
      <button type="button" className="entrar-cc-tutorial" onClick={() => irA("manual")} data-testid="ver-tutorial"><Icono nombre="reproducir" tam={22} />{TEXTOS_DE_ENTRADA.tutorial}</button>
    </section>
  );
}
