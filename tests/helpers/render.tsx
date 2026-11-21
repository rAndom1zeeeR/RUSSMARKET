import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";

export function createTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

export function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** Рендерит компонент внутри свежего QueryClient (без повторов запросов). */
export function renderWithClient(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const client = createTestClient();
  return { client, ...render(ui, { wrapper: createWrapper(client), ...options }) };
}

const SIZE_PROPERTIES = ["clientHeight", "clientWidth", "offsetHeight", "offsetWidth"] as const;

/**
 * В jsdom у элементов нулевой размер, поэтому TanStack Virtual (читает clientWidth/clientHeight
 * контейнера и offsetHeight строк) не рисует ничего. Подменяем размеры на время теста.
 * Возвращает функцию отката.
 */
export function stubLayoutSize(width: number, height: number): () => void {
  const originals = SIZE_PROPERTIES.map(
    property => [property, Object.getOwnPropertyDescriptor(HTMLElement.prototype, property)] as const
  );
  const elementOriginals = ["clientHeight", "clientWidth"].map(
    property => [property, Object.getOwnPropertyDescriptor(Element.prototype, property)] as const
  );

  for (const property of ["clientHeight", "offsetHeight"]) {
    Object.defineProperty(HTMLElement.prototype, property, { configurable: true, get: () => height });
  }
  for (const property of ["clientWidth", "offsetWidth"]) {
    Object.defineProperty(HTMLElement.prototype, property, { configurable: true, get: () => width });
  }
  for (const property of ["clientHeight", "clientWidth"]) {
    Object.defineProperty(Element.prototype, property, {
      configurable: true,
      get: () => (property === "clientHeight" ? height : width),
    });
  }

  return () => {
    for (const [property, descriptor] of originals) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, property, descriptor);
      else Reflect.deleteProperty(HTMLElement.prototype, property);
    }
    for (const [property, descriptor] of elementOriginals) {
      if (descriptor) Object.defineProperty(Element.prototype, property, descriptor);
    }
  };
}
