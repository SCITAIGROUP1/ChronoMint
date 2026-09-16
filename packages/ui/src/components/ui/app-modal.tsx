"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils.js";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./dialog.js";
import {
  modalCloseButtonClass,
  modalIconWrapVariants,
  type ModalSize,
  type ModalTone
} from "./modal-styles.js";

export type AppModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: ModalTone;
  size?: ModalSize;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  showClose?: boolean;
  className?: string;
  bodyClassName?: string;
  onInteractOutside?: (event: Event) => void;
};

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = "default",
  size = "md",
  children,
  footer,
  headerAction,
  showClose = true,
  className,
  bodyClassName,
  onInteractOutside
}: AppModalProps) {
  const inlineHeader = Boolean(headerAction);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={size}
        showClose={inlineHeader ? false : showClose}
        className={className}
        onInteractOutside={onInteractOutside}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <DialogHeader className={inlineHeader ? "space-y-1 py-4 pr-6" : undefined}>
          {inlineHeader ? (
            <>
              <div
                className="flex items-center justify-between gap-4"
                data-testid="modal-header-row"
              >
                <div
                  className="flex min-w-0 items-center gap-2.5"
                  data-testid="modal-header-leading"
                >
                  {icon ? (
                    <div
                      className={cn(
                        modalIconWrapVariants({ tone }),
                        "mb-0 size-9 shrink-0 rounded-xl"
                      )}
                    >
                      {icon}
                    </div>
                  ) : null}
                  <DialogTitle className="truncate">{title}</DialogTitle>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1"
                  data-testid="modal-header-trailing"
                >
                  {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
                  {showClose ? (
                    <>
                      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
                      <DialogClose
                        className={cn(
                          modalCloseButtonClass,
                          "inline-flex size-8 shrink-0 items-center justify-center"
                        )}
                      >
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                      </DialogClose>
                    </>
                  ) : null}
                </div>
              </div>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </>
          ) : (
            <>
              {icon ? <div className={cn(modalIconWrapVariants({ tone }))}>{icon}</div> : null}
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </>
          )}
        </DialogHeader>
        {children ? <DialogBody className={bodyClassName}>{children}</DialogBody> : null}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
