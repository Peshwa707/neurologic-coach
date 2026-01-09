import type { MoodLog } from '../db/database';

export interface HourlyEnergy {
  hour: number;
  avgEnergy: number;
  sampleCount: number;
}

export interface EnergyPattern {
  hourlyAverages: HourlyEnergy[];
  peakHours: number[];
  lowHours: number[];
  recommendations: string[];
  overallAverage: number;
}

export interface TimeRecommendation {
  hour: number;
  label: string;
  reason: string;
  quality: 'optimal' | 'good' | 'acceptable' | 'avoid';
}

/**
 * Analyze energy patterns from mood logs
 */
export function analyzeEnergyPatterns(moodLogs: MoodLog[], days: number = 14): EnergyPattern {
  // Initialize hourly buckets (6 AM to 10 PM for typical active hours)
  const hourlyData: { [hour: number]: number[] } = {};
  for (let h = 6; h <= 22; h++) {
    hourlyData[h] = [];
  }

  // Filter logs to specified time period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentLogs = moodLogs.filter(log => new Date(log.timestamp) >= cutoffDate);

  // Group energy readings by hour
  recentLogs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    if (hour >= 6 && hour <= 22) {
      hourlyData[hour].push(log.energy);
    }
  });

  // Calculate hourly averages
  const hourlyAverages: HourlyEnergy[] = Object.entries(hourlyData)
    .map(([hour, energies]) => ({
      hour: parseInt(hour),
      avgEnergy: energies.length > 0
        ? energies.reduce((a, b) => a + b, 0) / energies.length
        : 0,
      sampleCount: energies.length,
    }))
    .filter(h => h.sampleCount > 0)
    .sort((a, b) => a.hour - b.hour);

  // Calculate overall average
  const allEnergies = recentLogs.map(l => l.energy);
  const overallAverage = allEnergies.length > 0
    ? allEnergies.reduce((a, b) => a + b, 0) / allEnergies.length
    : 3; // Default to middle value

  // Identify peak hours (above 75th percentile)
  const energyValues = hourlyAverages.map(h => h.avgEnergy).filter(e => e > 0);
  const sortedEnergies = [...energyValues].sort((a, b) => a - b);
  const p75 = sortedEnergies[Math.floor(sortedEnergies.length * 0.75)] || 4;
  const p25 = sortedEnergies[Math.floor(sortedEnergies.length * 0.25)] || 2;

  const peakHours = hourlyAverages
    .filter(h => h.avgEnergy >= p75 && h.sampleCount >= 2)
    .map(h => h.hour);

  const lowHours = hourlyAverages
    .filter(h => h.avgEnergy <= p25 && h.sampleCount >= 2)
    .map(h => h.hour);

  // Generate recommendations
  const recommendations: string[] = [];

  if (peakHours.length > 0) {
    const peakRanges = formatHourRanges(peakHours);
    recommendations.push(`Your peak energy times are around ${peakRanges}. Schedule challenging tasks during these hours.`);
  }

  if (lowHours.length > 0) {
    const lowRanges = formatHourRanges(lowHours);
    recommendations.push(`Energy tends to dip around ${lowRanges}. Save these for routine tasks or take breaks.`);
  }

  // Check for common patterns
  if (peakHours.some(h => h >= 9 && h <= 11)) {
    recommendations.push("You're a morning person! Tackle your hardest tasks before lunch.");
  } else if (peakHours.some(h => h >= 14 && h <= 17)) {
    recommendations.push("Your energy peaks in the afternoon. Consider protecting this time for deep work.");
  } else if (peakHours.some(h => h >= 19 && h <= 22)) {
    recommendations.push("You're an evening person. Use nighttime for creative or focused work.");
  }

  if (recentLogs.length < 5) {
    recommendations.push("Log more mood/energy check-ins to get better scheduling insights!");
  }

  return {
    hourlyAverages,
    peakHours,
    lowHours,
    recommendations,
    overallAverage,
  };
}

/**
 * Suggest optimal times for a task based on its resistance level and energy patterns
 */
export function suggestOptimalTimes(
  resistance: number,
  patterns: EnergyPattern,
  existingBlocks: { startTime: string; endTime: string }[] = []
): TimeRecommendation[] {
  const recommendations: TimeRecommendation[] = [];

  // Determine minimum energy needed based on resistance
  // High resistance tasks need high energy times
  const minEnergyNeeded = resistance >= 7 ? 4 : resistance >= 4 ? 3 : 2;

  patterns.hourlyAverages.forEach(hourData => {
    // Skip hours with insufficient data
    if (hourData.sampleCount < 2) return;

    // Check if hour is blocked
    const isBlocked = existingBlocks.some(block => {
      const blockStart = parseInt(block.startTime.split(':')[0]);
      const blockEnd = parseInt(block.endTime.split(':')[0]);
      return hourData.hour >= blockStart && hourData.hour < blockEnd;
    });

    if (isBlocked) return;

    let quality: TimeRecommendation['quality'];
    let reason: string;

    if (hourData.avgEnergy >= 4 && resistance >= 7) {
      quality = 'optimal';
      reason = 'High energy time for challenging tasks';
    } else if (hourData.avgEnergy >= minEnergyNeeded) {
      quality = patterns.peakHours.includes(hourData.hour) ? 'optimal' : 'good';
      reason = quality === 'optimal' ? 'Peak energy period' : 'Sufficient energy level';
    } else if (hourData.avgEnergy >= minEnergyNeeded - 1) {
      quality = 'acceptable';
      reason = 'Moderate energy - task may feel harder';
    } else {
      quality = 'avoid';
      reason = 'Low energy period - may struggle with this task';
    }

    recommendations.push({
      hour: hourData.hour,
      label: formatHour(hourData.hour),
      reason,
      quality,
    });
  });

  // Sort by quality (optimal first) then by hour
  const qualityOrder = { optimal: 0, good: 1, acceptable: 2, avoid: 3 };
  return recommendations.sort((a, b) => {
    const qualityDiff = qualityOrder[a.quality] - qualityOrder[b.quality];
    if (qualityDiff !== 0) return qualityDiff;
    return a.hour - b.hour;
  });
}

/**
 * Get energy level color for visualization
 */
export function getEnergyColor(energy: number): string {
  if (energy >= 4.5) return '#22c55e'; // green-500
  if (energy >= 3.5) return '#84cc16'; // lime-500
  if (energy >= 2.5) return '#eab308'; // yellow-500
  if (energy >= 1.5) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Get energy level background color (semi-transparent)
 */
export function getEnergyBgColor(energy: number, opacity: number = 0.2): string {
  if (energy >= 4.5) return `rgba(34, 197, 94, ${opacity})`; // green
  if (energy >= 3.5) return `rgba(132, 204, 22, ${opacity})`; // lime
  if (energy >= 2.5) return `rgba(234, 179, 8, ${opacity})`; // yellow
  if (energy >= 1.5) return `rgba(249, 115, 22, ${opacity})`; // orange
  return `rgba(239, 68, 68, ${opacity})`; // red
}

/**
 * Get energy level label
 */
export function getEnergyLabel(energy: number): string {
  if (energy >= 4.5) return 'High Energy';
  if (energy >= 3.5) return 'Good Energy';
  if (energy >= 2.5) return 'Moderate';
  if (energy >= 1.5) return 'Low Energy';
  return 'Very Low';
}

// Helper functions
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatHourRanges(hours: number[]): string {
  if (hours.length === 0) return '';
  if (hours.length === 1) return formatHour(hours[0]);

  // Group consecutive hours
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(formatHour(rangeStart));
      } else {
        ranges.push(`${formatHour(rangeStart)}-${formatHour(rangeEnd)}`);
      }
      if (i < sorted.length) {
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }
  }

  return ranges.join(', ');
}
