import { z } from "zod";

const phoneRegex = /^[+]?[0-9()\s-]{7,20}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);

export const contactFormSchema = z.object({
  name: z.preprocess(trimString, z.string().min(2, "Please enter your name.").max(100, "Name is too long.")),
  contact: z.preprocess(trimString, z.string().regex(phoneRegex, "Please enter a valid contact number.")),
  email: z.preprocess(trimString, z.string().email("Please enter a valid email address.")),
  query: z.preprocess(
    trimString,
    z.string().min(10, "Please share a little more detail.").max(1500, "Message is too long."),
  ),
});

export const consultationFormSchema = z.object({
  name: z.preprocess(trimString, z.string().min(2, "Please enter your name.").max(100, "Name is too long.")),
  email: z.preprocess(trimString, z.string().email("Please enter a valid email address.")),
  date: z
    .string()
    .min(1, "Please choose a date.")
    .refine((value) => {
      const selectedDate = new Date(`${value}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return !Number.isNaN(selectedDate.getTime()) && selectedDate >= today;
    }, "Please choose today or a future date."),
  time: z.string().regex(timeRegex, "Please choose a valid time."),
  notes: z.preprocess(
    trimString,
    z
      .string()
      .max(1000, "Notes are too long.")
      .optional()
      .transform((value) => value ?? ""),
  ),
});

export const customDesignFormSchema = z.object({
  garmentType: z.preprocess(
    trimString,
    z.string().min(1, "Please select a garment type.").max(100, "Garment type is too long."),
  ),
  fabric: z.preprocess(
    trimString,
    z.string().min(2, "Please enter a fabric preference.").max(100, "Fabric value is too long."),
  ),
  occasion: z.preprocess(
    trimString,
    z.string().min(2, "Please tell us the occasion.").max(100, "Occasion is too long."),
  ),
  size: z.preprocess(trimString, z.string().min(1, "Please select a size.").max(50, "Size is too long.")),
  details: z.preprocess(
    trimString,
    z.string().min(10, "Please add a few details about your design.").max(2000, "Details are too long."),
  ),
});

export const checkoutFormSchema = z.object({
  fullName: z.preprocess(trimString, z.string().min(2, "Please enter your full name.").max(120, "Name is too long.")),
  email: z.preprocess(trimString, z.string().email("Please enter a valid email address.")),
  phoneNumber: z.preprocess(trimString, z.string().regex(phoneRegex, "Please enter a valid phone number.")),
  address: z.preprocess(trimString, z.string().min(5, "Please enter your address.").max(200, "Address is too long.")),
  city: z.preprocess(trimString, z.string().min(2, "Please enter your city.").max(100, "City is too long.")),
  state: z.preprocess(trimString, z.string().min(2, "Please enter your state.").max(100, "State is too long.")),
  postalCode: z.preprocess(
    trimString,
    z.string().min(4, "Please enter a valid postal code.").max(12, "Postal code is too long."),
  ),
  notes: z.preprocess(
    trimString,
    z.string().max(1000, "Notes are too long.").optional().transform((value) => value ?? ""),
  ),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type ConsultationFormValues = z.infer<typeof consultationFormSchema>;
export type CustomDesignFormValues = z.infer<typeof customDesignFormSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function getFieldErrors<T extends string>(error: z.ZodError): FieldErrors<T> {
  const fieldErrors: FieldErrors<T> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !fieldErrors[field as T]) {
      fieldErrors[field as T] = issue.message;
    }
  }

  return fieldErrors;
}

export function validateReferenceFiles(files: File[]) {
  if (files.length > 4) {
    throw new Error("You can upload up to 4 reference images.");
  }

  for (const file of files) {
    if (!imageMimeTypes.includes(file.type)) {
      throw new Error("Only JPG, PNG, or WEBP images are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Each image must be 5 MB or smaller.");
    }
  }
}

export function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}
