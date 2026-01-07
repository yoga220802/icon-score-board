// File ini wajib ada karena HeroUI membutuhkan Context Provider
// dan harus berjalan di client-side ('use client')
"use client";

// app/providers.tsx

import {HeroUIProvider} from '@heroui/react'
import {ToastProvider} from "@heroui/toast";
import type { JSX, ReactNode } from 'react';

export function Providers({children}: { children: ReactNode }): JSX.Element {
  return (
    <HeroUIProvider>
      <ToastProvider placement="bottom-center" />
      {children}
    </HeroUIProvider>
  )
}