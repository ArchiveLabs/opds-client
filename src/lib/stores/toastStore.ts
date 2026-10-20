import { writable } from "svelte/store";

export type ToastVariant = "success" | "error" | "info";
export type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  let nextId = 1;

  function show(message: string, variant: ToastVariant = "success", durationMs = 4000): number {
    const id = nextId++;
    update((list) => [...list, { id, message, variant }]);
    if (durationMs > 0) {
      setTimeout(() => dismiss(id), durationMs);
    }
    return id;
  }

  function dismiss(id: number) {
    update((list) => list.filter((t) => t.id !== id));
  }

  return { subscribe, show, dismiss };
}

export const toasts = createToastStore();
