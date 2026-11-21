type Listener = () => void;

interface Registered {
  query: string;
  listener: Listener;
}

const registered = new Set<Registered>();
let width = 1280;

function matches(query: string): boolean {
  const match = /\(min-width:\s*(\d+)px\)/.exec(query);
  return match?.[1] ? width >= Number(match[1]) : false;
}

/** Подменяет `window.matchMedia`: поддерживает `(min-width: Npx)` и реагирует на смену ширины. */
export function installMatchMedia(): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const list = {
      media: query,
      get matches() {
        return matches(query);
      },
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => registered.add({ query, listener }),
      removeEventListener: (_type: string, listener: Listener) => {
        for (const entry of registered) if (entry.listener === listener) registered.delete(entry);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    };
    // Подменяем только используемую часть интерфейса.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return list as unknown as MediaQueryList;
  };
}

/** Меняет «ширину окна» и уведомляет подписчиков matchMedia. */
export function setViewportWidth(next: number): void {
  width = next;
  for (const entry of registered) entry.listener();
}
