import { toast } from "react-hot-toast";

const DEFAULT_OPTIONS = {
  duration: 3200,
};

export function showToast(message, type = "info", options = {}) {
  const mergedOptions = {
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
