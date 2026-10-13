export type CameraErrorCopy = {
  title: string;
  detail: string;
  isPermission: boolean;
};

export function humanizeCameraError(err: unknown): CameraErrorCopy {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";

  const lower = raw.toLowerCase();

  if (
    lower.includes("notallowed") ||
    lower.includes("permission") ||
    lower.includes("denied") ||
    lower.includes("not allowed")
  ) {
    return {
      title: "Caméra bloquée",
      detail:
        "Autorise l'accès à la caméra pour ce site (cadenas ou icône dans la barre d'adresse), puis appuie sur « Réactiver la caméra ». Tu peux aussi saisir le code à la main.",
      isPermission: true,
    };
  }

  if (
    lower.includes("notfound") ||
    lower.includes("no camera") ||
    lower.includes("devicesnotfound")
  ) {
    return {
      title: "Caméra introuvable",
      detail:
        "Aucune caméra détectée sur cet appareil. Utilise la saisie manuelle du track code.",
      isPermission: false,
    };
  }

  if (lower.includes("in use") || lower.includes("notreadable")) {
    return {
      title: "Caméra occupée",
      detail:
        "Une autre application utilise peut-être la caméra. Ferme-la ou utilise la saisie manuelle.",
      isPermission: false,
    };
  }

  return {
    title: "Caméra indisponible",
    detail:
      raw.trim() ||
      "Impossible de démarrer le scan. Réessaie ou saisis le code manuellement.",
    isPermission: false,
  };
}
