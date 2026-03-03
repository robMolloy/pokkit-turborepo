import "@testing-library/jest-dom";
import { EventSource } from "eventsource";

if (!("EventSource" in globalThis)) {
  Object.defineProperty(globalThis, "EventSource", {
    value: EventSource,
    writable: true,
    configurable: true,
  });
}
