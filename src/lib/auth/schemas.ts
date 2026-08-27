// Zod schemas for the auth forms (Rule F8b) — mirrors contracts/auth-api.md and
// research R-10 (password: minimum 10 characters, no composition rules) so client-side
// validation never drifts from what the backend actually enforces.
import { z } from "zod";

export const signupInputSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address").max(320),
  password: z.string().min(10, "Password must be at least 10 characters"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be 100 characters or fewer"),
});

export type SignupInput = z.infer<typeof signupInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
