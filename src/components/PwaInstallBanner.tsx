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
      className="fixed bottom-[calc(var(--drip-tab-bar-h)+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[45] border-t-4 border-drip-ink bg-drip-volt px-4 py-3 shadow-brutal md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:border-4"
      role="region"
      aria-label="Installer l'application"
    >
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
        <div className="min-w-0 flex-1 text-xs font-bold leading-snug">
          {isIosHint && !deferred ? (
            <>
              <p className="font-black uppercase">Installer Drip OS</p>
              <p className="mt-1 font-medium normal-case text-drip-ink/80">
                Safari → Partager → Sur l&apos;écran d&apos;accueil
              </p>
            </>
          ) : (
            <>
              <p className="font-black uppercase">App Drip OS</p>
              <p className="mt-1 font-medium normal-case text-drip-ink/80">
                Ajoute le dashboard à ton écran d&apos;accueil.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 border-2 border-drip-ink bg-drip-paper p-1"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
      {deferred && (
        <button
          type="button"
          onClick={() => void install()}
          className="drip-touch mt-3 w-full border-4 border-drip-ink bg-drip-paper py-2.5 text-xs font-black uppercase"
        >
          Installer
        </button>
      )}
    </div>
  );
}
