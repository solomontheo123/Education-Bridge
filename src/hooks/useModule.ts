"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchModuleDetail } from "@/lib/api/modules";
import { ModuleDetail } from "@/lib/schema";

export function useModule(moduleId: string) {
  return useQuery<ModuleDetail, Error, ModuleDetail>({
    queryKey: ["module", moduleId] as const,
    queryFn: () => fetchModuleDetail(moduleId),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}
