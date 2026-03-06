import "@testing-library/jest-dom";
import { EventSource } from "eventsource";

global.EventSource = EventSource;
