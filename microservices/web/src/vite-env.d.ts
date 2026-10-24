/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AMBIENTE: string;
  readonly VITE_VERSION: string;
}

// Lo mínimo del script de Google Identity Services que usamos.
interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: "popup" }): void;
        renderButton(el: HTMLElement, opciones: Record<string, string | number>): void;
      };
    };
  };
}
