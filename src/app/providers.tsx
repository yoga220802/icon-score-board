// File ini wajib ada karena HeroUI membutuhkan Context Provider
// dan harus berjalan di client-side ('use client')
"use client";

import { HeroUIProvider } from "@heroui/react";

export function Providers({ children }: { children: React.ReactNode }) {
	return <HeroUIProvider>{children}</HeroUIProvider>;
}
