import { writable, derived } from "svelte/store";

interface PwaState {
  isStandalone: boolean;
  isMobile: boolean;
  platform: "chromium" | "ios" | "other";
  dismissed: boolean;
}

let capturedPrompt: any = null;

function createPwaStore() {
  const store = writable<PwaState>({
    isStandalone: false,
    isMobile: false,
    platform: "other",
    dismissed: false,
  });

  const { subscribe, set, update } = store;

  function init() {
    if (typeof window === "undefined") return;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      capturedPrompt = e;
      update((s) => ({ ...s, platform: "chromium" }));
    });

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    const isMobile =
      window.matchMedia("(max-width: 768px)").matches &&
      navigator.maxTouchPoints > 0;

    let platform: PwaState["platform"] = "other";
    if (capturedPrompt || /Chrome|Chromium/.test(navigator.userAgent)) {
      platform = "chromium";
    } else if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      platform = "ios";
    }

    const dismissed = sessionStorage.getItem("pwa_install_dismissed") === "true";

    set({ isStandalone, isMobile, platform, dismissed });
  }

  function dismiss() {
    update((s) => {
      sessionStorage.setItem("pwa_install_dismissed", "true");
      return { ...s, dismissed: true };
    });
  }

  async function triggerInstall(): Promise<string | null> {
    if (!capturedPrompt) {
      // beforeinstallprompt may not have fired yet — wait briefly for it
      await new Promise<void>((resolve) => {
        const onPrompt = (e: Event) => {
          e.preventDefault();
          capturedPrompt = e;
          resolve();
        };
        window.addEventListener("beforeinstallprompt", onPrompt, { once: true });
        setTimeout(() => {
          window.removeEventListener("beforeinstallprompt", onPrompt);
          resolve();
        }, 3000);
      });
    }
    if (!capturedPrompt) return null;
    capturedPrompt.prompt();
    const result = await capturedPrompt.userChoice;
    capturedPrompt = null;
    return result.outcome;
  }

  function undismiss() {
    update((s) => {
      sessionStorage.removeItem("pwa_install_dismissed");
      return { ...s, dismissed: false };
    });
  }

  return {
    subscribe,
    init,
    dismiss,
    undismiss,
    triggerInstall,
  };
}

export const pwa = createPwaStore();

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
}

export const shouldShowInstallPage = derived(pwa, ($pwa) => {
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  return isAndroid && $pwa.platform === "chromium" && !$pwa.isStandalone && !$pwa.dismissed;
});
