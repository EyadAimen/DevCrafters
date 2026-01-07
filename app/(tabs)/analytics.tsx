import * as React from "react";
import { useState, useEffect } from "react";
import {Text, StyleSheet, View, Pressable, Image, ScrollView, Dimensions, ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { LinearGradient, Stop, Defs, Path, G, Circle, Polygon, Line, Rect, Text as SvgText } from "react-native-svg";
import BottomNavigation from "../../components/BottomNavigation";
import { supabase } from "../../lib/supabase";

const AdherenceIcon = ({ color = "#0ea5e9", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="2" fill={color} />
  </Svg>
);

const DosesIcon = ({ color = "#0ea5e9", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="2" />
    <Line x1="7" y1="7" x2="17" y2="17" stroke={color} strokeWidth="2" />
    <Line x1="17" y1="7" x2="7" y2="17" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="2" fill={color} />
  </Svg>
);

const StreakIcon = ({ color = "#0ea5e9", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L14.5 8.5L21 9L16 13.5L17.5 21L12 17L6.5 21L8 13.5L3 9L9.5 8.5L12 2Z" 
          fill={color} stroke={color} strokeWidth="1.5" />
  </Svg>
);

const MissedIcon = ({ color = "#0ea5e9", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Line x1="8" y1="8" x2="16" y2="16" stroke={color} strokeWidth="2" />
    <Line x1="16" y1="8" x2="8" y2="16" stroke={color} strokeWidth="2" />
  </Svg>
);

const ChangeIcon = ({ isPositive = true, size = 12 }) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    {isPositive ? (
      <Path d="M6 3L9 8H3L6 3Z" fill="#00a63e" />
    ) : (
      <Path d="M6 9L3 4H9L6 9Z" fill="#ef4444" />
    )}
  </Svg>
);

type PeriodType = 'lifetime' | 'week' | 'month' | 'quarter' | 'year';
type TabType = 'adherence' | 'intake' | 'trends';

interface AnalyticsData {
  adherence: number;
  totalDoses: number;
  streak: number;
  missedDoses: number;
  dailyData: number[];
  medicationBreakdown: Array<{name: string, adherence: number, dosesTaken: number}>;
}

interface IntakeData {
  pieData: Array<{name: string, doses: number, percentage: number, color: string}>;
  totalDosesByMedicine: Array<{name: string, doses: number, percentage: number}>;
}

interface TrendData {
  hasImproved: boolean;
  percentageChange: number;
  message: string;
  previousAdherence: number;
  currentAdherence: number;
}

const App1 = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('lifetime');  // Default to 'lifetime'
  const [selectedTab, setSelectedTab] = useState<TabType>('adherence');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    adherence: 0,
    totalDoses: 0,
    streak: 0,
    missedDoses: 0,
    dailyData: [],
    medicationBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [firstDoseDate, setFirstDoseDate] = useState<Date | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<PeriodType[]>(['lifetime']); // Track available periods

  const [intakeData, setIntakeData] = useState<IntakeData>({
    pieData: [],
    totalDosesByMedicine: []
  });

  const [trendData, setTrendData] = useState<TrendData>({
    hasImproved: false,
    percentageChange: 0,
    message: "",
    previousAdherence: 0,
    currentAdherence: 0
  });

  // Get the first dose date
  const getFirstDoseDate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('intake')
        .select('intake_time')
        .eq('user_id', user.id)
        .order('intake_time', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        return new Date(data[0].intake_time);
      }
      return null;
    } catch (error) {
      console.error('Error getting first dose date:', error);
      return null;
    }
  };

  // Calculate analytics from intake data
  const calculateAvailablePeriods = (firstDoseDate: Date | null): PeriodType[] => {
  if (!firstDoseDate) {
    return ['lifetime']; // Only show lifetime if no data
  }

  const now = new Date();
  const daysSinceFirstDose = Math.ceil((now.getTime() - firstDoseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const periods: PeriodType[] = ['lifetime'];
  
  if (daysSinceFirstDose >= 7) {
    periods.push('week');
  }
  if (daysSinceFirstDose >= 30) {
    periods.push('month');
  }
  if (daysSinceFirstDose >= 90) {
    periods.push('quarter');
  }
  if (daysSinceFirstDose >= 365) {
    periods.push('year');
  }
  
  return periods;
};

  // Calculate analytics from intake data
  const calculateAnalyticsFromIntake = async (period: PeriodType, intakeData: any[]) => {
  if (intakeData.length === 0) {
    return {
      adherence: 0,
      totalDoses: 0,
      streak: 0,
      missedDoses: 0,
      dailyData: [],
      medicationBreakdown: []
    };
  }

  const now = new Date();
  let periodStart: Date;
  let daysInPeriod: number;

  if (period === 'lifetime') {
    // For lifetime, calculate from first dose to now
    if (firstDoseDate) {
      periodStart = firstDoseDate;
      daysInPeriod = Math.ceil((now.getTime() - firstDoseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      // If no first dose date but we have data, use earliest data point
      const earliestDate = new Date(Math.min(...intakeData.map(item => new Date(item.intake_time).getTime())));
      periodStart = earliestDate;
      daysInPeriod = Math.ceil((now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  } else {
    // Calculate period based on first dose date
    if (firstDoseDate) {
      const daysSinceFirstDose = Math.ceil((now.getTime() - firstDoseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      switch (period) {
        case 'week':
          daysInPeriod = Math.min(7, daysSinceFirstDose);
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - (daysInPeriod - 1));
          break;
        case 'month':
          daysInPeriod = Math.min(30, daysSinceFirstDose);
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - (daysInPeriod - 1));
          break;
        case 'quarter':
          daysInPeriod = Math.min(90, daysSinceFirstDose);
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - (daysInPeriod - 1));
          break;
        case 'year':
          daysInPeriod = Math.min(365, daysSinceFirstDose);
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - (daysInPeriod - 1));
          break;
        default:
          daysInPeriod = Math.min(7, daysSinceFirstDose);
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - (daysInPeriod - 1));
      }
    } else {
      // Fallback if no first dose date
      switch (period) {
        case 'week':
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - 6);
          daysInPeriod = 7;
          break;
        case 'month':
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - 29);
          daysInPeriod = 30;
          break;
        case 'quarter':
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - 89);
          daysInPeriod = 90;
          break;
        case 'year':
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - 364);
          daysInPeriod = 365;
          break;
        default:
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - 6);
          daysInPeriod = 7;
      }
    }
  }

  // Filter intake data for the period
  const periodIntake = intakeData.filter(item => {
    const intakeTime = new Date(item.intake_time);
    return intakeTime >= periodStart && intakeTime <= now;
  });

  // Get all unique medicines that should be taken (based on entire history)
  const allMedicines = [...new Set(intakeData.map(item => item.medicine_name))];
  
  const totalDoses = periodIntake.length;
  
  // Calculate adherence for the period
  const expectedDosesForPeriod = daysInPeriod * allMedicines.length;
  const adherence = expectedDosesForPeriod > 0 ? Math.round((totalDoses / expectedDosesForPeriod) * 100) : 0;

  // Calculate streak (consecutive days with at least one intake in the period)
  const intakeByDate = new Map<string, number>();
  periodIntake.forEach(item => {
    const date = new Date(item.intake_time).toDateString();
    intakeByDate.set(date, (intakeByDate.get(date) || 0) + 1);
  });

  let streak = 0;
  const allDates: string[] = [];
  for (let i = 0; i < daysInPeriod; i++) {
    const date = new Date(periodStart);
    date.setDate(periodStart.getDate() + i);
    allDates.unshift(date.toDateString());
  }

  let currentStreak = 0;
  for (const date of allDates) {
    if (intakeByDate.has(date)) {
      currentStreak++;
    } else {
      break;
    }
  }
  streak = currentStreak;

  // Calculate medication breakdown
  const medicationBreakdown = allMedicines.map(name => {
    const dosesTaken = periodIntake.filter(item => item.medicine_name === name).length;
    const medAdherence = daysInPeriod > 0 ? Math.round((dosesTaken / daysInPeriod) * 100) : 0;
    return { name, adherence: medAdherence, dosesTaken };
  });

  // Calculate missed doses
  let missedDoses = 0;
  if (period === 'lifetime' && firstDoseDate) {
    // For lifetime, calculate from first dose to now
    missedDoses = calculateTotalMissedDoses(firstDoseDate, intakeData);
  } else {
    // For other periods, calculate missed doses for that period only
    missedDoses = Math.max(0, expectedDosesForPeriod - totalDoses);
  }

  // Calculate daily data points for chart
  const dailyData = calculateDailyData(period, periodIntake, periodStart, now, allMedicines);

  return {
    adherence,
    totalDoses,
    streak,
    missedDoses,
    dailyData,
    medicationBreakdown
  };
};

  const calculateDailyData = (period: PeriodType, intakeData: any[], periodStart: Date, periodEnd: Date, allMedicines: string[]) => {
  const dataPoints: number[] = [];
  
  if (intakeData.length === 0 || allMedicines.length === 0) {
    // Return empty data points based on period
    switch (period) {
      case 'lifetime': 
        // For lifetime, show monthly data if more than 30 days, otherwise weekly
        const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > 30) {
          const months = Math.ceil(daysDiff / 30);
          return Array(Math.min(months, 12)).fill(0); // Max 12 months
        } else {
          const weeks = Math.ceil(daysDiff / 7);
          return Array(Math.min(weeks, 8)).fill(0); // Max 8 weeks
        }
      case 'week': return Array(7).fill(0);
      case 'month': return Array(4).fill(0);
      case 'quarter': return Array(3).fill(0);
      case 'year': return Array(4).fill(0);
      default: return Array(7).fill(0);
    }
  }
  
  // Group intake by time unit based on period
  const intakeByUnit = new Map<string, number>();
  
  intakeData.forEach(item => {
    const intakeTime = new Date(item.intake_time);
    let unitKey: string;
    
    switch (period) {
      case 'lifetime':
        // For lifetime, group by month if more than 30 days, otherwise by week
        const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > 30) {
          // Group by month
          const monthName = intakeTime.toLocaleString('default', { month: 'short', year: 'numeric' });
          unitKey = monthName;
        } else {
          // Group by week
          const weekNumber = Math.floor((intakeTime.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
          unitKey = `Week ${weekNumber + 1}`;
        }
        break;
      case 'week':
        unitKey = intakeTime.toDateString();
        break;
      case 'month':
        // Group by week
        const weekNumber = Math.floor((intakeTime.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        unitKey = `Week ${weekNumber + 1}`;
        break;
      case 'quarter':
        // Group by month
        const monthName = intakeTime.toLocaleString('default', { month: 'short' });
        unitKey = monthName;
        break;
      case 'year':
        // Group by quarter
        const quarter = Math.floor(intakeTime.getMonth() / 3) + 1;
        unitKey = `Q${quarter}`;
        break;
      default:
        unitKey = intakeTime.toDateString();
    }
    
    intakeByUnit.set(unitKey, (intakeByUnit.get(unitKey) || 0) + 1);
  });

  // Calculate adherence per time unit
  switch (period) {
    case 'lifetime':
      const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > 30) {
        // Show monthly data
        const months = Math.ceil(daysDiff / 30);
        for (let month = 0; month < months; month++) {
          const monthDate = new Date(periodStart);
          monthDate.setMonth(periodStart.getMonth() + month);
          const monthKey = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
          const dosesTaken = intakeByUnit.get(monthKey) || 0;
          const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
          const adherence = allMedicines.length > 0 ? Math.round((dosesTaken / (allMedicines.length * daysInMonth)) * 100) : 0;
          dataPoints.push(adherence);
          if (dataPoints.length >= 12) break; // Limit to 12 months
        }
      } else {
        // Show weekly data
        const weeks = Math.ceil(daysDiff / 7);
        for (let week = 0; week < weeks; week++) {
          const weekKey = `Week ${week + 1}`;
          const dosesTaken = intakeByUnit.get(weekKey) || 0;
          const adherence = allMedicines.length > 0 ? Math.round((dosesTaken / (allMedicines.length * 7)) * 100) : 0;
          dataPoints.push(adherence);
        }
      }
      break;
      
    case 'week':
      for (let i = 0; i < 7; i++) {
        const date = new Date(periodStart);
        date.setDate(periodStart.getDate() + i);
        if (date > periodEnd) break;
        
        const dateKey = date.toDateString();
        const dosesTaken = intakeByUnit.get(dateKey) || 0;
        const adherence = allMedicines.length > 0 ? Math.round((dosesTaken / allMedicines.length) * 100) : 0;
        dataPoints.push(adherence);
      }
      // Fill remaining days with 0 if needed
      while (dataPoints.length < 7) {
        dataPoints.push(0);
      }
      break;
      
    case 'month':
      for (let week = 0; week < 4; week++) {
        const weekKey = `Week ${week + 1}`;
        const dosesTaken = intakeByUnit.get(weekKey) || 0;
        const adherence = allMedicines.length > 0 ? Math.round((dosesTaken / (allMedicines.length * 7)) * 100) : 0;
        dataPoints.push(adherence);
      }
      break;
      
    case 'quarter':
      for (let month = 0; month < 3; month++) {
        const monthDate = new Date(periodStart);
        monthDate.setMonth(periodStart.getMonth() + month);
        const monthKey = monthDate.toLocaleString('default', { month: 'short' });
        const dosesTaken = intakeByUnit.get(monthKey) || 0;
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const adherence = allMedicines.length > 0 ? Math.round((dosesTaken / (allMedicines.length * daysInMonth)) * 100) : 0;
        dataPoints.push(adherence);
      }
      break;
      
    case 'year':
      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterKey = `Q${quarter}`;
        const dosesTaken = intakeByUnit.get(quarterKey) || 0;
        const adherence = allMedicines.length > 0 ? Math.round((dosesTaken / (allMedicines.length * 90)) * 100) : 0;
        dataPoints.push(adherence);
      }
      break;
  }

  return dataPoints;
};

const calculateTotalMissedDoses = (firstDoseDate: Date | null, allIntakeData: any[]) => {
  if (!firstDoseDate || allIntakeData.length === 0) {
    return 0;
  }

  const now = new Date();
  const allMedicines = [...new Set(allIntakeData.map(item => item.medicine_name))];
  
  // Calculate total days from first dose to now
  const totalDays = Math.ceil((now.getTime() - firstDoseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate expected doses (1 per medicine per day)
  const totalExpectedDoses = totalDays * allMedicines.length;
  
  // Calculate actual doses
  const totalActualDoses = allIntakeData.length;
  
  // Calculate missed doses
  const missedDoses = Math.max(0, totalExpectedDoses - totalActualDoses);
  
  return missedDoses;
};

  const fetchAnalyticsFromSupabase = async (period: PeriodType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get all intake data for this user
      const { data: allIntakeData, error } = await supabase
        .from('intake')
        .select('id, user_id, medicine_name, intake_time')
        .eq('user_id', user.id)
        .order('intake_time', { ascending: true });

      if (error) {
        console.error('Error fetching intake data:', error);
        return null;
      }

      if (!allIntakeData || allIntakeData.length === 0) {
        return null; // No intake data
      }

      // Calculate analytics from the intake data
      const analytics = await calculateAnalyticsFromIntake(period, allIntakeData);
      
      // Calculate trend data (only for periods other than lifetime)
      let trendDataNew: TrendData = {
        hasImproved: false,
        percentageChange: 0,
        message: "",
        previousAdherence: 0,
        currentAdherence: 0
      };

      if (period !== 'lifetime') {
        const previousPeriodAnalytics = await calculatePreviousPeriodAnalytics(period, allIntakeData);
        const hasImproved = analytics.adherence > previousPeriodAnalytics.adherence;
        const percentageChange = Math.abs(analytics.adherence - previousPeriodAnalytics.adherence);
        
        let message = "";
        if (analytics.adherence > 0) {
          message = hasImproved
            ? `Your adherence has improved by ${percentageChange.toFixed(1)}% ${getPeriodLabel(period).toLowerCase()}. Keep up the great work!`
            : `Your adherence has decreased by ${percentageChange.toFixed(1)}% ${getPeriodLabel(period).toLowerCase()}. Please consider maintaining regular medication intake.`;
        } else {
          message = "No adherence data available for this period.";
        }

        trendDataNew = {
          hasImproved,
          percentageChange,
          message,
          previousAdherence: previousPeriodAnalytics.adherence,
          currentAdherence: analytics.adherence
        };
      } else {
        // For lifetime, show a different message
        const daysSinceFirstDose = firstDoseDate ? 
          Math.ceil((new Date().getTime() - firstDoseDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        trendDataNew.message = daysSinceFirstDose > 0 
          ? `You've been tracking your medication for ${daysSinceFirstDose} days. Your lifetime adherence rate is ${analytics.adherence}%.`
          : "View your overall medication adherence history.";
      }

      return { analyticsData: analytics, trendData: trendDataNew };
      
    } catch (error) {
      console.error('Error in fetchAnalyticsFromSupabase:', error);
      return null;
    }
  };

  const calculatePreviousPeriodAnalytics = async (period: PeriodType, allIntakeData: any[]) => {
    const now = new Date();
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    switch (period) {
      case 'week':
        previousPeriodStart = new Date(now);
        previousPeriodStart.setDate(now.getDate() - 13);
        previousPeriodEnd = new Date(now);
        previousPeriodEnd.setDate(now.getDate() - 7);
        break;
      case 'month':
        previousPeriodStart = new Date(now);
        previousPeriodStart.setDate(now.getDate() - 59);
        previousPeriodEnd = new Date(now);
        previousPeriodEnd.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        previousPeriodStart = new Date(now);
        previousPeriodStart.setDate(now.getDate() - 179);
        previousPeriodEnd = new Date(now);
        previousPeriodEnd.setDate(now.getDate() - 90);
        break;
      case 'year':
        previousPeriodStart = new Date(now);
        previousPeriodStart.setDate(now.getDate() - 729);
        previousPeriodEnd = new Date(now);
        previousPeriodEnd.setDate(now.getDate() - 365);
        break;
      default:
        previousPeriodStart = new Date(now);
        previousPeriodStart.setDate(now.getDate() - 13);
        previousPeriodEnd = new Date(now);
        previousPeriodEnd.setDate(now.getDate() - 7);
    }

    const previousIntakeData = allIntakeData.filter(item => {
      const intakeTime = new Date(item.intake_time);
      return intakeTime >= previousPeriodStart && intakeTime <= previousPeriodEnd;
    });

    if (previousIntakeData.length === 0) {
      return { adherence: 0 };
    }

    // Simplified calculation for previous period
    const uniqueMedicines = [...new Set(previousIntakeData.map(item => item.medicine_name))];
    const daysInPeriod = Math.ceil((previousPeriodEnd.getTime() - previousPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDoses = previousIntakeData.length;
    const expectedDoses = daysInPeriod * uniqueMedicines.length;
    const adherence = expectedDoses > 0 ? Math.round((totalDoses / expectedDoses) * 100) : 0;

    return { adherence };
  };

  const fetchAnalytics = async () => {
  try {
    setLoading(true);

    // Get first dose date
    const firstDate = await getFirstDoseDate();
    setFirstDoseDate(firstDate);

    // Calculate available periods based on first dose date
    const periods = calculateAvailablePeriods(firstDate);
    setAvailablePeriods(periods);

    // If current selected period is not available, switch to lifetime
    if (!periods.includes(selectedPeriod)) {
      setSelectedPeriod('lifetime');
    }

    // Fetch all intake data for this user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: allIntakeData, error } = await supabase
      .from('intake')
      .select('id, user_id, medicine_name, intake_time')
      .eq('user_id', user.id)
      .order('intake_time', { ascending: true });

    if (error) {
      console.error('Error fetching intake data:', error);
      setLoading(false);
      return;
    }

    // Fetch analytics from Supabase
    const supabaseData = await fetchAnalyticsFromSupabase(selectedPeriod);
    if (supabaseData) {
      // Update missed doses with the calculated total for lifetime
      let missedDoses = supabaseData.analyticsData.missedDoses;
      if (selectedPeriod === 'lifetime' && firstDate) {
        missedDoses = calculateTotalMissedDoses(firstDate, allIntakeData || []);
      }
      
      const updatedAnalyticsData = {
        ...supabaseData.analyticsData,
        missedDoses
      };
      
      setAnalyticsData(updatedAnalyticsData);
      setTrendData(supabaseData.trendData);
      
      // Update intake data
      updateIntakeData(updatedAnalyticsData.medicationBreakdown, updatedAnalyticsData.totalDoses);
    } else {
      // No data available
      setAnalyticsData({
        adherence: 0,
        totalDoses: 0,
        streak: 0,
        missedDoses: 0,
        dailyData: [],
        medicationBreakdown: []
      });
      setTrendData({
        hasImproved: false,
        percentageChange: 0,
        message: "No medication intake data available. Start by logging your first dose!",
        previousAdherence: 0,
        currentAdherence: 0
      });
      setIntakeData({
        pieData: [],
        totalDosesByMedicine: []
      });
    }
  } catch (error) {
    console.error('Error in fetchAnalytics:', error);
  } finally {
    setLoading(false);
  }
};

  const updateIntakeData = (medicationBreakdown: Array<{name: string, adherence: number, dosesTaken: number}>, totalDoses: number) => {
  if (medicationBreakdown.length === 0 || totalDoses === 0) {
    setIntakeData({
      pieData: [],
      totalDosesByMedicine: []
    });
    return;
  }

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

  // First, create initial pie data with raw percentages
  const pieData = medicationBreakdown.map((medication, index) => {
    const percentage = totalDoses > 0 ? (medication.dosesTaken / totalDoses) * 100 : 0;
    return {
      name: medication.name,
      doses: medication.dosesTaken,
      percentage: Math.round(percentage * 100) / 100, // Keep 2 decimal places for calculation
      color: colors[index % colors.length]
    };
  });

  // Filter out items with 0 doses
  const filteredPieData = pieData.filter(item => item.doses > 0);

  if (filteredPieData.length === 0) {
    setIntakeData({
      pieData: [],
      totalDosesByMedicine: []
    });
    return;
  }

  // Calculate total percentage for normalization
  const totalPercentage = filteredPieData.reduce((sum, item) => sum + item.percentage, 0);
  
  // Normalize percentages to sum to 100
  const normalizedPieData = filteredPieData.map(item => ({
    ...item,
    percentage: Math.round((item.percentage / totalPercentage) * 100)
  }));

  // Adjust rounding errors
  let sumRounded = normalizedPieData.reduce((sum, item) => sum + item.percentage, 0);
  let difference = 100 - sumRounded;
  
  if (difference !== 0 && normalizedPieData.length > 0) {
    // Sort by percentage in descending order and adjust the largest one
    const sortedData = [...normalizedPieData].sort((a, b) => b.percentage - a.percentage);
    const largestItem = sortedData[0];
    const index = normalizedPieData.findIndex(item => item.name === largestItem.name);
    if (index !== -1) {
      normalizedPieData[index].percentage += difference;
    }
  }

  setIntakeData({
    pieData: normalizedPieData,
    totalDosesByMedicine: normalizedPieData.map(item => ({
      name: item.name,
      doses: item.doses,
      percentage: item.percentage
    }))
  });
};

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  useEffect(() => {
    if (analyticsData.adherence > 0 && analyticsData.medicationBreakdown.length > 0) {
      if (selectedTab === 'intake') {
        updateIntakeData(analyticsData.medicationBreakdown, analyticsData.totalDoses);
      } else if (selectedTab === 'trends') {
        // Trend data is already calculated in fetchAnalyticsFromSupabase
      }
    }
  }, [analyticsData, selectedTab]);

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
  };

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab);
  };

  const getPeriodLabel = (period: PeriodType) => {
    switch (period) {
      case 'week': return 'This week';
      case 'month': return 'This month';
      case 'quarter': return 'This quarter';
      case 'year': return 'This year';
      default: return 'Lifetime';
    }
  };

  const getPeriodDataLabels = (period: PeriodType) => {
    switch (period) {
      case 'week':
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      case 'month':
        return ['W1', 'W2', 'W3', 'W4'];
      case 'quarter':
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const labels = [];
        for (let i = 2; i >= 0; i--) {
          const month = new Date(now);
          month.setMonth(now.getMonth() - i);
          labels.push(monthNames[month.getMonth()]);
        }
        return labels;
      case 'year':
        return ['Q1', 'Q2', 'Q3', 'Q4'];
      default:
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
  };

  const renderPieChart = (data: Array<{name: string, doses: number, percentage: number, color: string}>) => {
  if (data.length === 0) {
    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChartTop}>
          <View style={styles.actualPieLarge}>
            <Svg width={180} height={180} viewBox="0 0 180 180">
              <Circle cx="90" cy="90" r="90" fill="#f1f5f9" />
              <SvgText x="90" y="90" textAnchor="middle" fill="#64748b" fontSize="14">
                No Data
              </SvgText>
            </Svg>
            <View style={styles.pieOverlayLarge}>
              <View style={styles.pieCenterContent}>
                <Text style={styles.pieCenterTextLarge}>Total</Text>
                <Text style={styles.pieCenterSubtext}>0 doses</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.pieChartBottom}>
          <Text style={styles.noDataText}>No medication intake recorded</Text>
        </View>
      </View>
    );
  }

  const size = 180;
  const radius = 90;
  const centerX = size / 2;
  const centerY = size / 2;

  // Calculate cumulative percentages for pie slices
  let cumulativePercentage = 0;
  
  const paths = data.map((item, index) => {
    if (item.percentage === 0) return null;
    
    // Convert percentage to angle (360 degrees)
    const angle = (item.percentage / 100) * 360;
    
    // Calculate start and end points in radians
    const startAngle = cumulativePercentage;
    const endAngle = startAngle + angle;
    
    const startAngleRad = (startAngle - 90) * Math.PI / 180;
    const endAngleRad = (endAngle - 90) * Math.PI / 180;
    
    // Calculate points on the circle
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    // Determine if we need to draw a large arc
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Create the path data
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    // Update cumulative percentage for next slice
    cumulativePercentage += angle;
    
    return (
      <Path key={`slice-${index}`} d={pathData} fill={item.color} />
    );
  }).filter(Boolean); // Remove null slices

  const totalDoses = data.reduce((sum, d) => sum + d.doses, 0);

  return (
    <View style={styles.pieChartContainer}>
      <View style={styles.pieChartTop}>
        <View style={styles.actualPieLarge}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {paths}
            {/* Draw a circle in the center to create a donut chart effect */}
            <Circle cx={centerX} cy={centerY} r={radius * 0.4} fill="white" />
          </Svg>

          <View style={styles.pieOverlayLarge}>
            <View style={styles.pieCenterContent}>
              <Text style={styles.pieCenterTextLarge}>Total</Text>
              <Text style={styles.pieCenterSubtext}>
                {totalDoses} dose{totalDoses !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.pieChartBottom}>
        {data.map((item, index) => (
          <View key={item.name} style={styles.pieItem}>
            <View style={[styles.pieLegendColor, { backgroundColor: item.color }]} />
            <Text style={styles.pieLegendText}>
              {item.name}: {item.percentage}% ({item.doses} dose{item.doses !== 1 ? 's' : ''})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

  const renderAdherenceChart = (data: number[], period: PeriodType) => {
    const labels = getPeriodDataLabels(period);
    
    if (data.length === 0) {
      return (
        <View style={styles.barChartContainer}>
          <Text style={styles.noDataText}>No adherence data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.barChartContainer}>
        {data.map((value, index) => {
          const label = labels[index] || '';

          return (
            <View key={`bar-${index}`} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(20, (value / 100) * 200) }
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{label}</Text>
              <Text style={styles.barValue}>{value}%</Text>
            </View>
          );
        })}
      </View>
    );
  };

 const renderTrendsChart = () => {
  const dataPoints = analyticsData.dailyData;
  const labels = getPeriodDataLabels(selectedPeriod);

  if (dataPoints.length === 0) {
    return (
      <View style={styles.trendsContentWrapper}>
        <View style={styles.properTrendsContainer}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendHeaderLabel}>
              {selectedPeriod === 'lifetime' && 'Overall Adherence Trend'}
              {selectedPeriod === 'week' && 'Daily Adherence Trend'}
              {selectedPeriod === 'month' && 'Weekly Adherence Trend'}
              {selectedPeriod === 'quarter' && 'Monthly Adherence Trend'}
              {selectedPeriod === 'year' && 'Quarterly Adherence Trend'}
            </Text>
          </View>
          <View style={styles.chartWrapper}>
            <Text style={styles.noDataText}>No trend data available</Text>
          </View>
        </View>
      </View>
    );
  }

  // Determine overall trend direction
  const firstValue = dataPoints[0] || 0;
  const lastValue = dataPoints[dataPoints.length - 1] || 0;
  const isTrendUpward = lastValue >= firstValue;
  const trendColor = isTrendUpward ? '#10B981' : '#EF4444';
  const averageValue = Math.round(dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length);

  return (
    <View style={styles.trendsContentWrapper}>
      <View style={styles.properTrendsContainer}>
        <View style={styles.trendHeader}>
          <Text style={styles.trendHeaderLabel}>
            {selectedPeriod === 'lifetime' && 'Overall Adherence Trend'}
            {selectedPeriod === 'week' && 'Daily Adherence Trend'}
            {selectedPeriod === 'month' && 'Weekly Adherence Trend'}
            {selectedPeriod === 'quarter' && 'Monthly Adherence Trend'}
            {selectedPeriod === 'year' && 'Quarterly Adherence Trend'}
          </Text>
          <View style={styles.trendIndicator}>
            <View style={[styles.trendDot, { backgroundColor: trendColor }]} />
            <Text style={[
              styles.trendIndicatorText,
              { color: trendColor }
            ]}>
              {isTrendUpward ? '↑ Improving' : '↓ Needs attention'}
            </Text>
          </View>
        </View>

        {/* Simple Line Chart */}
        <View style={styles.simpleChartContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[100, 75, 50, 25, 0].map((value) => (
              <Text key={value} style={styles.yAxisLabel}>{value}%</Text>
            ))}
          </View>

          {/* Chart area */}
          <View style={styles.chartArea}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(level => (
              <View 
                key={level} 
                style={[
                  styles.gridLine, 
                  { 
                    top: `${level * 25}%`,
                  }
                ]} 
              />
            ))}

            {/* Line chart using SVG */}
            <View style={styles.lineChartContainer}>
              <Svg height="100%" width="100%" viewBox={`0 0 ${dataPoints.length * 100} 100`} preserveAspectRatio="none">
                {/* Create the line path */}
                <Path
                  d={dataPoints.map((value, index) => {
                    const x = index * 100;
                    const y = 100 - value; // Invert since SVG y=0 is top
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  stroke={trendColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                
                {/* Data points */}
                {dataPoints.map((value, index) => {
                  const x = index * 100;
                  const y = 100 - value;
                  return (
                    <Circle
                      key={`point-${index}`}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={trendColor}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  );
                })}
              </Svg>
            </View>
          </View>
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisContainer}>
          {labels.map((label, index) => (
            <Text key={`label-${index}`} style={styles.xAxisLabel}>
              {label}
            </Text>
          ))}
        </View>

        {/* Current value indicator */}
        {dataPoints.length > 0 && (
          <View style={styles.currentValueContainer}>
            <View style={[styles.currentValueBubble, { backgroundColor: trendColor }]}>
              <Text style={styles.currentValueText}>
                Current: {lastValue}%
              </Text>
            </View>
          </View>
        )}

        {/* Trend summary stats */}
        <View style={styles.trendStatsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={[styles.statValue, { color: trendColor }]}>
              {lastValue}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {averageValue}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Change</Text>
            <Text style={[styles.statValue, { color: trendColor }]}>
              {isTrendUpward ? '+' : ''}{Math.round(lastValue - firstValue)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading analytics data...</Text>
        </View>
      );
    }

    switch (selectedTab) {
      case 'adherence':
        return (
          <View style={styles.adherenceContainer}>
            <View style={[styles.heading3, styles.analyticsscreenLayout]}>
              <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>
                {selectedPeriod === 'week' ? 'Daily' :
                 selectedPeriod === 'month' ? 'Weekly' :
                 selectedPeriod === 'quarter' ? 'Monthly' :
                 selectedPeriod === 'year' ? 'Quarterly' :
                 'Recent'} Adherence Rate
              </Text>
            </View>
            <View style={styles.chartWrapper}>
              {renderAdherenceChart(analyticsData.dailyData, selectedPeriod)}
            </View>

            <View style={styles.medicationBreakdownContainer}>
              <View style={[styles.heading3, styles.analyticsscreenLayout]}>
                <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>Medication Adherence Breakdown</Text>
              </View>
              {analyticsData.medicationBreakdown.length === 0 ? (
                <Text style={styles.noDataText}>No medication data available</Text>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.breakdownScroll}>
                  {analyticsData.medicationBreakdown.map((medication, index) => (
                    <View key={medication.name} style={styles.medicationCard}>
                      <View style={styles.medicationRow}>
                        <Text style={[styles.medicineName, styles.pdfTypo]}>{medication.name}</Text>
                        <Text style={[styles.adherencePercent, styles.text12Typo]}>{medication.adherence}%</Text>
                      </View>
                      <View style={[styles.progressBarContainer]}>
                        <View style={[styles.progressBar, { width: medication.adherence * 3.27 }]} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        );
      case 'intake':
        return (
          <View style={styles.intakeContainer}>
            <View style={[styles.heading3, styles.analyticsscreenLayout]}>
              <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>Medication Intake Distribution</Text>
            </View>
            <View style={styles.intakeContent}>
              {renderPieChart(intakeData.pieData)}
            </View>

            <View style={styles.medicationBreakdownContainer}>
              <View style={[styles.heading3, styles.analyticsscreenLayout]}>
                <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>Medication Intake Summary</Text>
              </View>
              {intakeData.totalDosesByMedicine.length === 0 ? (
                <Text style={styles.noDataText}>No intake data available</Text>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.breakdownScroll}>
                  {intakeData.totalDosesByMedicine.map((medicine, index) => (
                    <View key={medicine.name} style={styles.intakeSummaryCard}>
                      <View style={styles.intakeSummaryRow}>
                        <Text style={[styles.medicineName, styles.pdfTypo]}>{medicine.name}</Text>
                        <Text style={[styles.adherencePercent, styles.text12Typo]}>{medicine.doses} doses</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        );
      case 'trends':
        return (
          <View style={styles.intakeContainer}>
            <View style={[styles.heading3, styles.analyticsscreenLayout]}>
              <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>
                {getPeriodLabel(selectedPeriod)} Adherence Trend
              </Text>
            </View>

            <View style={styles.trendsContentWrapper}>
              <View style={styles.trendsChartWrapper}>
                {renderTrendsChart()}
              </View>

              <View style={styles.trendSummary}>
                <View style={styles.trendMessage}>
                  <Text style={[styles.trendText, styles.adherenceTypo]}>
                    {trendData.message}
                  </Text>
                </View>
                {trendData.currentAdherence > 0 && (
                  <View style={styles.trendStats}>
                    <Text style={[styles.trendStatsText, styles.pdfTypo]}>
                      Previous: {trendData.previousAdherence.toFixed(1)}% | Current: {trendData.currentAdherence.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  // Update the render function for period buttons
  const renderPeriodButtons = () => {
    const buttonWidth = 60; // Fixed width for each button
    const totalWidth = availablePeriods.length * (buttonWidth + 10) - 10; // 10 is margin between buttons
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.container2, { maxHeight: 40 }]}
        contentContainerStyle={{ width: totalWidth }}
      >
        {availablePeriods.map((period) => (
          <Pressable 
            key={period}
            style={[
              styles.periodButton, 
              selectedPeriod === period ? styles.periodButtonActive : [styles.periodButtonInactive, styles.buttonBorder],
              { width: buttonWidth }
            ]} 
            onPress={() => handlePeriodChange(period)}
          >
            <Text style={selectedPeriod === period ? styles.periodButtonTextActive : styles.periodButtonTextInactive}>
              {period === 'lifetime' ? 'All' : period}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.view}>
        <ScrollView style={styles.scrollview} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.analyticsscreen}>
            <View style={styles.container}>
              <View style={styles.heading1}>
                <Text style={styles.analyticsDashboard}>Analytics Dashboard</Text>
              </View>
              <View style={[styles.paragraph, styles.analyticsscreenLayout]}>
                <Text style={[styles.trackYourMedication, styles.adherenceTypo]}>
                  {firstDoseDate 
                    ? `Tracking since ${firstDoseDate.toLocaleDateString()}`
                    : 'Track your medication adherence and history'
                  }
                </Text>
              </View>
            </View>

            {renderPeriodButtons()}

            <View style={styles.container3}>
              <View style={styles.analyticCard}>
                <View style={styles.analyticsscreen2}>
                  <AdherenceIcon />
                  <Text style={styles.adherence}>Adherence</Text>
                </View>
                <View style={styles.analyticsscreen3}>
                  <Text style={styles.text}>{analyticsData.adherence}%</Text>
                  {analyticsData.adherence > 0 && (
                    <View style={styles.changeContainer}>
                      <ChangeIcon isPositive={analyticsData.adherence >= 80} />
                      <Text style={[styles.text3, { color: analyticsData.adherence >= 80 ? '#00a63e' : '#ef4444' }]}>
                        {analyticsData.adherence >= 80 ? 'Good' : 'Needs improvement'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.analyticCard}>
                <View style={styles.analyticsscreen2}>
                  <DosesIcon />
                  <Text style={styles.adherence}>Total Doses</Text>
                </View>
                <View style={styles.analyticsscreen5}>
                  <Text style={styles.text4}>{analyticsData.totalDoses === 0 ? '-' : analyticsData.totalDoses}</Text>
                </View>
                <View style={styles.analyticsscreen6}>
                  <Text style={styles.thisWeek}>{getPeriodLabel(selectedPeriod)}</Text>
                </View>
              </View>
              <View style={styles.analyticCard}>
                <View style={styles.analyticsscreen2}>
                  <StreakIcon />
                  <Text style={styles.adherence}>Streak</Text>
                </View>
                <View style={styles.analyticsscreen5}>
                  <Text style={styles.text4}>{analyticsData.streak === 0 ? '-' : analyticsData.streak}</Text>
                </View>
                <View style={styles.analyticsscreen6}>
                  <Text style={styles.thisWeek}>Days</Text>
                </View>
              </View>
              <View style={styles.analyticCard}>
                <View style={styles.analyticsscreen2}>
                  <MissedIcon />
                  <Text style={styles.adherence}>Missed</Text>
                </View>
                <View style={styles.analyticsscreen5}>
                  <Text style={styles.text4}>{analyticsData.missedDoses === 0 ? '-' : analyticsData.missedDoses}</Text>
                </View>
                <View style={styles.analyticsscreen6}>
                  <Text style={styles.thisWeek}>{getPeriodLabel(selectedPeriod)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.primitivediv}>
              <View style={styles.tabList}>
                <Pressable style={[selectedTab === 'adherence' ? styles.primitivebutton : styles.primitivebuttonFlexBox, styles.primitivebuttonFlexBox]} onPress={() => handleTabChange('adherence')}>
                  <Text style={[styles.adherence2, styles.adherenceTypo]}>Adherence</Text>
                </Pressable>
              <Pressable style={[selectedTab === 'intake' ? styles.primitivebutton : styles.primitivebuttonFlexBox, styles.primitivebuttonFlexBox]} onPress={() => handleTabChange('intake')}>
                  <Text style={[styles.adherence2, styles.adherenceTypo]}>Intake</Text>
                </Pressable>
                <Pressable style={[selectedTab === 'trends' ? styles.primitivebutton : styles.primitivebuttonFlexBox, styles.primitivebuttonFlexBox]} onPress={() => handleTabChange('trends')}>
                  <Text style={[styles.adherence2, styles.adherenceTypo]}>Trends</Text>
                </Pressable>
              </View>
              <View style={styles.tabPanel}>
                {renderTabContent()}
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={styles.bottomNavWrapper}>
          <BottomNavigation />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  app: {
    flex: 1
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
    height: 32,
    borderRadius: 14,
    marginRight: 10,
  },
  periodButtonActive: {
    backgroundColor: "#0ea5e9",
  },
  periodButtonInactive: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  periodButtonTextActive: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Arimo-Regular",
    textTransform: "capitalize",
  },
  periodButtonTextInactive: {
    color: "#0f172a",
    fontSize: 14,
    fontFamily: "Arimo-Regular",
    textTransform: "capitalize",
  },
  analyticsscreenLayout: {
    height: 20,
    flexDirection: "row"
  },
  adherenceTypo: {
    lineHeight: 20,
    fontSize: 14,
    textAlign: "left",
    fontFamily: "Arimo-Regular"
  },
  badgeSpaceBlock: {
    paddingVertical: 0,
    justifyContent: "center",
    borderRadius: 14
  },
  weekTypo: {
    textTransform: "capitalize",
    lineHeight: 20,
    fontSize: 14,
    textAlign: "left",
    fontFamily: "Arimo-Regular"
  },
  buttonBorder: {
    borderWidth: 1.3,
    borderStyle: "solid"
  },
  buttonInactive: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0"
  },
  pdfTypo: {
    lineHeight: 16,
    fontSize: 12,
    textAlign: "left",
    fontFamily: "Arimo-Regular"
  },
  text3Position: {
    top: -1,
    lineHeight: 16,
    fontSize: 12,
    textAlign: "left",
    fontFamily: "Arimo-Regular",
    left: 0,
    position: "absolute"
  },
  text12Typo: {
    lineHeight: 15,
    fontSize: 10,
    textAlign: "left",
    fontFamily: "Arimo-Regular"
  },
  primitivebuttonFlexBox: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    height: 29,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    flex: 1
  },
  cardBorder: {
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    alignSelf: "stretch"
  },
  buttonLayout: {
    width: 157,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    backgroundColor: "#f8fafc",
    height: 32,
    borderRadius: 14,
    top: 0,
    position: "absolute"
  },
  view: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    width: "100%"
  },
  analyticsscreen: {
    flex: 1,
    gap: 8,
    alignSelf: "stretch",
    paddingBottom: 20,
  },
  container: {
    height: 44,
    alignSelf: "stretch"
  },
  heading1: {
    height: 24,
    alignSelf: "stretch"
  },
  analyticsDashboard: {
    top: -2,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "left",
    fontFamily: "Arimo-Regular",
    color: "#0f172a",
    left: 0,
    position: "absolute"
  },
  paragraph: {
    flexDirection: "row",
    alignSelf: "stretch"
  },
  trackYourMedication: {
    color: "#64748b",
    flex: 1
  },
  container2: {
    overflow: "scroll",
    height: 40,
    alignSelf: "stretch",
  },
  button: {
    width: 59,
    paddingHorizontal: 12,
    backgroundColor: "#0ea5e9",
    paddingVertical: 0,
    justifyContent: "center",
    alignItems: "center",
    height: 32,
    borderRadius: 14,
    top: 0,
    flexDirection: "row",
    left: 0,
    position: "absolute"
  },
  week: {
    color: "#fff"
  },
  button2: {
    left: 67,
    width: 69,
    borderColor: "#e2e8f0",
    backgroundColor: "#0ea5e9",
    borderWidth: 1.3,
    borderStyle: "solid",
    paddingVertical: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    height: 32,
    borderRadius: 14,
    top: 0,
    flexDirection: "row",
    position: "absolute"
  },
  month: {
    color: "#0f172a"
  },
  button3: {
    left: 145,
    width: 76,
    borderColor: "#e2e8f0",
    backgroundColor: "#0ea5e9",
    borderWidth: 1.3,
    borderStyle: "solid",
    paddingVertical: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    height: 32,
    borderRadius: 14,
    top: 0,
    flexDirection: "row",
    position: "absolute"
  },
  button4: {
    left: 229,
    width: 53,
    borderColor: "#e2e8f0",
    backgroundColor: "#0ea5e9",
    borderWidth: 1.3,
    borderStyle: "solid",
    paddingVertical: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    height: 32,
    borderRadius: 14,
    top: 0,
    flexDirection: "row",
    position: "absolute"
  },
  container3: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16
  },
  analyticCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    paddingTop: 10,
    paddingLeft: 10,
    gap: 28,
    height: 136
  },
  analyticsscreen2: {
    gap: 6,
    height: 16,
    flexDirection: "row",
    alignItems: "center"
  },
  adherence: {
    color: "#64748b",
    textAlign: "center"
  },
  analyticsscreen3: {
    height: 28
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    fontFamily: "Arimo-Regular",
    textAlign: "center"
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 10
  },
  icon2: {
    height: 12,
    width: 12
  },
  text3: {
    color: "#00a63e",
    fontSize: 12,
    fontFamily: "Arimo-Regular"
  },
  analyticsscreen5: {
    height: 28,
    flexDirection: "row"
  },
  text4: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    fontFamily: "Arimo-Regular",
    textAlign: "center"
  },
  analyticsscreen6: {
    height: 15,
    flexDirection: "row"
  },
  thisWeek: {
    color: "#64748b",
    flex: 1,
    fontSize: 10,
    fontFamily: "Arimo-Regular",
    textAlign: "left"
  },
  primitivediv: {
    flex: 1,
    gap: 12,
    alignSelf: "stretch"
  },
  tabList: {
    backgroundColor: "#f1f5f9",
    paddingRight: 0,
    alignSelf: "stretch",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    height: 36,
    flexDirection: "row"
  },
  primitivebutton: {
    backgroundColor: "#fff"
  },
  adherence2: {
    color: "#0f172a"
  },
  tabPanel: {
    gap: 8,
    alignSelf: "stretch",
    flex: 1
  },
  card11: {
    height: 179,
    paddingLeft: 12,
    paddingTop: 12,
    gap: 32,
    backgroundColor: "#fff"
  },
  analyticsscreen20: {
    width: 323,
    flexDirection: "row"
  },
  dailyAdherenceRate: {
    color: "#0f172a",
    flex: 1
  },
  analyticsscreen21: {
    width: 323,
    height: 32
  },
  downloadYourMedication: {
    width: 320,
    color: "#64748b"
  },
  button5: {
    left: 0
  },
  icon7: {
    top: 8,
    left: 54,
    width: 16,
    height: 16,
    position: "absolute"
  },
  pdf: {
    top: 7,
    left: 82,
    color: "#0f172a",
    position: "absolute"
  },
  button6: {
    left: 165
  },
  bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
  },
  scrollview: {
    flex: 1
  },
  lineChartContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 10,
    bottom: 0,
    overflow: "hidden",
  },
  pieChartContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    minHeight: 350,
  },
  pieItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    paddingHorizontal: 20,
  },
  pieLegendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  pieLegendText: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    fontFamily: "Arimo-Regular",
  },
  pieChartTop: {
    alignItems: "center",
    marginBottom: 20,
  },
  pieChartBottom: {
    width: "100%",
    maxWidth: 300,
  },
  actualPieLarge: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: "relative",
    marginBottom: 20,
  },
  pieOverlayLarge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  pieCenterContent: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  pieCenterTextLarge: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    fontFamily: "Arimo-Regular",
    marginBottom: 4,
  },
  pieCenterSubtext: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingVertical: 20,
    height: 250,
    paddingHorizontal: 10
  },
  barContainer: {
    alignItems: "center",
    width: 35
  },
  barWrapper: {
    height: 200,
    justifyContent: "flex-end",
    alignItems: "center"
  },
  bar: {
    width: 20,
    backgroundColor: "#0ea5e9",
    borderRadius: 4,
    minHeight: 10
  },
  barLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
    fontFamily: "Arimo-Regular"
  },
  barValue: {
    fontSize: 11,
    color: "#0f172a",
    fontWeight: "bold",
    fontFamily: "Arimo-Regular"
  },
  chartWrapper: {
    alignSelf: "stretch",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center"
  },
  adherenceContainer: {
    flex: 1,
    alignSelf: "stretch",
    gap: 16
  },
  heading3: {
    alignSelf: "stretch",
    justifyContent: "flex-start",
    flexDirection: "row",
    marginBottom: 12
  },
  medicationBreakdownContainer: {
    alignSelf: "stretch",
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  breakdownScroll: {
    flex: 1
  },
  medicationCard: {
    flexDirection: "column",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderStyle: "solid",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1
  },
  medicineName: {
    color: "#0f172a",
    fontSize: 13,
    fontFamily: "Arimo-Regular",
    flex: 1,
    textAlign: "left",
    flexShrink: 1
  },
  adherencePercent: {
    color: "#0ea5e9",
    fontSize: 13,
    fontWeight: "600" as const,
    fontFamily: "Arimo-Regular",
    flexShrink: 0,
    marginLeft: 12,
    minWidth: 35,
    textAlign: "right"
  },
  medicationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    width: "100%"
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 100,
    width: "100%"
  },
  progressBar: {
    height: 8,
    backgroundColor: "#0ea5e9",
    borderRadius: 100,
    maxWidth: "100%"
  },
  intakeContainer: {
    flex: 1,
    alignSelf: "stretch"
  },
  intakeContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  intakeSummaryCard: {
    flexDirection: "column",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderStyle: "solid",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1
  },
  intakeSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    width: "100%"
  },
  trendsContentWrapper: {
    alignSelf: "stretch",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    marginBottom: 16,
  },
  trendsChartWrapper: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    padding: 8
  },
  trendSummary: {
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0"
  },
  trendMessage: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  trendText: {
    lineHeight: 20,
    fontSize: 16,
    color: "#0f172a",
    textAlign: "center"
  },
  trendStats: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8
  },
  trendStatsText: {
    textAlign: "center",
    color: "#64748b"
  },
  properTrendsContainer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  trendChartOuterContainer: {
    width: "100%",
    alignItems: "center",
    position: "relative",
    marginBottom: 24,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 20
  },
  trendHeaderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    fontFamily: "Arimo-Regular"
  },
  trendIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  trendSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  trendIndicatorText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Arimo-Regular"
  },
  trendChartContainer: {
    position: "relative",
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  trendChartContainerFixed: {
    position: "relative",
    width: "100%",
    marginBottom: 24,
    overflow: "visible"
  },
  trendGridContainerFixed: {
    position: "absolute",
    width: "100%",
    height: "100%"
  },
  trendGridLine: {
    position: "absolute",
    height: 0.5,
    backgroundColor: "#f1f5f9",
    left: 0,
    right: 0,
  },
  trendGridLineFixed: {
    position: "absolute",
    height: 0.5,
    backgroundColor: "#f1f5f9",
    left: 0,
    right: 0,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 10,
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  trendYAxis: {
    position: "absolute",
    left: 0,
    width: 40,
    justifyContent: "space-between",
    paddingRight: 8,
    zIndex: 1,
  },
  trendYAxisFixed: {
    position: "absolute",
    left: 0,
    width: 40,
    justifyContent: "space-between",
    paddingRight: 8,
    zIndex: 1
  },
  yAxisRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 1
  },
  trendAxisLabel: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
    textAlign: "right",
    width: 30
  },
  chartArea: {
    flex: 1,
    position: "relative",
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingRight: 10,
  },
  trendChartArea: {
    position: "relative",
    marginLeft: 40, 
    overflow: "visible",
  },
  trendChartAreaFixed: {
    position: "relative",
    width: "100%",
    height: 240,
    marginLeft: 40,
    marginRight: 20,
    overflow: "visible"
  },
  trendLineSegment: {
    height: 3,
    borderRadius: 2,
    position: "absolute",
    backgroundColor: "#10B981"
  },
  trendDataPoint: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  trendPointValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0f172a",
    fontFamily: "Arimo-Regular"
  },
  trendPointGlow: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.2,
  },
  trendPointInner: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  trendXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    minWidth: "100%",
  },
  trendXAxisFixed: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
    minWidth: "100%",
  },
  xAxisLabel: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
    textAlign: "center",
    flex: 1,
  },
  xAxisTick: {
    position: "absolute",
    top: -8,
    right: 0,
    width: 1,
    height: 4,
    backgroundColor: "#e2e8f0"
  },
  xAxisScrollContainer: {
    marginLeft: 40,
    paddingTop: 8,
    paddingBottom: 20,
  },
  xAxisContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  trendXLabel: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
    textAlign: "center",
  },
  trendXLabelSmall: {
    fontSize: 9,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
    textAlign: "center",
    marginTop: 4,
    minWidth: 30,
  },
  simpleChartContainer: {
    flexDirection: "row",
    height: 200,
    marginTop: 20,
    marginBottom: 30,
  },
  yAxisContainer: {
    width: 40,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
    textAlign: "right",
  },
  currentValueContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  currentValueDisplay: {
    position: "absolute",
    top: 0,
    zIndex: 3,
  },
  currentValueBubble: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentValueText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Arimo-Regular",
  },
  trendStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    fontFamily: "Arimo-Regular",
  },
  noDataText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    fontFamily: "Arimo-Regular",
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
  },
});

export default App1;