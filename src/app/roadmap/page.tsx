"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Sparkles, LayoutGrid } from "lucide-react";
import { fetchRoadmap, completeModule } from "@/lib/api";
import { RoadmapNode } from "@/lib/schema";
import { useUser } from "@/context/UserContext";
import RoadmapTimeline from "@/components/roadmap/RoadmapTimeline";

export default function RoadmapPage() {
  const { userEmail, loading } = useUser();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<RoadmapNode[]>({
    queryKey: ["roadmap"],
    queryFn: fetchRoadmap,
    enabled: Boolean(userEmail),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  const completeModuleMutation = useMutation<RoadmapNode[], Error, string>({
    mutationFn: completeModule,
    onSuccess: (updatedRoadmap) => {
      queryClient.setQueryData(["roadmap"], updatedRoadmap);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    },
  });

  const handleCompleteModule = (moduleId: string) => {
    completeModuleMutation.mutate(moduleId);
  };

  const subtitle = useMemo(() => {
    if (isLoading) return "Building your adaptive academic roadmap...";
    if (isError) return "Unable to load the roadmap right now.";
    return "A personalized module graph assembled from your major, track, and learning style.";
  }, [isLoading, isError]);

  return (
    <section className="min-h-[calc(100vh-6rem)] bg-slate-100 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <LayoutGrid className="h-4 w-4" /> Adaptive Roadmap
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Your Academic Roadmap
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {subtitle}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4 text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                Data-driven curriculum
              </div>
              <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                {data?.length ?? 0}
              </div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                modules mapped
              </div>
            </div>
          </div>
        </div>

        {loading || isLoading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-16 text-center shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
            <p className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">Preparing your roadmap...</p>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Connecting module graph, prerequisites, and learning style.</p>
          </div>
        ) : isError ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50/80 p-10 text-center text-red-900 shadow-sm dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
            <AlertTriangle className="mx-auto h-12 w-12" />
            <p className="mt-4 text-xl font-semibold">Unable to load your roadmap</p>
            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-200">{error instanceof Error ? error.message : "Please sign in again or try again later."}</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-14 text-center shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
            <Sparkles className="mx-auto h-12 w-12 text-slate-500 dark:text-slate-300" />
            <p className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">The graph is ready — but your profile is empty.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Complete your profile or admit into the program to reveal your personalized modules.</p>
          </div>
        ) : (
          <RoadmapTimeline
            modules={data}
            onComplete={handleCompleteModule}
            completingModuleId={completeModuleMutation.variables as string | undefined}
          />
        )}
      </div>
    </section>
  );
}
