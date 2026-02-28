import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Counter } from "../components/counter";

describe("Counter", () => {
  it("renders with an initial count of 0", () => {
    render(<Counter />);
    expect(screen.getByRole("button")).toHaveTextContent("0");
  });

  it("increments the count when clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(button).toHaveTextContent("1");
  });

  it("increments the count multiple times", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(button).toHaveTextContent("3");
  });
});
