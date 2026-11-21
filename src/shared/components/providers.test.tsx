import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

vi.mock("sonner", () => ({ Toaster: () => <div data-testid="toaster" />, toast: {} }));

function Probe() {
  const client = useQueryClient();
  const defaults = client.getDefaultOptions().queries;
  return (
    <p data-testid="probe">
      {String(defaults?.staleTime)}|{String(defaults?.refetchOnWindowFocus)}|{String(defaults?.retry)}
    </p>
  );
}

describe("Providers", () => {
  it("рендерит children и тосты", () => {
    render(
      <Providers>
        <p>внутри</p>
      </Providers>
    );
    expect(screen.getByText("внутри")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("даёт QueryClient с настройками: кэш 30 с, без рефетча по фокусу, один повтор", () => {
    render(
      <Providers>
        <Probe />
      </Providers>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("30000|false|1");
  });

  it("не пересоздаёт QueryClient при повторном рендере", () => {
    const clients: unknown[] = [];
    function Capture() {
      clients.push(useQueryClient());
      return null;
    }
    const { rerender } = render(
      <Providers>
        <Capture />
      </Providers>
    );
    rerender(
      <Providers>
        <Capture />
      </Providers>
    );
    expect(clients.length).toBeGreaterThanOrEqual(2);
    expect(new Set(clients).size).toBe(1);
  });
});
