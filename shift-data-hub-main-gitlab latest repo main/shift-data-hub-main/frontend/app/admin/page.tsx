"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard on mount
    router.push("/admin/dashboard");
  }, [router]);

  return null;
}
