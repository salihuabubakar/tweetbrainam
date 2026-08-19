"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

// Built on <dialog> so focus trapping, Escape and inertness of the page behind
// come from the platform rather than from us reimplementing them badly.
// Clicking the backdrop deliberately does not close it: every use here is a
// confirmation, and losing typed input to a stray click is worse than an extra
// press of Escape or Cancel.
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-card p-6 text-foreground backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="font-medium text-base">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>

        {children}
      </div>
    </dialog>
  );
}
