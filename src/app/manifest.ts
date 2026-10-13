import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/imposition",
    name: "Drip OS — Production",
    short_name: "Drip OS",
    description: "Gestion de production e-commerce — imposition, atelier, scanner.",
    start_url: "/imposition",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f2ede4",
    theme_color: "#ccff00",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
