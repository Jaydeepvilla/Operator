import { z } from "zod";
import { INDUSTRIES } from "../constants";

export const onboardingStep1Schema = z.object({
  industry: z.enum(INDUSTRIES, {
    message: "Select an industry from the list",
  }),
});

export const onboardingStep2Schema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  website: z.string().url("Enter a valid website URL (for example, acme.com)").or(z.string().length(0)),
  email: z.string().email("Enter a valid email address (for example, name@domain.com)"),
  phone: z.string().min(8, "Enter a valid phone number with area code"),
});

export const onboardingStep3Schema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
  timezone: z.string().min(1, "Select your business timezone"),
});

export const onboardingSchema = onboardingStep1Schema
  .merge(onboardingStep2Schema)
  .merge(onboardingStep3Schema);

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>;
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>;
export type OnboardingStep3Input = z.infer<typeof onboardingStep3Schema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(true),
});

export const registrationSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 8 characters"),
  acceptTerms: z.boolean().refine((val) => val === true, "Accept the Terms of Service to continue"),
  acceptPrivacy: z.boolean().refine((val) => val === true, "Accept the Privacy Policy to continue"),
  marketingConsent: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is missing or invalid"),
  password: z.string().min(6, "Password must be at least 8 characters"),
});

