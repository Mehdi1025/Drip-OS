"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "drip-pwa-install-dismissed";

export function PwaInstallBanner() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [hidden, setHidden] = useState(true);
  const [isIosHint, setIsIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = window.navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as Window & { MSStream?: unknown }).MSStream;
    if (ios) {
      setIsIosHint(true);
      setHidden(false);
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (hidden || pathname.startsWith("/scanner")) return null;

  return (
    <div
      className="drip-glass-nav fixed bottom-[calc(var(--drip-tab-bar-h)+env(safe-area-inset-bottom,0px)+0.5rem)] left-4 right-4 z-[45] rounded-2xl px-4 py-3 md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
      role="region"
      aria-label="Installer l'application"
    >
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-drip-volt" strokeWidth={2} />
        <div className="min-w-0 flex-1 text-xs leading-snug">
          {isIosHint && !deferred ? (
            <>
              <p className="font-medium">Installer Drip OS</p>
              <p className="mt-1 text-drip-muted">
                Safari → Partager → Sur l&apos;écran d&apos;accueil
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">App Drip OS</p>
              <p className="mt-1 text-drip-muted">
                Ajoute le dashboard à ton écran d&apos;accueil.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg border border-drip-border p-1.5 transition hover:bg-white/5"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      {deferred && (
        <button
          type="button"
          onClick={() => void install()}
          className="drip-btn-volt drip-touch mt-3 w-full py-2.5 text-xs"
        >
          Installer
        </button>
      )}
    </div>
  );
}
