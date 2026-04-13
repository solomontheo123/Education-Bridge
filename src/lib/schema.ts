import { z } from "zod";

export const onboardingSchema = z.object({
  // Matches Step 1
  education: z.string().min(1, "Please select an education level"),
  interests: z.string().min(5, "Please tell us a bit more about your interests"),
  barriers: z.string().min(1, "Please select the barrier that resonates most"),
});

// The Magic Line stays exactly the same
export type OnboardingData = z.infer<typeof onboardingSchema>;