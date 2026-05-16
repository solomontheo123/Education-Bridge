"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitQuiz } from "@/lib/api/modules";

export function useCompleteModule(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { answers: number[]; time_spent_seconds: number }>({
    mutationFn: (payload) => submitQuiz(moduleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["module", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
