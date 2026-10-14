import { QueryClient } from "@tanstack/react-query";

// Los datos que se le piden al servidor (ADR-018): una sola memoria para toda la aplicación,
// así dos pantallas que piden lo mismo comparten la respuesta y un cambio las refresca a las dos.
// - Sin reintentos y sin esperar a «estar en línea»: si no hay conexión, la pantalla lo dice enseguida.
// - Lo guardado se muestra al volver a la pantalla y se vuelve a pedir por detrás.
export const consultas = new QueryClient({
  defaultOptions: {
    queries: { retry: false, networkMode: "always", refetchOnWindowFocus: false },
    mutations: { retry: false, networkMode: "always" },
  },
});

