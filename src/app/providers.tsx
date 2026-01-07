// File ini wajib ada karena HeroUI membutuhkan Context Provider
// dan harus berjalan di client-side ('use client')
"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<HeroUIProvider>
			<ToastProvider placement="top-right" toastOffset={16} />
			{children}
		</HeroUIProvider>
	);
}
