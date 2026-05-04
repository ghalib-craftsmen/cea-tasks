import { z } from "zod";

const optionalUrl = z.union([
  z.string().url("Enter a valid URL"),
  z.literal(""),
]);

export const step1Schema = z.object({
  firstName:         z.string().min(1, "First name is required"),
  lastName:          z.string().min(1, "Last name is required"),
  email:             z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone:             z.string().optional(),
  location:          z.string().min(1, "Location is required"),
  linkedIn:          z.string().min(1, "LinkedIn profile is required").url("Enter a valid LinkedIn URL"),
  github:            z.string().min(1, "GitHub profile is required").url("Enter a valid GitHub URL"),
  portfolio:         optionalUrl,
  currentRole:       z.string().optional(),
  noticePeriod:      z.string().min(1, "Please select your notice period"),
  salaryExpectation: z.string().optional(),
});

const jobSchema = z
  .object({
    company: z.string().min(1, "Company is required"),
    title: z.string().min(1, "Job title is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const step2Schema = z.object({
  yearsOfExperience: z.coerce.number().min(0, "Cannot be negative"),
  jobs: z.array(jobSchema),
});

export const step3Schema = z.object({
  coverLetter: z.string().optional(),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to continue" }),
  }),
});

export const applicationSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema);

export type FormData = z.infer<typeof applicationSchema>;

export const stepSchemas = [step1Schema, step2Schema, step3Schema];
