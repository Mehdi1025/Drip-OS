"use client";

import { useEffect, useState } from "react";

export function DelaisNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/delais/overdue-count")
      .then((r) => r.json())
      .then((j: { count?: number }) => {
        if (!cancelled) setCount(j.count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
