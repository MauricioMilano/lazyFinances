import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-is-desktop";

// NOTE: This file is allowlisted in eslint-rules/no-raw-modal-primitives.cjs.
// It is the ONE place that may import the raw shadcn primitives (Dialog, Drawer).
// All other consumers must go through `Modal` or `ConfirmModal`. If you extract
// a third wrapper that needs the raw primitives, add it to the allowlist there.

type ModalVariant = "desktop" | "drawer";

const ModalContext = React.createContext<{ variant: ModalVariant }>({
  variant: "drawer",
});

function useModalContext(component: string) {
  const ctx = React.useContext(ModalContext);
  if (ctx.variant === undefined) {
    throw new Error(`<${component}> must be rendered inside <Modal>.`);
  }
  return ctx;
}

const TRIGGER_TYPES = new Set<unknown>(["ModalTrigger"]);
function isTriggerNode(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  const t = node.type as { displayName?: string; name?: string } | string;
  const displayName = typeof t === "string" ? t : t?.displayName;
  return TRIGGER_TYPES.has(displayName);
}

type ModalRootProps = Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>,
  "children"
> & {
  children?: React.ReactNode;
  onPointerDownOutside?: (event: Event) => void;
  onInteractOutside?: (event: Event) => void;
  dismissible?: boolean;
};

const Modal = ({
  open: openProp,
  defaultOpen,
  onOpenChange,
  onPointerDownOutside,
  onInteractOutside,
  dismissible = true,
  children,
  ...rootProps
}: ModalRootProps) => {
  const isDesktop = useIsDesktop();
  const variant: ModalVariant = isDesktop ? "desktop" : "drawer";

  const [internalOpen, setInternalOpen] = React.useState<boolean>(
    defaultOpen ?? false,
  );
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : internalOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const childArray = React.Children.toArray(children);
  const triggerNodes: React.ReactNode[] = [];
  const sectionNodes: React.ReactNode[] = [];
  for (const child of childArray) {
    if (isTriggerNode(child)) triggerNodes.push(child);
    else sectionNodes.push(child);
  }

  const ctxValue = React.useMemo(() => ({ variant }), [variant]);

  const tree = (
    <ModalContext.Provider value={ctxValue}>
      {variant === "desktop" ? (
        <DialogPrimitive.Root
          open={open}
          onOpenChange={handleOpenChange}
          {...rootProps}
        >
          {triggerNodes}
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              onPointerDownOutside={onPointerDownOutside}
              onInteractOutside={onInteractOutside}
              className={cn(
                "fixed left-[50%] top-[50%] z-50 flex w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden border bg-background shadow-lg duration-200 sm:rounded-xl",
                "max-h-[85vh]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
              )}
            >
              {sectionNodes}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      ) : (
        <DrawerPrimitive.Root
          open={open}
          onOpenChange={handleOpenChange}
          shouldScaleBackground={true}
          dismissible={dismissible}
          {...(rootProps as React.ComponentProps<typeof DrawerPrimitive.Root>)}
        >
          {triggerNodes}
          <DrawerPrimitive.Portal>
            <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
            <DrawerPrimitive.Content
              onPointerDownOutside={onPointerDownOutside}
              onInteractOutside={onInteractOutside}
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[96vh] flex-col rounded-t-[10px] border bg-background",
              )}
            >
              <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
              {sectionNodes}
            </DrawerPrimitive.Content>
          </DrawerPrimitive.Portal>
        </DrawerPrimitive.Root>
      )}
    </ModalContext.Provider>
  );

  return tree;
};
Modal.displayName = "Modal";

type ModalTriggerProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Trigger
>;

const ModalTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  ModalTriggerProps
>((props, ref) => {
  const { variant } = useModalContext("ModalTrigger");

  if (variant === "desktop") {
    return <DialogPrimitive.Trigger ref={ref} {...props} />;
  }

  return (
    <DrawerPrimitive.Trigger
      ref={ref as React.Ref<HTMLButtonElement>}
      {...(props as React.ComponentProps<typeof DrawerPrimitive.Trigger>)}
    />
  );
});
ModalTrigger.displayName = "ModalTrigger";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type ModalHeaderProps = {
  title: string;
  description?: string;
  as?: HeadingTag;
  className?: string;
};

const ModalHeader = ({
  title,
  description,
  as: Heading = "h2",
  className,
}: ModalHeaderProps) => {
  const { variant } = useModalContext("ModalHeader");

  const TitlePrimitive =
    variant === "desktop" ? DialogPrimitive.Title : DrawerPrimitive.Title;
  const DescriptionPrimitive =
    variant === "desktop"
      ? DialogPrimitive.Description
      : DrawerPrimitive.Description;

  return (
    <header
      className={cn(
        "relative flex flex-col gap-1.5 border-b border-[#dddddd] text-left",
        "px-5 py-3 md:px-6 md:py-4 lg:px-8 lg:py-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 pr-8">
        <div className="min-w-0 flex-1">
          <TitlePrimitive asChild>
            <Heading
              className={cn(
                "font-medium tracking-tight",
                "text-lg md:text-xl lg:text-2xl",
              )}
            >
              {title}
            </Heading>
          </TitlePrimitive>
          {description ? (
            <DescriptionPrimitive asChild>
              <p className="text-sm text-muted-foreground">{description}</p>
            </DescriptionPrimitive>
          ) : null}
        </div>
      </div>
      <DialogPrimitive.Close
        aria-label="Close"
        className={cn(
          "absolute rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
          "right-3 top-3 md:right-4 md:top-4 lg:right-6 lg:top-6",
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </header>
  );
};
ModalHeader.displayName = "ModalHeader";

type ModalBodyProps = React.HTMLAttributes<HTMLDivElement>;

const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex-1 overflow-y-auto",
        "p-5 md:p-6 lg:px-8 lg:py-6",
        className,
      )}
      {...props}
    />
  ),
);
ModalBody.displayName = "ModalBody";

type ModalFooterProps = React.HTMLAttributes<HTMLDivElement>;

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "sticky bottom-0 border-t border-[#dddddd] bg-background",
        "px-5 py-3 md:px-6 md:py-4 lg:px-6 lg:py-4",
        "flex flex-col gap-2 md:flex-row md:justify-end md:gap-2 lg:flex-row lg:justify-end lg:gap-2",
        className,
      )}
      {...props}
    />
  ),
);
ModalFooter.displayName = "ModalFooter";

const ModalCompound = Object.assign(Modal, {
  Trigger: ModalTrigger,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});

export {
  ModalCompound as Modal,
  ModalTrigger,
  ModalHeader,
  ModalBody,
  ModalFooter,
};
