import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + 'T00:00:00Z'); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; }, 'Enter a valid calendar date');
export const tripSchema = z.object({ name: z.string().trim().min(1).max(120), destination: z.string().trim().min(1).max(120), start: date, end: date, timezone: z.string().min(1).max(80), status: z.enum(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled']), staff: z.string().max(120), contact: z.string().max(160), travellers: z.array(z.object({ name: z.string().min(1).max(120), type: z.enum(['Adult', 'Child', 'Infant']) })).max(100), services: z.array(z.object({ id: z.string(), date: date, time: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/), type: z.enum(['Transfer', 'Hotel', 'Tour', 'Activity', 'Flight']), title: z.string().min(1).max(200), location: z.string().max(200), contact: z.string().max(160), notes: z.string().max(3000) })).max(200), places: z.array(z.object({ id: z.string(), name: z.string().min(1).max(200), category: z.enum(['Restaurant', 'Hospital', 'Transport', 'Emergency', 'Other']), location: z.string().max(200), contact: z.string().max(160), source: z.string().max(500), verified: z.string() })).max(100).default([]), published: z.boolean(), revision: z.number().int().min(0) }).refine(t => t.services.every(s => s.date >= t.start && s.date <= t.end), 'Service dates must be within the trip').refine(t => t.end >= t.start, 'End date must follow start date').refine(t => { try {
    new Intl.DateTimeFormat('en', { timeZone: t.timezone });
    return true;
}
catch {
    return false;
} }, 'Use a valid timezone');
export type Trip = z.infer<typeof tripSchema>;
