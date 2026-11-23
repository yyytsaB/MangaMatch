// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "@/components/Modal";

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <Modal
        open={open}
        title="Manage categories"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <button>First action</button>
        <button>Last action</button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("is an accessible, labelled modal dialog", () => {
    render(<Modal open title="Import backup" onClose={() => {}}>Body</Modal>);
    const dialog = screen.getByRole("dialog", { name: "Import backup" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("renders nothing while closed", () => {
    render(<Modal open={false} title="Hidden" onClose={() => {}}>Body</Modal>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Modal open title="Escape me" onClose={onClose}>Body</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a backdrop click but not on a click inside the panel", () => {
    const onClose = vi.fn();
    render(<Modal open title="Backdrop" onClose={onClose}><p>Inside</p></Modal>);

    fireEvent.mouseDown(screen.getByText("Inside"));
    fireEvent.click(screen.getByText("Inside"));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = screen.getByTestId("modal-backdrop");
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape and backdrop clicks when not dismissible", () => {
    const onClose = vi.fn();
    render(<Modal open dismissible={false} title="Working" onClose={onClose}>Busy</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(screen.getByTestId("modal-backdrop"));
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("can focus the dialog itself so a sheet doesn't open the on-screen keyboard", () => {
    render(
      <Modal open variant="sheet" initialFocus="dialog" title="Filters" onClose={() => {}} footer={<button>Apply</button>}>
        <input aria-label="Search your library" />
      </Modal>
    );
    expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "Filters" }));
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
  });

  it("keeps Shift+Tab inside when the dialog panel itself has focus", () => {
    render(
      <>
        <button>Behind the dialog</button>
        <Modal open variant="sheet" initialFocus="dialog" title="Filters" onClose={() => {}} footer={<button>Apply</button>}>
          <input aria-label="Search your library" />
        </Modal>
      </>
    );
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apply" }));
  });

  it("moves focus inside, traps Tab, and restores focus to the trigger on close", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);

    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });
    expect(document.activeElement).toBe(first);

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
