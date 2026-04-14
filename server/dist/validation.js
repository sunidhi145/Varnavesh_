import { z } from "zod";
const phoneRegex = /^[+]?[0-9()\s-]{7,20}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const trimString = (value) => (typeof value === "string" ? value.trim() : value);
export const contactPayloadSchema = z.object({
    name: z.preprocess(trimString, z.string().min(2, "Please enter your name.").max(100, "Name is too long.")),
    contact: z.preprocess(trimString, z.string().regex(phoneRegex, "Please enter a valid contact number.")),
    email: z.preprocess(trimString, z.string().email("Please enter a valid email address.")),
    query: z.preprocess(trimString, z.string().min(10, "Please share a little more detail.").max(1500, "Message is too long.")),
    honeypot: z.preprocess(trimString, z.string().optional().default("")),
});
export const consultationPayloadSchema = z.object({
    name: z.preprocess(trimString, z.string().min(2, "Please enter your name.").max(100, "Name is too long.")),
    email: z.preprocess(trimString, z.string().email("Please enter a valid email address.")),
    date: z
        .preprocess(trimString, z.string().min(1, "Please choose a date."))
        .refine((value) => {
        const selectedDate = new Date(`${value}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return !Number.isNaN(selectedDate.getTime()) && selectedDate >= today;
    }, "Please choose today or a future date."),
    time: z.preprocess(trimString, z.string().regex(timeRegex, "Please choose a valid time.")),
    notes: z.preprocess(trimString, z.string().max(1000, "Notes are too long.").optional().default("")),
    honeypot: z.preprocess(trimString, z.string().optional().default("")),
});
export const customDesignPayloadSchema = z.object({
    garmentType: z.preprocess(trimString, z.string().min(1, "Please select a garment type.").max(100, "Garment type is too long.")),
    fabric: z.preprocess(trimString, z.string().min(2, "Please enter a fabric preference.").max(100, "Fabric value is too long.")),
    occasion: z.preprocess(trimString, z.string().min(2, "Please tell us the occasion.").max(100, "Occasion is too long.")),
    size: z.preprocess(trimString, z.string().min(1, "Please select a size.").max(50, "Size is too long.")),
    details: z.preprocess(trimString, z.string().min(10, "Please add a few details about your design.").max(2000, "Details are too long.")),
    honeypot: z.preprocess(trimString, z.string().optional().default("")),
});
export const checkoutCustomerSchema = z.object({
    fullName: z.preprocess(trimString, z.string().min(2, "Please enter your full name.").max(120, "Name is too long.")),
    email: z.preprocess(trimString, z.string().email("Please enter a valid email address.")),
    phoneNumber: z.preprocess(trimString, z.string().regex(phoneRegex, "Please enter a valid phone number.")),
    address: z.preprocess(trimString, z.string().min(5, "Please enter your address.").max(200, "Address is too long.")),
    city: z.preprocess(trimString, z.string().min(2, "Please enter your city.").max(100, "City is too long.")),
    state: z.preprocess(trimString, z.string().min(2, "Please enter your state.").max(100, "State is too long.")),
    postalCode: z.preprocess(trimString, z.string().min(4, "Please enter a valid postal code.").max(12, "Postal code is too long.")),
});
export const checkoutItemSchema = z.object({
    productId: z.preprocess(trimString, z.string().min(1, "Product id is required.")),
    quantity: z.number().int().min(1, "Quantity must be at least 1.").max(10, "Quantity cannot exceed 10."),
});
export const createCheckoutSessionPayloadSchema = z.object({
    customer: checkoutCustomerSchema,
    items: z.array(checkoutItemSchema).min(1, "Your cart is empty.").max(25, "Too many items in one order."),
    notes: z.preprocess(trimString, z.string().max(1000, "Notes are too long.").optional().default("")),
});
export const confirmOrderPaymentPayloadSchema = z.object({
    sessionId: z.preprocess(trimString, z.string().min(1, "Session id is required.")),
});
export function validateUploadedFiles(files) {
    if (files.length > 4) {
        throw new Error("You can upload up to 4 reference images.");
    }
    for (const file of files) {
        if (!imageMimeTypes.includes(file.mimetype)) {
            throw new Error("Only JPG, PNG, or WEBP images are allowed.");
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new Error("Each image must be 5 MB or smaller.");
        }
    }
}
