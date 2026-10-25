// Los textos y las listas que comparten el celular y la computadora (decisión 47). Las dos
// interfaces tienen que decir lo mismo: lo que cambia es el largo. En la computadora el texto
// explica, casi como una ayuda; en el celular va resumido porque no entra más. Nunca pueden
// decir cosas distintas. Lo que es igual en las dos va una sola vez.
export type Texto = { largo: string; corto: string };
export const igual = (t: string): Texto => ({ largo: t, corto: t });
export const texto = (t: Texto, enCelular: boolean) => (enCelular ? t.corto : t.largo);
