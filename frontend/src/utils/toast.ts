import { toast, type ToastOptions } from "react-hot-toast";
import type { ToastVariant } from "../types/trip";

const DEFAULT_OPTIONS: ToastOptions = {
  duration: 3200,
};

export function showToast(
  message: string,
  type: ToastVariant = "info",
  options: ToastOptions = {}
): string {
  const mergedOptions: ToastOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (type === "success") {
    return toast.success(message, mergedOptions);
  }

  if (type === "error") {
    return toast.error(message, mergedOptions);
  }

  return toast(message, mergedOptions);
}
