// Navegar sin recargar: los links internos y el botón atrás.

export function navegar(ruta: string): void {
  if (ruta === location.pathname) return;
  history.pushState(null, "", ruta);
  dispatchEvent(new PopStateEvent("popstate"));
}

export function escucharNavegacion(alCambiar: () => void): void {
  addEventListener("popstate", alCambiar);
  document.addEventListener("click", (evento) => {
    if (evento.defaultPrevented || evento.button !== 0) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    const enlace = (evento.target as Element | null)?.closest("a");
    if (!enlace || enlace.target || enlace.hasAttribute("download")) return;
    const destino = new URL(enlace.href);
    if (destino.origin !== location.origin) return;
    evento.preventDefault();
    navegar(destino.pathname);
  });
}
