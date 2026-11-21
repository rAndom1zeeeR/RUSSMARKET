import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { installMatchMedia, setViewportWidth } from "./tests/helpers/viewport";

class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// jsdom не реализует эти API, а Radix, TanStack Virtual и наши эффекты ими пользуются.
globalThis.ResizeObserver = ResizeObserverStub;
Element.prototype.scrollIntoView = () => undefined;
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => undefined;
installMatchMedia();

beforeEach(() => {
  setViewportWidth(1280);
});

afterEach(() => {
  cleanup();
});
