import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z.string().refine((value) => mongoose.isObjectIdOrHexString(value), 'Invalid identifier.');
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}, 'Choose a real calendar date.');
