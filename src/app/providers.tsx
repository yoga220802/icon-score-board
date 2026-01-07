"use client";

import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import type { JSX, ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }): JSX.Element {
	return (
		<HeroUIProvider>
			{/* Di sini kuncinya, Boss! 
        Kalau lo gak set placement="bottom-center", 
        HeroUI bakal naruh di atas secara default.
      */}
			<ToastProvider placement='bottom-right' />
			{children}
		</HeroUIProvider>
	);
}
