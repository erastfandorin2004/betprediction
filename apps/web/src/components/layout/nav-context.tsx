'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// Состояние мобильного drawer боковой панели (общий для Sidebar и Topbar).
const NavCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function NavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <NavCtx.Provider value={{ open, setOpen }}>{children}</NavCtx.Provider>;
}

export const useNav = () => useContext(NavCtx);
