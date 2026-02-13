import { z } from 'zod';

/**
 * Vibe Engineering: Validation Layer
 * Using Zod for strict type checking and data integrity.
 */

// Simple XSS Sanitization helper
const sanitize = (val: string) => {
  return val
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/on\w+="[^"]*"/gim, "")
    .replace(/javascript:[^"]*/gim, "");
};

const sanitizedString = z.string().transform(sanitize);

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required").transform(sanitize),
  role: z.string(),
  avatar: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().optional(),
  jobTitle: z.string().optional(),
  preferences: z.any().optional(),
});

export const BookingSchema = z.object({
  id: z.string(),
  clientId: z.string().optional(),
  clientName: z.string().min(2, "Client name is required").transform(sanitize),
  clientPhone: z.string().optional().transform(v => v ? sanitize(v) : v),
  category: z.string(),
  title: z.string().min(3, "Title is too short").transform(sanitize),
  shootDate: z.string().optional(),
  status: z.string(),
  totalAmount: z.number().nonnegative("Total amount cannot be negative"),
  paidAmount: z.number().nonnegative("Paid amount cannot be negative"),
  location: z.string().optional().transform(v => v ? sanitize(v) : v),
  servicePackage: z.string().optional(),
  notes: z.string().optional().transform(v => v ? sanitize(v) : v),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().optional(),
}).refine(data => data.paidAmount <= data.totalAmount, {
  message: "Paid amount cannot exceed total amount",
  path: ["paidAmount"]
});

export const PaymentSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  amount: z.number().positive("Payment amount must be greater than zero"),
  date: z.string(),
  method: z.enum(['Cash', 'ZinCash']),
  collectedBy: z.string().min(2).transform(sanitize),
  notes: z.string().optional().transform(v => v ? sanitize(v) : v),
});

export const ReminderSchema = z.object({
  id: z.string(),
  bookingId: z.string().optional(),
  title: z.string().min(3).transform(sanitize),
  dueDate: z.string(),
  completed: z.boolean().default(false),
  type: z.string(),
});
