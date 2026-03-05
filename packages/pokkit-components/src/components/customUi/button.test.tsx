import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeDefined();
  });

  it("renders a button element", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("renders complex children", () => {
    render(
      <Button>
        <span>Icon</span> Label
      </Button>,
    );
    expect(screen.getByText("Icon")).toBeDefined();
    expect(screen.getByRole("button")).toBeDefined();
  });
});
