import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { setViewportWidth } from "../../../tests/helpers/viewport";
import { useBreakpoint } from "./use-breakpoint";

describe("useBreakpoint", () => {
  it.each([
    [320, "sm"],
    [639, "sm"],
    [640, "md"],
    [1199, "md"],
    [1200, "lg"],
    [1700, "lg"],
  ])("ширина %i px → %s", (width, expected) => {
    setViewportWidth(width);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe(expected);
  });

  it("реагирует на изменение ширины окна", () => {
    setViewportWidth(1400);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("lg");

    act(() => setViewportWidth(800));
    expect(result.current).toBe("md");

    act(() => setViewportWidth(360));
    expect(result.current).toBe("sm");
  });

  it("на сервере (до гидратации) считает экран десктопным", () => {
    function Probe() {
      return <span>{useBreakpoint()}</span>;
    }
    expect(renderToString(<Probe />)).toContain("lg");
  });
});
