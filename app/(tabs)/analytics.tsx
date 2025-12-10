import * as React from "react";
import { useState, useEffect } from "react";
import {Text, StyleSheet, View, Pressable, Image, ScrollView, Dimensions} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, G } from "react-native-svg";
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
    dailyData: [91, 88, 95, 85, 92, 89, 87],
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
    }
  }, [analyticsData, selectedTab]);

  const updateIntakeData = () => {
    const medications = analyticsData.medicationBreakdown;
    const totalDoses = analyticsData.totalDoses || 100;
    const totalAdherenceSum = medications.reduce((sum, med) => sum + med.adherence, 0);

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

    let pieData = medications.map((medication, index) => {
      const adherence = medication.adherence;
      const doses = Math.round((adherence / 100) * totalDoses);
      const percentage = totalAdherenceSum > 0 ? (adherence / totalAdherenceSum) * 100 : 100 / medications.length;

      return {
        name: medication.name,
        doses,
        percentage,
        color: colors[index % colors.length]
      };
    });

    let normalizedPieData = [...pieData];
    if (normalizedPieData.length > 0) {
      const totalPercentage = normalizedPieData.reduce((sum, item) => sum + item.percentage, 0);
      normalizedPieData = normalizedPieData.map(item => ({
        ...item,
        percentage: Math.round((item.percentage / totalPercentage) * 100)
      }));

      let sumRounded = normalizedPieData.reduce((sum, item) => sum + item.percentage, 0);
      let difference = 100 - sumRounded;

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
    const current = analyticsData.adherence;
    let previous: number;
    let improvementMessage: string;

    switch (selectedPeriod) {
      case 'week':
        previous = 88.5;
        improvementMessage = current > 95
          ? `Your adherence has improved by ${(current - previous).toFixed(1)}% this week. Keep up the great work!`
          : `Your adherence has decreased by ${(previous - current).toFixed(1)}% this week. Please consider maintaining regular medication intake.`;
        break;
      case 'month':
        previous = 89.2;
        improvementMessage = current > 95
          ? `Your adherence has improved by ${(current - previous).toFixed(1)}% this month. Keep up the great work!`
          : `Your adherence has decreased by ${(previous - current).toFixed(1)}% this month. Please consider maintaining regular medication intake.`;
        break;
      case 'quarter':
        previous = 86.8;
        improvementMessage = current > 95
          ? `Your adherence has improved by ${(current - previous).toFixed(1)}% this quarter. Keep up the great work!`
          : `Your adherence has decreased by ${(previous - current).toFixed(1)}% this quarter. Please consider maintaining regular medication intake.`;
        break;
      case 'year':
        previous = 82.1;
        improvementMessage = current > 95
          ? `Your adherence has improved by ${(current - previous).toFixed(1)}% this year. Keep up the great work!`
          : `Your adherence has decreased by ${(previous - current).toFixed(1)}% this year. Please consider maintaining regular medication intake.`;
        break;
      default:
        previous = 85;
        improvementMessage = `Your adherence has changed from ${previous.toFixed(1)}% to ${current.toFixed(1)}%.`;
    }

    setTrendData({
      hasImproved: current > previous,
      percentageChange: Math.abs(current - previous),
      message: improvementMessage,
      previousAdherence: previous,
      currentAdherence: current
    });
  };

  const getPeriodData = (period: PeriodType, historyData: any[]) => {
    const now = new Date();
    let dataPoints: number[] = [];
    let labels: string[] = [];

    switch (period) {
      case 'week':
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
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 27);

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
        const quarterStart = new Date(now);
        quarterStart.setMonth(now.getMonth() - 2);
        quarterStart.setDate(1);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let month = 0; month < 3; month++) {
          const monthStartDate = new Date(quarterStart);
          monthStartDate.setMonth(quarterStart.getMonth() + month);

          const monthEndDate = new Date(monthStartDate);
          monthEndDate.setMonth(monthStartDate.getMonth() + 1);
          monthEndDate.setDate(0);

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
        const yearStart = new Date(now);
        yearStart.setMonth(now.getMonth() - 9);

        for (let quarter = 0; quarter < 4; quarter++) {
          const quarterStartDate = new Date(yearStart);
          quarterStartDate.setMonth(yearStart.getMonth() + (quarter * 3));

          const quarterEndDate = new Date(quarterStartDate);
          quarterEndDate.setMonth(quarterStartDate.getMonth() + 3);
          quarterEndDate.setDate(0);

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

      let medicationBreakdown: Array<{name: string, adherence: number}> = [];
      let dataPoints: number[] = [];
      let streak: number;
      let missedDoses: number;

      switch (selectedPeriod) {
        case 'week':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: 92},
            {name: 'Metformin', adherence: 96},
            {name: 'Aspirin', adherence: 99},
            {name: 'Atorvastatin', adherence: 94},
            {name: 'Levothyroxine', adherence: 98}
          ];
          dataPoints = [91, 88, 95, 85, 92, 89, 87];
          streak = 7;
          missedDoses = 3;
          break;
        case 'month':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: 89},
            {name: 'Metformin', adherence: 93},
            {name: 'Aspirin', adherence: 96},
            {name: 'Atorvastatin', adherence: 87}
          ];
          dataPoints = [88, 92, 85, 90];
          streak = 12;
          missedDoses = 5;
          break;
        case 'quarter':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: 85},
            {name: 'Metformin', adherence: 89},
            {name: 'Aspirin', adherence: 92}
          ];
          dataPoints = [84, 87, 90];
          streak = 28;
          missedDoses = 8;
          break;
        case 'year':
          medicationBreakdown = [
            {name: 'Lisinopril', adherence: 82},
            {name: 'Metformin', adherence: 85}
          ];
          dataPoints = [80, 75, 82, 88];
          streak = 95;
          missedDoses = 15;
          break;
      }

      const averageAdherence = medicationBreakdown.length > 0
        ? Math.round(medicationBreakdown.reduce((sum, med) => sum + med.adherence, 0) / medicationBreakdown.length)
        : 90;

      setAnalyticsData({
        adherence: averageAdherence,
        totalDoses: dataPoints.length * 10,
        streak: streak,
        missedDoses: missedDoses,
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
    const size = 180;
    const radius = 90;
    const centerX = size / 2;
    const centerY = size / 2;

    const paths = data.map((item, index) => {
      const startAngle = data.slice(0, index).reduce((sum, prevItem) => sum + (prevItem.percentage / 100) * 360, 0);
      const endAngle = startAngle + (item.percentage / 100) * 360;

      const startAngleRad = (startAngle - 90) * Math.PI / 180;
      const endAngleRad = (endAngle - 90) * Math.PI / 180;

      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);

      const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;

      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return (
        <Path key={`slice-${index}`} d={pathData} fill={item.color} />
      );
    });

    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChartTop}>
          <View style={styles.actualPieLarge}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <G>
                {paths}
              </G>
            </Svg>

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

  const renderAdherenceChart = (data: number[], period: PeriodType) => {
    const periodData = getPeriodData(period, []);
    const labels = periodData.labels;

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
    const periodData = getPeriodData(selectedPeriod, []);
    const labels = periodData.labels;

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 80;
    const chartHeight = 200;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const plotWidth = chartWidth - paddingLeft - paddingRight;
    const plotHeight = chartHeight - paddingTop - paddingBottom;

    const points = dataPoints.map((value, index) => {
      const x = paddingLeft + (index * plotWidth / Math.max(1, dataPoints.length - 1));
      const y = paddingTop + ((100 - value) / 100) * plotHeight;
      return {
        x: Math.max(paddingLeft, Math.min(chartWidth - paddingRight - 16, x)),
        y: Math.max(paddingTop, Math.min(chartHeight - paddingBottom - 16, y)),
        value,
        label: labels[index] || `Day ${index + 1}`
      };
    });

    return (
      <View style={styles.properTrendsContainer}>
        <View style={styles.trendHeader}>
          <Text style={styles.trendHeaderLabel}>
            {selectedPeriod === 'week' && 'Daily Adherence Trend'}
            {selectedPeriod === 'month' && 'Weekly Adherence Trend'}
            {selectedPeriod === 'quarter' && 'Monthly Adherence Trend'}
            {selectedPeriod === 'year' && 'Quarterly Adherence Trend'}
          </Text>
        </View>

        <View style={[styles.trendChartContainerFixed, { width: chartWidth, height: chartHeight + 50 }]}>
          <View style={[styles.trendGridContainerFixed, { width: chartWidth, height: chartHeight }]}>
            {[0, 1, 2, 3, 4].map(level => (
              <View key={level} style={[styles.trendGridLineFixed, { top: paddingTop + (level * plotHeight / 4) }]} />
            ))}
          </View>

          <View style={[styles.trendYAxisFixed, { height: plotHeight, top: paddingTop }]}>
            {[100, 75, 50, 25, 0].map(value => (
              <Text key={value} style={styles.trendAxisLabel}>{value}%</Text>
            ))}
          </View>

          <View style={[styles.trendChartAreaFixed, { width: chartWidth, height: chartHeight }]}>
            {points.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = points[index - 1];
              const dx = point.x - prevPoint.x;
              const dy = point.y - prevPoint.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const constrainedX = Math.max(0, Math.min(chartWidth - distance, prevPoint.x));
              const constrainedY = Math.max(0, Math.min(chartHeight - 10, prevPoint.y));

              return (
                <View
                  key={`line-${index}`}
                  style={[
                    styles.trendLineSegment,
                    {
                      left: constrainedX,
                      top: constrainedY,
                      width: Math.min(distance, chartWidth - constrainedX),
                      transform: [{ rotate: `${angle}deg` }],
                      transformOrigin: '0 0',
                      backgroundColor: point.value >= prevPoint.value ? '#10B981' : '#EF4444'
                    }
                  ]}
                />
              );
            })}

            {points.map((point, index) => (
              <View
                key={`point-${index}`}
                style={[
                  styles.trendDataPoint,
                  {
                    left: Math.max(paddingLeft, Math.min(chartWidth - paddingRight - 16, point.x - 8)),
                    top: Math.max(paddingTop, Math.min(chartHeight - paddingBottom - 16, point.y - 8))
                  }
                ]}
              >
                <Text style={styles.trendPointValue}>{point.value}%</Text>
              </View>
            ))}
          </View>

          <View style={[styles.trendXAxisFixed, { width: plotWidth, left: paddingLeft, bottom: 50 }]}>
            {points.map((point, index) => (
              <Text key={`label-${index}`} style={styles.trendXLabel}>
                {point.label}
              </Text>
            ))}
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
              <Text style={[styles.dailyAdherenceRate, styles.adherenceTypo]}>
                {selectedPeriod === 'week' ? 'Daily' :
                 selectedPeriod === 'month' ? 'Weekly' :
                 selectedPeriod === 'quarter' ? 'Monthly' :
                 'Quarterly'} Adherence Rate
              </Text>
            </View>
            <View style={styles.chartWrapper}>
              {renderAdherenceChart(analyticsData.dailyData, selectedPeriod)}
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
  icon: {
    height: 14,
    width: 14
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
  pieOverlayLarge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center"
  },
  pieCenterContent: {
    justifyContent: "center",
    alignItems: "center"
  },
  pieCenterTextLarge: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffffff",
    fontFamily: "Arimo-Regular"
  },
  pieCenterSubtext: {
    fontSize: 10,
    color: "#ffffffff",
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
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    gap: 16
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
    alignSelf: "stretch",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    minHeight: 320
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
  trendChartContainerFixed: {
    position: "relative",
    overflow: "hidden"
  },
  trendGridContainerFixed: {
    position: "absolute",
    width: "100%",
    height: "100%"
  },
  trendGridLineFixed: {
    position: "absolute",
    right: 0,
    left: 50,
    height: 0.5,
    backgroundColor: "#f1f5f9"
  },
  trendYAxisFixed: {
    position: "absolute",
    left: 0,
    width: 50,
    top: 20,
    height: 140,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 8
  },
  trendAxisLabel: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
    textAlign: "right"
  },
  trendChartAreaFixed: {
    position: "absolute",
    width: "100%",
    height: "100%"
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
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center"
  },
  trendPointValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0f172a",
    fontFamily: "Arimo-Regular"
  },
  trendXAxisFixed: {
    position: "absolute",
    bottom: 0,
    justifyContent: "space-around",
    flexDirection: "row",
    paddingTop: 8
  },
  trendXLabel: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Arimo-Regular",
    textAlign: "center"
  }
});

export default App1;
