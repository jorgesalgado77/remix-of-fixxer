import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Estilização customizada solicitada
          success: "group-[.toaster]:bg-[#00FF87] group-[.toaster]:text-black group-[.toaster]:border-[#00FF87]",
          error: "group-[.toaster]:bg-red-600 group-[.toaster]:text-white group-[.toaster]:border-red-600",
          info: "group-[.toaster]:bg-yellow-400 group-[.toaster]:text-black group-[.toaster]:border-yellow-400",
        },
        duration: 2000,
      }}
      {...props}
    />
  );
};

export { Toaster };
