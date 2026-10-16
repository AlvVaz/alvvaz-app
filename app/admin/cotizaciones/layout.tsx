import type { ReactNode } from "react";

import ToastProvider from "@/components/ui/toast";

// Shared so toasts survive navigation between the list and the editor.
export default function CotizacionesLayout({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
