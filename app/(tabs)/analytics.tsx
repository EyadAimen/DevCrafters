import * as React from "react";
import { useState, useEffect } from "react";
import {Text, StyleSheet, View, Pressable, Image, ScrollView, Dimensions} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/BottomNavigation";
import { supabase } from "../../lib/supabase";

type PeriodType = 'week' | 'month' | 'quarter' | 'year';
type TabType = 'adherence' | 'intake' | 'trends';

interface AnalyticsData {
  adherence: number;
  totalDoses: number;
  streak: number;
  missedDoses: number;
  dailyData: number[];
  medicationBreakdown: Array<{name: string, adherence: number}>;
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
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [selectedTab, setSelectedTab] = useState<TabType>('adherence');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    adherence: 0,
    totalDoses: 0,
    streak: 0,
    missedDoses: 0,
    dailyData: [91, 88, 95, 85, 92, 89, 87], // default mock data
    medicationBreakdown: [
      {name: 'Lisinopril', adherence: 96},
      {name: 'Metformin', adherence: 96},
      {name: 'Aspirin', adherence: 99},
      {name: 'Atorvastatin', adherence: 96},
      {name: 'Levothyroxine', adherence: 99}
    ]
  });
  const [loading, setLoading] = useState(true);

  const [intakeData, setIntakeData] = useState<IntakeData>({
    pieData: [
      {name: 'Lisinopril', doses: 28, percentage: 30, color: '#3B82F6'},
      {name: 'Metformin', doses: 28, percentage: 30, color: '#10B981'},
      {name: 'Aspirin', doses: 21, percentage: 22, color: '#F59E0B'},
      {name: 'Atorvastatin', doses: 14, percentage: 15, color: '#EF4444'},
      {name: 'Levothyroxine', doses: 7, percentage: 7, color: '#8B5CF6'},
    ],
    totalDosesByMedicine: [
      {name: 'Lisinopril', doses: 28, percentage: 30},
      {name: 'Metformin', doses: 28, percentage: 30},
      {name: 'Aspirin', doses: 21, percentage: 22},
      {name: 'Atorvastatin', doses: 14, percentage: 15},
      {name: 'Levothyroxine', doses: 7, percentage: 7},
    ]
  });

  const [trendData, setTrendData] = useState<TrendData>({
    hasImproved: true,
    percentageChange: 5.2,
    message: "Your adherence has improved by 5.2% this week. Keep up the great work!",
    previousAdherence: 88.6,
    currentAdherence: 93.8
  });

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  useEffect(() => {
    if (analyticsData.adherence > 0) {
      if (selectedTab === 'intake') {
        updateIntakeData();
      } else if (selectedTab === 'trends') {
        updateTrendData();
      }
      // No need to update for 'adherence' tab as it uses analyticsData directly
    }
  }, [analyticsData, selectedTab]);

  const updateIntakeData = () => {
    // Generate intake data from actual medication breakdown
    const medications = analyticsData.medicationBreakdown;
    const totalDoses = analyticsData.totalDoses || 100;
    const totalAdherenceSum = medications.reduce((sum, med) => sum + med.adherence, 0);

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

    let pieData = medications.map((medication, index) => {
      const adherence = medication.adherence;
      // Calculate proportional doses based on adherence rate
      const doses = Math.round((adherence / 100) * totalDoses);
      // Normalize percentage to be proportional to total adherence
      const percentage = totalAdherenceSum > 0 ? (adherence / totalAdherenceSum) * 100 : 100 / medications.length;

      return {
        name: medication.name,
        doses,
        percentage,
        color: colors[index % colors.length]
      };
    });

    // Normalize percentages and round to whole numbers
    let normalizedPieData = [...pieData];
    if (normalizedPieData.length > 0) {
      const totalPercentage = normalizedPieData.reduce((sum, item) => sum + item.percentage, 0);
      normalizedPieData = normalizedPieData.map(item => ({
        ...item,
        percentage: Math.round((item.percentage / totalPercentage) * 100)
      }));

      // Handle rounding issues to ensure sum is exactly 100%
      let sumRounded = normalizedPieData.reduce((sum, item) => sum + item.percentage, 0);
      let difference = 100 - sumRounded;

      // Adjust the largest percentage to account for rounding
      if (difference !== 0 && normalizedPieData.length > 0) {
        const maxIndex = normalizedPieData.reduce((maxIdx, item, idx, arr) =>
          item.percentage > arr[maxIdx].percentage ? idx : maxIdx, 0);
        normalizedPieData[maxIndex].percentage += difference;
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

  const updateTrendData = () => {
    // Generate trend data based on current analytics
    const current = analyticsData.adherence;
    const previous = Math.max(current - Math.random() * 20, 50); // Mock previous value
    const percentageChange = ((current - previous) / previous) * 100;
    const hasImproved = percentageChange > 0;

    setTrendData({
      hasImproved,
      percentageChange: Math.abs(percentageChange),
      message: hasImproved
        ? `Your adherence has improved by ${percentageChange.toFixed(1)}% ${periodLabels[selectedPeriod].toLowerCase()}. Keep up the great work!`
        : `Your adherence has decreased by ${Math.abs(percentageChange).toFixed(1)}% ${periodLabels[selectedPeriod].toLowerCase()}. Please consider maintaining regular medication intake.`,
      previousAdherence: previous,
      currentAdherence: current
    });
  };

  const periodLabels = {
    week: 'this week',
    month: 'this month',
    quarter: 'this quarter',
    year: 'this year'
  };

  const getDateRange = (period: PeriodType) => {
    const now = new Date();
    const start = new Date(now);
    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    return { start, end: now };
  };

  const getPeriodData = (period: PeriodType, historyData: any[]) => {
    const now = new Date();
    let dataPoints: number[] = [];
    let labels: string[] = [];

    switch (period) {
      case 'week':
        // Show last 7 days
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + i);

          const dayHistory = historyData.filter(h => {
            const scheduled = new Date(h.scheduled_for);
            return scheduled.toDateString() === date.toDateString();
          });

          const dayTotal = dayHistory.length;
          const dayTaken = dayHistory.filter(h => h.status === 'taken').length;
          const adherence = dayTotal > 0 ? Math.round((dayTaken / dayTotal) * 100) : 0;

          dataPoints.push(adherence);
          labels.push(dayNames[date.getDay()]);
        }
        break;

      case 'month':
        // Show 4 weeks (last 28 days grouped by week)
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 27); // Start 27 days ago to get current + 3 full weeks

        for (let week = 0; week < 4; week++) {
          const weekStart = new Date(monthStart);
          weekStart.setDate(monthStart.getDate() + (week * 7));

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          const weekHistory = historyData.filter(h => {
            const scheduled = new Date(h.scheduled_for);
            return scheduled >= weekStart && scheduled <= weekEnd;
          });

          const weekTotal = weekHistory.length;
          const weekTaken = weekHistory.filter(h => h.status === 'taken').length;
          const adherence = weekTotal > 0 ? Math.round((weekTaken / weekTotal) * 100) : 0;

          dataPoints.push(adherence);
          labels.push(`W${week + 1}`);
        }
        break;

      case 'quarter':
        // Show 3 months
        const quarterStart = new Date(now);
        quarterStart.setMonth(now.getMonth() - 2);
        quarterStart.setDate(1); // Start of month

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let month = 0; month < 3; month++) {
          const monthStartDate = new Date(quarterStart);
          monthStartDate.setMonth(quarterStart.getMonth() + month);

          const monthEndDate = new Date(monthStartDate);
          monthEndDate.setMonth(monthStartDate.getMonth() + 1);
          monthEndDate.setDate(0); // Last day of month

          const monthHistory = historyData.filter(h => {
            const scheduled = new Date(h.scheduled_for);
            return scheduled >= monthStartDate && scheduled <= monthEndDate;
          });

          const monthTotal = monthHistory.length;
          const monthTaken = monthHistory.filter(h => h.status === 'taken').length;
          const adherence = monthTotal > 0 ? Math.round((monthTaken / monthTotal) * 100) : 0;

          dataPoints.push(adherence);
          labels.push(monthNames[monthStartDate.getMonth()]);
        }
        break;

      case 'year':
        // Show 4 quarters
        const yearStart = new Date(now);
        yearStart.setMonth(now.getMonth() - 9); // Start 9 months ago to cover 4 quarters

        for (let quarter = 0; quarter < 4; quarter++) {
          const quarterStartDate = new Date(yearStart);
          quarterStartDate.setMonth(yearStart.getMonth() + (quarter * 3));

          const quarterEndDate = new Date(quarterStartDate);
          quarterEndDate.setMonth(quarterStartDate.getMonth() + 3);
          quarterEndDate.setDate(0); // Last day of quarter

          const quarterHistory = historyData.filter(h => {
            const scheduled = new Date(h.scheduled_for);
            return scheduled >= quarterStartDate && scheduled <= quarterEndDate;
          });

          const quarterTotal = quarterHistory.length;
          const quarterTaken = quarterHistory.filter(h => h.status === 'taken').length;
          const adherence = quarterTotal > 0 ? Math.round((quarterTaken / quarterTotal) * 100) : 0;

          dataPoints.push(adherence);
          labels.push(`Q${quarter + 1}`);
        }
        break;
    }

    return { dataPoints, labels };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Use mock data for now to demonstrate the trends chart
      // Get period-specific data for trends
      const { dataPoints, labels } = getPeriodData(selectedPeriod, []);
      let medicationBreakdown: Array<{name: string, adherence: number}> = [];

      // Generate mock medication breakdown
      switch (selectedPeriod) {
        case 'week':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: Math.floor(Math.random() * 20) + 85},
            {name: 'Metformin', adherence: Math.floor(Math.random() * 20) + 85},
            {name: 'Aspirin', adherence: Math.floor(Math.random() * 20) + 85},
            {name: 'Atorvastatin', adherence: Math.floor(Math.random() * 20) + 85},
            {name: 'Levothyroxine', adherence: Math.floor(Math.random() * 20) + 85}
          ];
          break;
        case 'month':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: Math.floor(Math.random() * 20) + 80},
            {name: 'Metformin', adherence: Math.floor(Math.random() * 20) + 80},
            {name: 'Aspirin', adherence: Math.floor(Math.random() * 20) + 80},
            {name: 'Atorvastatin', adherence: Math.floor(Math.random() * 15) + 85},
          ];
          break;
        case 'quarter':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: Math.floor(Math.random() * 25) + 75},
            {name: 'Metformin', adherence: Math.floor(Math.random() * 25) + 75},
            {name: 'Aspirin', adherence: Math.floor(Math.random() * 20) + 80},
          ];
          break;
        case 'year':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: Math.floor(Math.random() * 30) + 70},
            {name: 'Metformin', adherence: Math.floor(Math.random() * 30) + 70},
          ];
          break;
      }

      const averageAdherence = medicationBreakdown.length > 0
        ? Math.round(medicationBreakdown.reduce((sum, med) => sum + med.adherence, 0) / medicationBreakdown.length)
        : 90;

      setAnalyticsData({
        adherence: averageAdherence,
        totalDoses: dataPoints.length * 10,
        streak: Math.floor(Math.random() * 10) + 5,
        missedDoses: Math.floor(Math.random() * 5) + 2,
        dailyData: dataPoints,
        medicationBreakdown
      });

    } catch (error) {
      console.error('Error in fetchAnalytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
  };

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab);
    if (tab !== 'adherence' && analyticsData.adherence > 0) {
      // Update data when switching tabs
      if (tab === 'intake') {
        updateIntakeData();
      } else if (tab === 'trends') {
        updateTrendData();
      }
    }
  };

  const getPeriodLabel = (period: PeriodType) => {
    switch (period) {
      case 'week': return 'This week';
      case 'month': return 'This month';
      case 'quarter': return 'This quarter';
      case 'year': return 'This year';
      default: return 'This week';
    }
  };

  const renderPieChart = (data: Array<{name: string, doses: number, percentage: number, color: string}>) => {
    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChartTop}>
          <View style={styles.actualPieLarge}>
            {/* Draw pie slices using borders */}
            {data.length > 0 && data.map((item, index) => {
              const rotation = data.slice(0, index).reduce((sum, prevItem) => sum + (prevItem.percentage * 3.6), 0);
              const sliceWidth = item.percentage * 3.6;

              return (
                <View
                  key={`slice-${index}`}
                  style={[
                    styles.pieSliceLarge,
                    {
                      transform: [{ rotate: `${rotation}deg` }],
                      borderColor: item.color,
                      borderWidth: 45,
                      borderRadius: 90,
                      borderRightColor: 'transparent',
                      borderBottomColor: 'transparent',
                      borderLeftColor: 'transparent'
                    }
                  ]}
                />
              );
            })}

            {/* Center overlay */}
            <View style={styles.pieOverlayLarge}>
              <View style={styles.pieCenterContent}>
                <Text style={styles.pieCenterTextLarge}>Total</Text>
                <Text style={styles.pieCenterSubtext}>
                  {data.reduce((sum, d) => sum + d.doses, 0) || 0} doses
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
                {item.name}: {item.percentage}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderAdherenceChart = (data: number[]) => {
    return (
      <View style={styles.barChartContainer}>
        {data.map((value, index) => {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const today = new Date().getDay();
          const adjustedIndex = (today - 6 + index + 7) % 7;
          const dayName = days[adjustedIndex];

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
              <Text style={styles.barLabel}>{dayName}</Text>
              <Text style={styles.barValue}>{value}%</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTrendsChart = () => {
    const dataPoints = analyticsData.dailyData;
    const chartWidth = Math.min(Dimensions.get('window').width - 80, 350);
    const chartHeight = 200;
    const pointSpacing = chartWidth / (dataPoints.length - 1);

    // Calculate Y positions (inverted coordinate system)
    const points = dataPoints.map((value, index) => {
      const x = index * pointSpacing;
      const y = chartHeight - (value / 100) * chartHeight;
      return { x, y, value, index };
    });

    // Generate day labels
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    const startDayIndex = (today - 6 + 7) % 7; // Start 6 days ago

    return (
      <View style={[styles.simpleTrendsChartContainer, { width: chartWidth + 40, height: chartHeight + 60 }]}>
        {/* Y-axis labels and grid */}
        <View style={styles.simpleTrendsYAxis}>
          <Text style={styles.simpleAxisLabel}>100%</Text>
          <Text style={styles.simpleAxisLabel}>75%</Text>
          <Text style={styles.simpleAxisLabel}>50%</Text>
          <Text style={styles.simpleAxisLabel}>25%</Text>
          <Text style={styles.simpleAxisLabel}>0%</Text>
        </View>

        <View style={styles.simpleChartWrapper}>
          {/* Grid lines */}
          <View style={styles.simpleGridContainer}>
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <View
                key={`grid-${i}`}
                style={[styles.simpleGridLine, { top: (1 - fraction) * chartHeight }]}
              />
            ))}
          </View>

          {/* Chart area */}
          <View style={[styles.simpleChartArea, { width: chartWidth, height: chartHeight }]}>
            {/* Line segments */}
            {points.map((point, index) => {
              if (index < points.length - 1) {
                const nextPoint = points[index + 1];
                const distance = Math.sqrt(
                  Math.pow(nextPoint.x - point.x, 2) +
                  Math.pow(nextPoint.y - point.y, 2)
                );
                const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;

                return (
                  <View
                    key={`line-${index}`}
                    style={[
                      styles.simpleLineSegment,
                      {
                        left: point.x,
                        top: point.y,
                        width: distance,
                        height: 3,
                        transform: [{ rotate: `${angle}deg` }],
                      }
                    ]}
                  />
                );
              }
              return null;
            })}

            {/* Data points */}
            {points.map((point, index) => {
              const dayLabel = dayLabels[(startDayIndex + index) % 7];
              return (
                <View
                  key={`point-${index}`}
                  style={[styles.simpleDataPoint, { left: point.x - 8, top: point.y - 8 }]}
                >
                  <Text style={styles.simplePointValue}>{point.value}%</Text>
                  <Text style={styles.simplePointLabel}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'adherence':
        return (
          <View style={styles.adherenceContainer}>
            <View style={[styles.heading3, styles.analyticsscreenLayout]}>
              <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>Daily Adherence Rate</Text>
            </View>
            <View style={styles.chartWrapper}>
              {renderAdherenceChart(analyticsData.dailyData)}
            </View>

            <View style={styles.medicationBreakdownContainer}>
              <View style={[styles.heading3, styles.analyticsscreenLayout]}>
                <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>Medication Adherence Breakdown</Text>
              </View>
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

            <View style={styles.simpleTrendChartContainer}>
              <Text style={styles.trendTitle}>
                {selectedPeriod === 'week' ? 'Daily' :
                 selectedPeriod === 'month' ? 'Weekly' :
                 selectedPeriod === 'quarter' ? 'Monthly' :
                 'Quarterly'} Adherence Trend
              </Text>

              {/* Simple Vertical Bar Chart */}
              <View style={styles.simpleBarChartContainer}>
                {(() => {
                  const periodData = getPeriodData(selectedPeriod, []);
                  return analyticsData.dailyData.map((value, index) => {
                    const label = periodData.labels[index] || `P${index + 1}`;

                    return (
                      <View key={`bar-${index}`} style={styles.simpleBarColumn}>
                        {/* Value at top of bar */}
                        <Text style={styles.simpleBarValue}>{value}%</Text>

                        {/* Bar */}
                        <View style={styles.simpleBarWrapper}>
                          <View
                            style={[
                              styles.simpleBar,
                              { height: Math.max(30, (value / 100) * 120) }
                            ]}
                          />
                        </View>

                        {/* Label at bottom */}
                        <Text style={styles.simpleBarLabel}>{label}</Text>
                      </View>
                    );
                  });
                })()}
              </View>

              <View style={styles.trendSummary}>
                <View style={styles.trendMessage}>
                  <Text style={[styles.trendText, styles.adherenceTypo]}>
                    {trendData.message}
                  </Text>
                </View>
                <View style={styles.trendStats}>
                  <Text style={[styles.trendStatsText, styles.pdfTypo]}>
                    Previous: {trendData.previousAdherence.toFixed(1)}% | Current: {trendData.currentAdherence.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  	return (
    		<SafeAreaView style={styles.app}>
      			<View style={styles.view}>
        				<ScrollView style={styles.scrollview} showsVerticalScrollIndicator={false}>
          					<View style={styles.analyticsscreen}>
          					<View style={styles.container}>
            						<View style={styles.heading1}>
              							<Text style={styles.analyticsDashboard}>Analytics Dashboard</Text>
            						</View>
            						<View style={[styles.paragraph, styles.analyticsscreenLayout]}>
              							<Text style={[styles.trackYourMedication, styles.adherenceTypo]}>Track your medication adherence and history</Text>
            						</View>
          					</View>
          					<View style={styles.container2}>
            						<Pressable style={[styles.button, selectedPeriod === 'week' ? styles.badgeSpaceBlock : [styles.buttonBorder, styles.buttonInactive]]} onPress={() => handlePeriodChange('week')}>
              							<Text style={selectedPeriod === 'week' ? [styles.week, styles.weekTypo] : [styles.month, styles.weekTypo]}>week</Text>
            						</Pressable>
            						<Pressable style={[styles.button2, selectedPeriod === 'month' ? styles.badgeSpaceBlock : [styles.buttonBorder, styles.buttonInactive]]} onPress={() => handlePeriodChange('month')}>
              							<Text style={selectedPeriod === 'month' ? [styles.week, styles.weekTypo] : [styles.month, styles.weekTypo]}>month</Text>
            						</Pressable>
            						<Pressable style={[styles.button3, selectedPeriod === 'quarter' ? styles.badgeSpaceBlock : [styles.buttonBorder, styles.buttonInactive]]} onPress={() => handlePeriodChange('quarter')}>
              							<Text style={selectedPeriod === 'quarter' ? [styles.week, styles.weekTypo] : [styles.month, styles.weekTypo]}>quarter</Text>
            						</Pressable>
            						<Pressable style={[styles.button4, selectedPeriod === 'year' ? styles.badgeSpaceBlock : [styles.buttonBorder, styles.buttonInactive]]} onPress={() => handlePeriodChange('year')}>
              							<Text style={selectedPeriod === 'year' ? [styles.week, styles.weekTypo] : [styles.month, styles.weekTypo]}>year</Text>
            						</Pressable>
          					</View>
          					<View style={styles.container3}>
            						<View style={styles.analyticCard}>
              							<View style={styles.analyticsscreen2}>
                								<Image style={styles.icon} resizeMode="cover" />
                								<Text style={styles.adherence}>Adherence</Text>
              							</View>
              							<View style={styles.analyticsscreen3}>
                								<Text style={styles.text}>{analyticsData.adherence}%</Text>
                								<View style={styles.changeContainer}>
                  									<Image style={styles.icon2} resizeMode="cover" />
                  									<Text style={styles.text3}>{Math.abs(analyticsData.adherence - 91)}%</Text>
                								</View>
              							</View>
            						</View>
            						<View style={styles.analyticCard}>
              							<View style={styles.analyticsscreen2}>
                								<Image style={styles.icon} resizeMode="cover" />
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
                								<Image style={styles.icon} resizeMode="cover" />
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
                								<Image style={styles.icon} resizeMode="cover" />
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
              							<Pressable style={[selectedTab === 'adherence' ? styles.primitivebutton : styles.primitivebuttonFlexBox, styles.primitivebuttonFlexBox]} onPress={() => setSelectedTab('adherence')}>
                								<Text style={[styles.adherence2, styles.adherenceTypo]}>Adherence</Text>
              							</Pressable>
            						<Pressable style={[selectedTab === 'intake' ? styles.primitivebutton : styles.primitivebuttonFlexBox, styles.primitivebuttonFlexBox]} onPress={() => setSelectedTab('intake')}>
                								<Text style={[styles.adherence2, styles.adherenceTypo]}>Intake</Text>
              							</Pressable>
              							<Pressable style={[selectedTab === 'trends' ? styles.primitivebutton : styles.primitivebuttonFlexBox, styles.primitivebuttonFlexBox]} onPress={() => setSelectedTab('trends')}>
                								<Text style={[styles.adherence2, styles.adherenceTypo]}>Trends</Text>
              							</Pressable>
            						</View>
            						<View style={styles.tabPanel}>
              							{renderTabContent()}
            						</View>
          					</View>
          					<View style={[styles.card11, styles.cardBorder]}>
            						<View style={[styles.analyticsscreen20, styles.analyticsscreenLayout]}>
              							<Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>Export Reports</Text>
            						</View>
            						<View style={styles.analyticsscreen21}>
              							<Text style={[styles.downloadYourMedication, styles.text3Position]}>Download your medication history and adherence reports to share with your healthcare provider</Text>
            						</View>
            						<View style={styles.analyticsscreen21}>
              							<View style={[styles.button5, styles.buttonLayout]}>
                								<Image style={styles.icon7} resizeMode="cover" />
                								<Text style={[styles.pdf, styles.pdfTypo]}>PDF</Text>
              							</View>
              							<View style={[styles.button6, styles.buttonLayout]}>
                								<Image style={styles.icon7} resizeMode="cover" />
                								<Text style={[styles.pdf, styles.pdfTypo]}>CSV</Text>
              							</View>
            						</View>
          					</View>
        						</View>
        					</ScrollView>
        					{/* ---------- Fixed Bottom Navigation ---------- */}
        					<View style={styles.bottomNavWrapper}>
          						<BottomNavigation />
        					</View>
      			</View>
    		</SafeAreaView>);
};

const styles = StyleSheet.create({
  	app: {
    		flex: 1
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
  	cardPosition1: {
    		gap: 28,
    		paddingTop: 10,
    		paddingLeft: 10,
    		height: 136,
    		width: 170,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		top: 0,
    		position: "absolute"
  	},
  	container4FlexBox: {
    		alignItems: "center",
    		height: 16,
    		flexDirection: "row"
  	},
  	pdfTypo: {
    		lineHeight: 16,
    		fontSize: 12,
    		textAlign: "left",
    		fontFamily: "Arimo-Regular"
  	},
  	textPosition: {
    		width: 38,
    		left: 0,
    		position: "absolute"
  	},
  	textTypo: {
    		lineHeight: 28,
    		fontSize: 20,
    		textAlign: "left",
    		color: "#0f172a",
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
  	cardPosition: {
    		top: 146,
    		gap: 28,
    		paddingTop: 10,
    		paddingLeft: 10,
    		height: 136,
    		width: 170,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		position: "absolute"
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
  	icon6Layout: {
    		height: 250,
    		width: 323,
    		position: "absolute"
  	},
  	iconLayout: {
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden",
    		position: "absolute"
  	},
  	groupPosition4: {
    		left: "20.12%",
    		right: "1.55%",
    		width: "78.33%"
  	},
  	group11Position: {
    		right: "0%",
    		left: "0%",
    		width: "100%"
  	},
  	groupPosition3: {
    		height: "100%",
    		bottom: "0%",
    		top: "0%",
    		position: "absolute"
  	},
  	vectorIconPosition1: {
    		left: "50%",
    		bottom: "69.23%",
    		height: "30.77%",
    		top: "0%",
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden",
    		position: "absolute"
  	},
  	monTypo: {
    		color: "#6b7280",
    		fontFamily: "Inter-Regular",
    		left: "0%",
    		fontSize: 12,
    		position: "absolute"
  	},
  	groupPosition2: {
    		width: "9.15%",
    		bottom: "0%",
    		height: "100%",
    		top: "0%",
    		position: "absolute"
  	},
  	groupPosition1: {
    		height: "6.79%",
    		right: "0%",
    		position: "absolute"
  	},
  	vectorIconPosition: {
    		bottom: "41.73%",
    		top: "51.6%",
    		height: "6.67%",
    		right: "0%",
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden",
    		position: "absolute"
  	},
  	groupPosition: {
    		left: "20.69%",
    		width: "79.31%",
    		height: "6.79%",
    		right: "0%",
    		position: "absolute"
  	},
  	yi3Layout: {
    		height: 23,
    		width: 23,
    		display: "none"
  	},
  	cardLayout: {
    		height: 76,
    		width: 349,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		left: 0,
    		position: "absolute"
  	},
  	badgeFlexBox: {
    		height: 18,
    		alignItems: "center",
    		flexDirection: "row"
  	},
  	primitivedivPosition: {
    		height: 6,
    		backgroundColor: "rgba(14, 165, 233, 0.2)",
    		borderRadius: 100,
    		marginTop: 12,
    		marginLeft: 11,
    		marginRight: 11,
    		position: "relative"
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
  		alignSelf: "stretch"
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
    		overflow: "hidden",
    		height: 36,
    		alignSelf: "stretch"
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
    		backgroundColor: "#f8fafc",
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
    		backgroundColor: "#f8fafc",
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
    		backgroundColor: "#f8fafc",
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
  	icon: {
    		height: 14,
    		width: 14
  	},
  	paragraph2: {
    		flex: 1,
    		flexDirection: "row"
  	},
  	adherence: {
    		color: "#64748b",
    		textAlign: "center"
  	},
  	analyticsscreen3: {
    		height: 28
  	},
  	paragraph3: {
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
  		paragraph4: {
    		flex: 1,
    		flexDirection: "row"
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
  	paragraph5: {
    		flex: 1,
    		flexDirection: "row"
  	},
  	paragraph6: {
    		flex: 1,
    		flexDirection: "row"
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
  	card5: {
    		alignSelf: "stretch"
  	},
  	analyticsscreen13: {
    		top: 13,
    		width: 323,
    		left: 13,
    		flexDirection: "row",
    		position: "absolute"
  	},
  	dailyAdherenceRate: {
    		color: "#0f172a",
    		flex: 1
  	},
  	container5: {
    		top: 69,
    		left: 13
  	},
  	icon6: {
    		top: 0,
    		overflow: "hidden",
    		left: 0
  	},
  	groupIcon: {
    		left: "20.12%",
    		right: "1.55%",
    		width: "78.33%",
    		bottom: "14%",
    		top: "2%",
    		height: "84%",
    		maxHeight: "100%",
    		maxWidth: "100%"
  	},
  	group: {
    		height: "7.8%",
    		top: "86%",
    		bottom: "6.2%",
    		position: "absolute"
  	},
  	vectorIcon: {
    		height: "5.13%",
    		bottom: "94.87%",
    		left: "0%",
    		top: "0%",
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden",
    		position: "absolute"
  	},
  	group2: {
    		width: "95.02%",
    		right: "2.78%",
    		left: "2.2%",
    		bottom: "0%"
  	},
  	group3: {
    		width: "10.4%",
    		right: "89.6%",
    		bottom: "0%",
    		left: "0%"
  	},
  	vectorIcon2: {
    		width: "4%",
    		right: "46%"
  	},
  	mon: {
    		top: "23.18%",
    		textAlign: "center"
  	},
  	group4: {
    		width: "8.74%",
    		right: "75.4%",
    		left: "15.87%",
    		bottom: "0%"
  	},
  	vectorIcon3: {
    		width: "4.76%",
    		right: "45.24%"
  	},
  	group5: {
    		width: "10.82%",
    		right: "59.32%",
    		left: "29.86%",
    		bottom: "0%"
  	},
  	vectorIcon4: {
    		width: "3.85%",
    		right: "46.15%"
  	},
  	group6: {
    		right: "45.12%",
    		left: "45.73%"
  	},
  	vectorIcon5: {
    		width: "4.55%",
    		right: "45.45%"
  	},
  	group7: {
    		width: "6.24%",
    		right: "31.54%",
    		left: "62.22%",
    		bottom: "0%"
  	},
  	vectorIcon6: {
    		width: "6.67%",
    		right: "43.33%"
  	},
  	group8: {
    		width: "7.9%",
    		right: "15.68%",
    		left: "76.42%",
    		bottom: "0%"
  	},
  	vectorIcon7: {
    		width: "5.26%",
    		right: "44.74%"
  	},
  	group9: {
    		right: "0.02%",
    		left: "90.83%"
  	},
  	group10: {
    		height: "88.4%",
    		width: "8.98%",
    		top: "0.5%",
    		right: "79.88%",
    		bottom: "11.1%",
    		left: "11.15%",
    		position: "absolute"
  	},
  	vectorIcon9: {
    		height: "95.02%",
    		width: "3.45%",
    		top: "1.69%",
    		right: "-3.45%",
    		bottom: "3.28%",
    		left: "100%"
  	},
  	group11: {
    		bottom: "0%",
    		left: "0%",
    		right: "0%",
    		width: "100%"
  	},
  	group12: {
    		width: "55.17%",
    		top: "93.21%",
    		left: "44.83%",
    		bottom: "0%"
  	},
  	vectorIcon10: {
    		width: "37.5%",
    		left: "62.5%"
  	},
  	text7: {
    		textAlign: "right",
    		top: "0%"
  	},
  	group13: {
    		top: "69.46%",
    		bottom: "23.76%"
  	},
  	vectorIcon11: {
    		width: "26.09%",
    		left: "73.91%"
  	},
  	group14: {
    		top: "45.7%",
    		bottom: "47.51%"
  	},
  	group15: {
    		top: "21.95%",
    		bottom: "71.27%"
  	},
  	group16: {
    		bottom: "93.21%",
    		left: "0%",
    		top: "0%",
    		width: "100%"
  	},
  	vectorIcon14: {
    		width: "20.69%",
    		top: "24.93%",
    		bottom: "68.4%",
    		left: "79.31%",
    		height: "6.67%",
    		right: "0%",
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden",
    		position: "absolute"
  	},
  	rechartsBarR36Icon: {
    		width: "75.82%",
    		right: "2.94%",
    		left: "21.24%",
    		bottom: "14%",
    		top: "2%",
    		height: "84%",
    		maxHeight: "100%",
    		maxWidth: "100%"
  	},
  	yi3: {
    		top: 25,
    		left: 202,
    		display: "none",
    		position: "absolute"
  	},
  	os4: {
    		borderRadius: 8,
    		borderColor: "#e5e7eb",
    		paddingLeft: 11,
    		paddingTop: 11,
    		paddingRight: 11,
    		paddingBottom: 1,
    		display: "none",
    		backgroundColor: "#fff",
    		borderWidth: 1.3,
    		borderStyle: "solid",
    		height: 23,
    		width: 23
  	},
  	paragraph7: {
    		width: 0,
    		height: 0,
    		display: "none"
  	},
  	analyticsscreen14: {
    		height: 442,
    		alignSelf: "stretch"
  	},
  	heading3: {
    		alignSelf: "stretch",
    		justifyContent: "flex-start",
    		flexDirection: "row",
    		marginBottom: 12
  	},
  	card6: {
    		top: 28
  	},
  	analyticsscreen15: {
    		justifyContent: "space-between",
    		left: 11,
    		position: "absolute"
  	},
  	paragraph8: {
    		flex: 1,
    		height: 16,
    		flexDirection: "row",
    		flexShrink: 1
  	},
  	lisinopril: {
    		color: "#0f172a",
    		flexShrink: 1
  	},
  	badge: {
    		width: 40,
    		backgroundColor: "#e0f2fe",
    		paddingHorizontal: 6,
    		paddingVertical: 1,
    		justifyContent: "center",
    		alignItems: "center",
    		borderRadius: 14,
    		height: 20,
    		marginLeft: 8,
    		flexShrink: 0
  	},
  	text12: {
    		color: "#0c4a6e"
  	},
  	primitivediv2: {
  	},
  	container6: {
    		height: 6,
    		backgroundColor: "#0ea5e9",
    		alignSelf: "stretch"
  	},
  	card7: {
    		top: 112
  	},
  	paragraph9: {
    		width: 56,
    		height: 16,
    		flexDirection: "row"
  	},
  	primitivediv3: {
    		paddingRight: 12
  	},
  	card8: {
    		top: 197
  	},
  	primitivediv4: {
    		paddingRight: 4
  	},
  	card9: {
    		top: 281
  	},
  	paragraph11: {
    		width: 64,
    		height: 16,
    		flexDirection: "row"
  	},
  	card10: {
    		top: 365
  	},
  	paragraph12: {
    		width: 74,
    		height: 16,
    		flexDirection: "row"
  	},
  	primitivediv6: {
    		paddingRight: 3
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
  	trendContent: {
    		padding: 20,
    		gap: 16
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
  	// New chart styles
  	pieChartContainer: {
    		flex: 1,
    		justifyContent: "center",
    		alignItems: "center",
    		paddingVertical: 20
  	},
  	pieItem: {
    		flexDirection: "row",
    		alignItems: "center",
    		marginBottom: 8,
    		width: "80%"
  	},
  	pieLegendColor: {
    		width: 16,
    		height: 16,
    		borderRadius: 8,
    		marginRight: 12
  	},
  	pieLegendText: {
    		flex: 1,
    		fontSize: 14,
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular"
  	},
  	actualPie: {
    		width: 120,
    		height: 120,
    		borderRadius: 60,
    		marginTop: 20,
    		position: "relative"
  	},
  	pieOverlay: {
    		position: "absolute",
    		top: 0,
    		left: 0,
    		right: 0,
    		bottom: 0,
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	pieCenterText: {
    		fontSize: 14,
    		fontWeight: "bold",
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular"
  	},
  	pieCenterSubtext: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular"
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
  	trendChartContainer: {
    		paddingVertical: 20,
    		paddingHorizontal: 10
  	},
  	trendLine: {
    		height: 200,
    		position: "relative"
  	},
  	trendConnectLine: {
    		position: "absolute",
    		width: 2,
    		backgroundColor: "#0ea5e9"
  	},
  	trendDot: {
    		position: "absolute",
    		width: 24,
    		height: 24,
    		borderRadius: 12,
    		backgroundColor: "#fff",
    		borderWidth: 2,
    		borderColor: "#0ea5e9",
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	trendDotValue: {
    		fontSize: 10,
    		color: "#0f172a",
    		fontWeight: "bold",
    		fontFamily: "Arimo-Regular"
  	},
  	trendXAxis: {
    		flexDirection: "row",
    		justifyContent: "space-around",
    		paddingTop: 10
  	},
  	trendXLabel: {
    		fontSize: 10,
    		color: "#64748b",
    		textAlign: "center",
    		fontFamily: "Arimo-Regular"
  	},
  	chartContainer: {
    		top: 69,
    		left: 13,
    		right: 13,
    		bottom: 40,
    		position: "absolute"
  	},
  	adherenceContainer: {
    		flex: 1,
    		alignSelf: "stretch",
    		gap: 16
  	},
  	chartWrapper: {
    		alignSelf: "stretch",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		minHeight: 300
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
  	trendChartWrapper: {
    		paddingHorizontal: 20,
    		marginTop: 16
  	},
  	pieEmpty: {
    		justifyContent: "center",
    		alignItems: "center",
    		width: 120,
    		height: 120,
    		backgroundColor: "#f1f5f9",
    		borderRadius: 60
  	},
  	pieEmptyText: {
    		fontSize: 12,
    		color: "#64748b",
    		textAlign: "center"
  	},
  	pieSlice: {
    		position: "absolute" as const,
    		width: 120,
    		height: 120
  	},
  	pieWedge: {
    		position: "absolute" as const,
    		width: "100%",
    		height: "100%"
  	},
  	pieWedgeFill: {
    		position: "absolute" as const,
    		width: "100%",
    		height: "100%"
  	},
  	pieWedgeOverlay: {
    		position: "absolute" as const,
    		top: "35%",
    		left: "50%",
    		transform: [{ translateX: -30 }],
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	pieWedgeLabel: {
    		fontSize: 10,
    		fontWeight: "bold",
    		color: "#0f172a",
    		textAlign: "center",
    		width: 60
  	},
  	pieCenterContent: {
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	pieChartTop: {
    		alignItems: "center",
    		marginBottom: 12
  	},
  	pieChartBottom: {
    		alignItems: "center",
    		width: "100%"
  	},
  	actualPieLarge: {
    		width: 180,
    		height: 180,
    		borderRadius: 90,
    		position: "relative"
  	},
  	pieSliceLarge: {
    		position: "absolute" as const,
    		width: 180,
    		height: 180
  	},
  	pieOverlayLarge: {
    		position: "absolute",
    		top: 0,
    		left: 0,
    		right: 0,
    		bottom: 0,
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	pieCenterTextLarge: {
    		fontSize: 18,
    		fontWeight: "bold",
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular"
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
  	trendsChartContainer: {
    		flexDirection: "row",
    		justifyContent: "center",
    		alignItems: "center",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid"
  	},
  	trendsYAxis: {
    		width: 30,
    		paddingRight: 8,
    		justifyContent: "space-between",
    		height: 160
  	},
  	trendAxisLabel: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		textAlign: "right"
  	},
  	trendsChartArea: {
    		flex: 1,
    		height: 160,
    		position: "relative"
  	},
  	trendsGrid: {
    		position: "absolute",
    		top: 0,
    		left: 0,
    		right: 0,
    		bottom: 0
  	},
  	trendsGridLine: {
    		position: "absolute",
    		right: 0,
    		left: 0,
    		height: 1,
    		backgroundColor: "#e2e8f0"
  	},
  	trendsLineContainer: {
    		position: "absolute",
    		top: 0,
    		left: 0,
    		right: 0,
    		bottom: 0
  	},
  	trendsPath: {
    		position: "absolute",
    		top: 0,
    		left: 0
  	},
  	trendsConnectionLine: {
    		position: "absolute",
    		height: 2,
    		backgroundColor: "#0ea5e9",
    		borderRadius: 1
  	},
  	trendsDataPoint: {
    		position: "absolute",
    		width: 20,
    		height: 20,
    		borderRadius: 10,
    		backgroundColor: "#fff",
    		borderWidth: 2,
    		borderColor: "#0ea5e9",
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	trendsDataPointLabel: {
    		fontSize: 10,
    		color: "#0f172a",
    		fontWeight: "bold",
    		fontFamily: "Arimo-Regular"
  	},
  	trendsXAxis: {
    		width: 30,
    		paddingLeft: 8,
    		justifyContent: "space-between",
    		height: 160
  	},
  	trendsXAxisLabelContainer: {
    		position: "absolute",
    		bottom: 0,
    		width: 40
  	},
  	trendXLabelAligned: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		textAlign: "center"
  	},
  	responsiveTrendsChartContainer: {
    		flexDirection: "row",
    		justifyContent: "center",
    		alignItems: "center",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid"
  	},
  	responsiveTrendsYAxis: {
    		width: 30,
    		paddingRight: 8,
    		justifyContent: "space-between",
    		height: 160
  	},
  	responsiveYAxisLabelContainer: {
    		position: "absolute",
    		right: 0,
    		width: 30,
    		justifyContent: "center"
  	},
  	responsiveXAxisLabelContainer: {
    		position: "absolute",
    		bottom: 0,
    		width: 40,
    		justifyContent: "center"
  	},
  	responsiveTrendAxisLabel: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		textAlign: "right"
  	},
  	responsiveTrendsChartArea: {
    		flex: 1,
    		height: 160,
    		position: "relative"
  	},
  	responsiveTrendsGrid: {
    		position: "absolute",
    		top: 0,
    		left: 0,
    		right: 0,
    		bottom: 0
  	},
  	responsiveTrendsGridLine: {
    		position: "absolute",
    		right: 0,
    		left: 0,
    		height: 1,
    		backgroundColor: "#e2e8f0"
  	},
  	responsiveTrendsLineContainer: {
    		position: "absolute",
    		top: 0,
    		left: 0,
    		right: 0,
    		bottom: 0
  	},
  	responsiveTrendsPath: {
    		position: "absolute",
    		top: 0,
    		left: 0
  	},
  	responsiveTrendsConnectionLine: {
    		position: "absolute",
    		height: 2,
    		backgroundColor: "#0ea5e9",
    		borderRadius: 1
  	},
  	responsiveTrendsDataPoint: {
    		position: "absolute",
    		width: 20,
    		height: 20,
    		borderRadius: 10,
    		backgroundColor: "#fff",
    		borderWidth: 2,
    		borderColor: "#0ea5e9",
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	responsiveTrendsDataPointLabel: {
    		fontSize: 10,
    		color: "#0f172a",
    		fontWeight: "bold",
    		fontFamily: "Arimo-Regular"
  	},
  	responsiveTrendsXAxis: {
    		width: 30,
    		paddingLeft: 8,
    		justifyContent: "flex-start",
    		height: 160,
    		position: "relative"
  	},
  	responsiveTrendsXAxisLabelContainer: {
    		position: "absolute",
    		bottom: 0,
    		width: 40,
    		justifyContent: "center"
  	},
  	responsiveTrendXLabelAligned: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		textAlign: "center"
  	},
  	simpleTrendsChartContainer: {
    		alignSelf: "stretch",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		minHeight: 300
  	},
  	simpleTrendsYAxis: {
    		alignItems: "flex-end",
    		paddingRight: 8,
    		flex: 1
  	},
  	simpleAxisLabel: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		marginVertical: 40,
    		textAlign: "right"
  	},
  	simpleChartWrapper: {
    		flex: 5
  	},
  	simpleGridContainer: {
    		position: "absolute",
    		left: 0,
    		right: 0,
    		top: 0,
    		bottom: 0
  	},
  	simpleGridLine: {
    		position: "absolute",
    		left: 0,
    		right: 0,
    		height: 1,
    		backgroundColor: "#e2e8f0"
  	},
  	simpleChartArea: {
    		position: "relative"
  	},
  	simpleLineSegment: {
    		position: "absolute",
    		backgroundColor: "#0ea5e9",
    		borderRadius: 1
  	},
  	simpleDataPoint: {
    		position: "absolute",
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 2,
    		borderColor: "#0ea5e9",
    		alignItems: "center",
    		justifyContent: "center",
    		padding: 4
  	},
  	simplePointValue: {
    		fontSize: 9,
    		fontWeight: "bold",
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular"
  	},
  	simplePointLabel: {
    		fontSize: 7,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		marginTop: 1,
    		textAlign: "center"
  	},
  	simpleTrendsContainer: {
    		alignSelf: "stretch",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		gap: 16
  	},
  	trendHeader: {
    		flexDirection: "row",
    		justifyContent: "space-between",
    		alignItems: "center",
    		paddingBottom: 12,
    		borderBottomWidth: 1,
    		borderBottomColor: "#e2e8f0"
  	},
  	trendHeaderLabel: {
    		fontSize: 14,
    		fontWeight: "bold",
    		color: "#64748b",
    		fontFamily: "Arimo-Regular"
  	},
  	trendHeaderValue: {
    		fontSize: 14,
    		fontWeight: "bold",
    		color: "#64748b",
    		fontFamily: "Arimo-Regular"
  	},
  	trendItem: {
    		flexDirection: "row",
    		justifyContent: "space-between",
    		alignItems: "center",
    		paddingVertical: 8
  	},
  	trendLabelContainer: {
    		flex: 1
  	},
  	trendDayLabel: {
    		fontSize: 14,
    		fontWeight: "500",
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular"
  	},
  	trendBarContainer: {
    		flex: 3,
    		marginLeft: 16
  	},
  	trendBar: {
    		height: 24,
    		backgroundColor: "#0ea5e9",
    		borderRadius: 12,
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	trendBarValue: {
    		fontSize: 12,
    		fontWeight: "bold",
    		color: "#fff",
    		fontFamily: "Arimo-Regular"
  	},
  	trendSummary: {
    		gap: 12,
    		paddingTop: 8,
    		borderTopWidth: 1,
    		borderTopColor: "#e2e8f0"
  	},
  	lineChartContainer: {
    		alignSelf: "stretch",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		gap: 16
  	},
  	lineChartYAxis: {
    		width: 40,
    		justifyContent: "space-between",
    		paddingRight: 8,
    		alignItems: "flex-end"
  	},
  	lineChartAxisLabel: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		textAlign: "right",
    		marginVertical: 30
  	},
  	lineChartWrapper: {
    		flex: 1,
    		position: "relative",
    		minHeight: 200
  	},
  	lineChartGrid: {
    		position: "absolute",
    		top: 0,
    		left: 0,
    		right: 0,
    		bottom: 0
  	},
  	lineChartGridLine: {
    		position: "absolute",
    		left: 0,
    		right: 0,
    		height: 1,
    		backgroundColor: "#e2e8f0"
  	},
  	lineChartArea: {
    		position: "relative",
    		flex: 1,
    		minHeight: 200
  	},
  	lineChartLineSegment: {
    		position: "absolute",
    		height: 3,
    		backgroundColor: "#0ea5e9",
    		borderRadius: 1
  	},
  	lineChartDataPoint: {
    		position: "absolute",
    		alignItems: "center",
    		justifyContent: "center",
    		marginTop: -12
  	},
  	lineChartDataPointCircle: {
    		width: 24,
    		height: 24,
    		borderRadius: 12,
    		backgroundColor: "#fff",
    		borderWidth: 2,
    		borderColor: "#0ea5e9",
    		justifyContent: "center",
    		alignItems: "center"
  	},
  	lineChartDataPointValue: {
    		fontSize: 10,
    		fontWeight: "bold",
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular"
  	},
  	lineChartDataPointLabel: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		marginTop: 4,
    		textAlign: "center"
  	},
  	cleanTrendChartContainer: {
    		alignSelf: "stretch",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		gap: 16
  	},
  	trendTitle: {
    		fontSize: 16,
    		fontWeight: "bold",
    		color: "#0f172a",
    		textAlign: "center",
    		fontFamily: "Arimo-Regular"
  	},
  	cleanChartArea: {
    		flexDirection: "row",
    		height: 180,
    		position: "relative"
  	},
  	cleanHorizontalScroll: {
    		flex: 1
  	},
  	cleanScrollContent: {
    		paddingLeft: 40,
    		paddingRight: 16,
    		alignItems: "center"
  	},
  	cleanDataContainer: {
    		height: 120,
    		paddingVertical: 20,
    		flexDirection: "row",
    		alignItems: "flex-end",
    		position: "relative",
    		minWidth: Dimensions.get('window').width - 120
  	},
  	cleanGridLine: {
    		position: "absolute",
    		left: 0,
    		right: 0,
    		height: 1,
    		backgroundColor: "#e2e8f0",
    		opacity: 0.5
  	},
  	cleanDataPoint: {
    		position: "relative",
    		alignItems: "center",
    		justifyContent: "flex-end",
    		width: 80
  	},
  	cleanConnectLine: {
    		position: "absolute",
    		backgroundColor: "#0ea5e9",
    		height: 3,
    		borderRadius: 1.5,
    		zIndex: 1
  	},
  	cleanPointCircle: {
    		width: 28,
    		height: 28,
    		borderRadius: 14,
    		backgroundColor: "#fff",
    		borderWidth: 2,
    		borderColor: "#0ea5e9",
    		justifyContent: "center",
    		alignItems: "center",
    		zIndex: 3,
    		elevation: 2,
    		shadowColor: "#000",
    		shadowOpacity: 0.1,
    		shadowOffset: { width: 0, height: 1 },
    		shadowRadius: 2
  	},
  	cleanPointText: {
    		fontSize: 11,
    		fontWeight: "bold",
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular"
  	},
  	cleanPointLabel: {
    		fontSize: 11,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		marginTop: 6,
    		textAlign: "center"
  	},
  	cleanYAxis: {
    		width: 40,
    		justifyContent: "space-between",
    		paddingRight: 8,
    		alignItems: "flex-end",
    		paddingTop: 20,
    		paddingBottom: 20
  	},
  	cleanAxisLabel: {
    		fontSize: 10,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		textAlign: "right"
  	},
  	simpleTrendChartContainer: {
    		alignSelf: "stretch",
    		padding: 16,
    		backgroundColor: "#fff",
    		borderRadius: 20,
    		borderWidth: 1.3,
    		borderColor: "#e2e8f0",
    		borderStyle: "solid",
    		gap: 16
  	},
  	simpleBarChartContainer: {
    		flexDirection: "row",
    		justifyContent: "space-around",
    		alignItems: "flex-end",
    		paddingVertical: 20,
    		paddingHorizontal: 16,
    		flexWrap: "wrap",
    		gap: 12
  	},
  	simpleBarColumn: {
    		alignItems: "center",
    		minWidth: 40,
    		flex: 1
  	},
  	simpleBarValue: {
    		fontSize: 12,
    		fontWeight: "bold",
    		color: "#0f172a",
    		fontFamily: "Arimo-Regular",
    		marginBottom: 8,
    		textAlign: "center"
  	},
  	simpleBarWrapper: {
    		height: 140,
    		justifyContent: "flex-end",
    		alignItems: "center",
    		width: 24
  	},
  	simpleBar: {
    		width: 24,
    		backgroundColor: "#0ea5e9",
    		borderRadius: 6,
    		minHeight: 20
  	},
  	simpleBarLabel: {
    		fontSize: 11,
    		color: "#64748b",
    		fontFamily: "Arimo-Regular",
    		marginTop: 8,
    		textAlign: "center",
    		maxWidth: 50
  	}
});

export default App1;
