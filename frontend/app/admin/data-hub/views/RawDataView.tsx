"use client";
import React from 'react';

// Wrapper for the existing 6-tab Data Hub content. Sprint 0 keeps the existing
// rendering inside page.tsx and passes children through. Future sprints may
// move the 6-tab content into this file directly.
export function RawDataView({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
