import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/types/trpc-router";

export const trpc = createTRPCReact<AppRouter>();
