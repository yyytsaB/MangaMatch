// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Toast from "@/components/Toast";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("pauses its timeout while hovered or focused, so an Undo stays reachable", () => {
    const onClose = vi.fn();
    render(<Toast toast={{ text: "Hidden", type: "info", action: { label: "Undo", onClick: () => {} } }} onClose={onClose} />);
    const undo = screen.getByRole("button", { name: "Undo" });

    fireEvent.focus(undo);
    act(() => vi.advanceTimersByTime(20_000));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.blur(undo);
    act(() => vi.advanceTimersByTime(6_000));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pauses on hover too", () => {
    const onClose = vi.fn();
    render(<Toast toast={{ text: "Saved", type: "success" }} onClose={onClose} />);
    fireEvent.mouseEnter(screen.getByText("Saved"));
    act(() => vi.advanceTimersByTime(20_000));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("Toast pause scope", () => {
  it("does not carry a hover pause over to the next toast", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Toast toast={{ text: "First", type: "info" }} onClose={onClose} />);
    fireEvent.mouseEnter(screen.getByText("First"));

    rerender(<Toast toast={{ text: "Second", type: "info" }} onClose={onClose} />);
    act(() => vi.advanceTimersByTime(3_500));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
