import type { Crit } from "../src/lib/types";
interface OpenCalibration { id: string; slope: number; intercept: number; scripts: number }
export const OPEN_CALIBRATIONS: Record<string, OpenCalibration>;
export function openCalibration(provider: string, model: string): OpenCalibration;
export function calibrateOpen(band: number | null, provider: string, model: string): number | null;
export function calibrateOpenMean(bands: Record<string, number | null>, provider: string, model: string): number | null;
export function capUneven(overall: number | null, bands: Record<string, number | null>): number | null;
export function overallBand(bands: Record<Crit, number | null>): number | null;
export function bandRange(overall: number | null, calibrated?: boolean): { lo: number; hi: number } | null;
export function lengthCap(words: number, task: string): number | null;
