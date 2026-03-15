/**
 * Predictive Engine — Gemini-powered leave pattern analysis
 * Analyzes historical leave data and predicts future patterns
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Leave = require("../models/leaveModel");
const User = require("../models/userModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ────────────────────────────────────────────────────────────
   Data Aggregation for Gemini
   ──────────────────────────────────────────────────────────── */

/**
 * Aggregate Historical Leave Data from Database
 * ✅ NOW USES REAL DATA from MongoDB, not static mock data
 */

/**
 * Validate and sanitize Gemini response
 */
const validateAndSanitizeResponse = (prediction) => {
  if (!prediction.riskAnalysis) {
    prediction.riskAnalysis = {
      criticalWeeks: [],
      mediumRiskWeeks: [],
      lowRiskWeeks: [],
    };
  }

  // Sanitize critical weeks
  prediction.riskAnalysis.criticalWeeks = (
    prediction.riskAnalysis.criticalWeeks || []
  )
    .filter((w) => w && typeof w === "object")
    .map((week) => ({
      week: typeof week.week === "string" ? week.week : `Week unknown`,
      percentage:
        typeof week.percentage === "number"
          ? Math.min(week.percentage, 100)
          : 0,
      riskLevel: "CRITICAL",
      departments: Array.isArray(week.departments)
        ? week.departments.filter((d) => typeof d === "string")
        : [],
      recommendation:
        typeof week.recommendation === "string"
          ? week.recommendation
          : "Monitor closely",
    }));

  // Similar sanitization for medium and low risk weeks
  prediction.riskAnalysis.mediumRiskWeeks = (
    prediction.riskAnalysis.mediumRiskWeeks || []
  )
    .filter((w) => w && typeof w === "object")
    .map((week) => ({
      week: typeof week.week === "string" ? week.week : `Week unknown`,
      percentage:
        typeof week.percentage === "number"
          ? Math.min(week.percentage, 100)
          : 0,
      riskLevel: "MEDIUM",
      departments: Array.isArray(week.departments)
        ? week.departments.filter((d) => typeof d === "string")
        : [],
      recommendation:
        typeof week.recommendation === "string"
          ? week.recommendation
          : "Plan ahead",
    }));

  prediction.riskAnalysis.lowRiskWeeks = (
    prediction.riskAnalysis.lowRiskWeeks || []
  )
    .filter((w) => w && typeof w === "object")
    .map((week) => ({
      week: typeof week.week === "string" ? week.week : `Week unknown`,
      percentage: typeof week.percentage === "number" ? week.percentage : 0,
      riskLevel: "LOW",
      departments: Array.isArray(week.departments) ? week.departments : [],
      recommendation:
        typeof week.recommendation === "string"
          ? week.recommendation
          : "Safe period",
    }));

  // Sanitize recommendations
  prediction.recommendations = (prediction.recommendations || [])
    .filter((r) => r && typeof r === "object")
    .map((rec) => ({
      priority: typeof rec.priority === "string" ? rec.priority : "MEDIUM",
      action: typeof rec.action === "string" ? rec.action : "Review",
      reason: typeof rec.reason === "string" ? rec.reason : "Data analysis",
      suggestedTiming:
        typeof rec.suggestedTiming === "string" ? rec.suggestedTiming : "ASAP",
      impact: typeof rec.impact === "string" ? rec.impact : "Important",
    }));

  // Sanitize department insights
  prediction.departmentInsights = prediction.departmentInsights || {};
  Object.keys(prediction.departmentInsights).forEach((dept) => {
    const insight = prediction.departmentInsights[dept];
    prediction.departmentInsights[dept] = {
      highRiskWeeks:
        typeof insight?.highRiskWeeks === "number" ? insight.highRiskWeeks : 0,
      expectedLeavePercentage:
        typeof insight?.expectedLeavePercentage === "number"
          ? Math.min(insight.expectedLeavePercentage, 100)
          : 0,
      peakMonth:
        typeof insight?.peakMonth === "string" ? insight.peakMonth : "Unknown",
    };
  });

  return prediction;
};

const aggregateHistoricalData = async (months = 12) => {
  try {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - months);

    // ✅ Query real leaves from database
    const leaves = await Leave.find({
      startDate: { $gte: pastDate }, // ✅ CHANGED: Use startDate instead of createdAt
      status: "approved",
    })
      .populate("faculty", "name department email")
      .lean();
    console.log(leaves);
    console.log(
      `📊 Found ${leaves.length} approved leaves in past ${months} months`,
    );

    if (!leaves.length) {
      console.warn("⚠️ No historical leave data found, using empty structure");
      return {
        totalLeaves: 0,
        byMonth: {},
        byDepartment: {},
        byType: {},
        averageLeavesByFaculty: 0,
        totalUniqueFaculty: 0,
        raw: [],
      };
    }

    const MONTHS_ARR = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const byMonth = {};
    const byDepartment = {};
    const byType = {};
    const totalFaculty = new Set();
    const weeklyBreakdown = {}; // ✅ NEW: Track leaves by week

    leaves.forEach((leave) => {
      // Month aggregation
      const month = new Date(leave.startDate).getMonth();
      const monthName = MONTHS_ARR[month];
      byMonth[monthName] = (byMonth[monthName] || 0) + 1;

      // Department aggregation
      const dept = leave.faculty?.department || "Unknown";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      // Leave type aggregation
      byType[leave.leaveType] = (byType[leave.leaveType] || 0) + 1;

      // Faculty count
      totalFaculty.add(leave.faculty?._id);

      // ✅ NEW: Weekly breakdown for pattern detection
      const startDate = new Date(leave.startDate);
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split("T")[0];
      weeklyBreakdown[weekKey] = (weeklyBreakdown[weekKey] || 0) + 1;
    });

    // ✅ NEW: Find weeks with most leaves
    const sortedWeeks = Object.entries(weeklyBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 weeks

    const peakWeeks = sortedWeeks.map(([week, count]) => ({
      week: `Week of ${week}`,
      leaveCount: count,
      percentage: Math.round((count / totalFaculty.size) * 100),
    }));

    const result = {
      totalLeaves: leaves.length,
      totalUniqueFaculty: totalFaculty.size,
      averageLeavesByFaculty: Math.round(leaves.length / totalFaculty.size),
      byMonth,
      byDepartment,
      byType,
      peakWeeks, // ✅ NEW: Show when most leaves happen
      raw: leaves.map((l) => ({
        faculty: l.faculty?.name,
        department: l.faculty?.department,
        type: l.leaveType,
        startDate: new Date(l.startDate).toISOString().split("T")[0],
        endDate: new Date(l.endDate).toISOString().split("T")[0],
        days: l.totalDays,
      })),
    };

    console.log("✅ Historical data aggregated:", {
      total: result.totalLeaves,
      faculty: result.totalUniqueFaculty,
      departments: Object.keys(byDepartment),
      peakWeeks: result.peakWeeks,
    });

    return result;
  } catch (error) {
    console.error("❌ Error aggregating historical data:", error);
    throw error;
  }
};

/* ────────────────────────────────────────────────────────────
   Academic Calendar (Mock for now, can be expanded)
   ──────────────────────────────────────────────────────────── */

const getAcademicCalendar = () => {
  const currentYear = new Date().getFullYear();
  return {
    semesterStart: `${currentYear}-01-15`,
    semesterEnd: `${currentYear}-05-31`,
    examWeeks: [
      { week: `Week of ${currentYear}-04-15`, description: "Mid-term exams" },
      { week: `Week of ${currentYear}-05-01`, description: "Final exams" },
    ],
    holidayWeeks: [
      {
        week: `Week of ${currentYear}-03-15`,
        description: "Spring break",
      },
    ],
    graduationWeek: `${currentYear}-05-20`,
    importantDates: [
      { date: `${currentYear}-02-14`, event: "Valentine's Day (Holiday)" },
      { date: `${currentYear}-03-08`, event: "International Women's Day" },
    ],
  };
};

/* ────────────────────────────────────────────────────────────
   Gemini Prediction
   ──────────────────────────────────────────────────────────── */

const predictLeavePatterns = async (historicalData, academicCalendar) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are an AI assistant analyzing faculty leave patterns for a college.

## Historical Leave Data (Past 12 months):
${JSON.stringify(historicalData, null, 2)}

## Academic Calendar:
${JSON.stringify(academicCalendar, null, 2)}

Based on this data, provide a JSON analysis with:

1. **riskAnalysis**: Identify high-risk weeks (when many faculty might take leave)
   - Week name
   - Predicted percentage of faculty likely to be on leave
   - Risk level: CRITICAL (40%+), MEDIUM (25-40%), LOW (<25%)
   - Affected departments
   - Recommendations for each risk level

2. **departmentInsights**: For each department, predict:
   - High-risk weeks
   - Expected leave percentage
   - Department-specific patterns

3. **recommendations**: Actionable suggestions
   - Priority (HIGH, MEDIUM, LOW)
   - Action to take
   - Reason why
   - Suggested timing
   - Impact if not addressed

4. **patterns**: Identify trends
   - Most common leave months
   - Least common leave months
   - Department-specific patterns
   - Leave type preferences

IMPORTANT: Return ONLY valid JSON, no markdown or extra text.
Start with { and end with }

Format:
{
  "riskAnalysis": {
    "criticalWeeks": [{"week": "...", "percentage": 45, "riskLevel": "CRITICAL", "departments": [], "recommendation": "..."}],
    "mediumRiskWeeks": [...],
    "lowRiskWeeks": [...]
  },
  "departmentInsights": {
    "CS": {"highRiskWeeks": 3, "expectedLeavePercentage": 35},
    "EE": {...}
  },
  "recommendations": [
    {"priority": "HIGH", "action": "...", "reason": "...", "suggestedTiming": "...", "impact": "..."}
  ],
  "patterns": {
    "mostCommonMonths": [...],
    "leastCommonMonths": [...],
    "departmentPatterns": {...}
  }
}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Gemini response:", responseText);
      return null;
    }

    const prediction = JSON.parse(jsonMatch[0]);
    return prediction;
  } catch (error) {
    console.error("Gemini Prediction Error:", error);
    throw error;
  }
};

/* ────────────────────────────────────────────────────────────
   Fallback (Mock) Predictions
   ──────────────────────────────────────────────────────────── */

const getFallbackPredictions = (historicalData) => {
  return {
    riskAnalysis: {
      criticalWeeks: [
        {
          week: "Week of Mar 10-16",
          percentage: 42,
          riskLevel: "CRITICAL",
          departments: ["CS", "EE"],
          recommendation:
            "Postpone non-critical meetings. Ensure exam coverage.",
        },
        {
          week: "Week of Apr 21-27",
          percentage: 35,
          riskLevel: "MEDIUM",
          departments: ["ME"],
          recommendation:
            "Plan for reduced staffing. Schedule important deadlines earlier.",
        },
      ],
      mediumRiskWeeks: [
        {
          week: "Week of Feb 18-24",
          percentage: 28,
          riskLevel: "MEDIUM",
          departments: ["Civil"],
          recommendation: "Monitor leave requests closely.",
        },
      ],
      lowRiskWeeks: [
        {
          week: "Week of Jan 8-14",
          percentage: 12,
          riskLevel: "LOW",
          departments: [],
          recommendation: "Safe to schedule major activities.",
        },
      ],
    },
    departmentInsights: {
      CS: {
        highRiskWeeks: 3,
        expectedLeavePercentage: 38,
        pattern: "Peak in March-April",
      },
      EE: {
        highRiskWeeks: 2,
        expectedLeavePercentage: 32,
        pattern: "Distributed throughout year",
      },
      ME: {
        highRiskWeeks: 2,
        expectedLeavePercentage: 25,
        pattern: "Clustered around holidays",
      },
    },
    recommendations: [
      {
        priority: "HIGH",
        action: "Postpone Mid-term Exams",
        reason: "40% CS faculty out Week of Apr 5",
        suggestedTiming: "Move to Apr 12",
        impact: "Prevents exam oversight issues",
      },
      {
        priority: "HIGH",
        action: "Extend Grading Deadline",
        reason: "High overlap during Apr 21-27",
        suggestedTiming: "Extend by 1 week",
        impact: "Reduces grading bottleneck",
      },
      {
        priority: "MEDIUM",
        action: "Reschedule Faculty Meeting",
        reason: "Multiple absences in March",
        suggestedTiming: "Move to February",
        impact: "Better attendance",
      },
    ],
    patterns: {
      mostCommonMonths: ["March", "April"],
      leastCommonMonths: ["January", "December"],
      departmentPatterns: {
        CS: "Spring peak due to conferences",
        EE: "Even distribution",
        ME: "Holiday clusters",
      },
    },
  };
};

/* ────────────────────────────────────────────────────────────
   Main Prediction Function
   ──────────────────────────────────────────────────────────── */

/**
 * Get Predictive Insights using REAL historical data
 * ✅ Fetches actual leaves from database, not mock data
 */
const getPredictiveInsights = async (departmentFilter = null) => {
  try {
    console.log("🚀 Starting predictive analysis...");

    // ✅ STEP 1: Aggregate REAL historical data from database
    const historicalData = await aggregateHistoricalData(12);

    if (historicalData.totalLeaves === 0) {
      console.warn("⚠️ No historical leave data found");
      return {
        source: "fallback",
        message: "No historical data available. Please add leave records.",
        data: getFallbackPredictions(historicalData),
      };
    }

    console.log(
      `📈 Analyzing ${historicalData.totalLeaves} approved leaves...`,
    );

    // ✅ STEP 2: Get academic calendar
    const academicCalendar = getAcademicCalendar();

    // ✅ STEP 3: Send REAL data to Gemini
    console.log("🤖 Sending real data to Gemini...");
    let predictions = await predictLeavePatterns(
      historicalData,
      academicCalendar,
    );

    // ✅ STEP 4: Validate and sanitize response
    if (!predictions) {
      console.warn("⚠️ Gemini prediction failed, using fallback");
      predictions = getFallbackPredictions(historicalData);
    } else {
      predictions = validateAndSanitizeResponse(predictions);
      console.log("✅ Gemini predictions received and validated");
    }

    // ✅ STEP 5: Filter by department if requested
    if (departmentFilter) {
      predictions = filterByDepartment(predictions, departmentFilter);
      console.log(`🏢 Filtered predictions for ${departmentFilter}`);
    }

    return {
      source: "gemini",
      generatedAt: new Date().toISOString(),
      historicalDataSummary: {
        totalLeaves: historicalData.totalLeaves,
        totalFaculty: historicalData.totalUniqueFaculty,
        byDepartment: historicalData.byDepartment,
        peakWeeks: historicalData.peakWeeks,
      },
      data: predictions,
    };
  } catch (error) {
    console.error("❌ Error in getPredictiveInsights:", error);
    // Return error response instead of crashing
    return {
      source: "error",
      error: error.message,
      data: getFallbackPredictions({}),
    };
  }
};

/* ────────────────────────────────────────────────────────────
   Filter predictions by department
   ──────────────────────────────────────────────────────────── */

const filterByDepartment = (predictions, department) => {
  return {
    riskAnalysis: {
      criticalWeeks: predictions.riskAnalysis.criticalWeeks.filter(
        (w) => !w.departments || w.departments.includes(department),
      ),
      mediumRiskWeeks: predictions.riskAnalysis.mediumRiskWeeks.filter(
        (w) => !w.departments || w.departments.includes(department),
      ),
      lowRiskWeeks: predictions.riskAnalysis.lowRiskWeeks.filter(
        (w) => !w.departments || w.departments.includes(department),
      ),
    },
    departmentInsights: {
      [department]: predictions.departmentInsights[department] || {},
    },
    recommendations: predictions.recommendations.filter(
      (r) =>
        r.reason.toLowerCase().includes(department.toLowerCase()) ||
        r.priority === "HIGH",
    ),
    patterns: predictions.patterns,
  };
};

module.exports = {
  getPredictiveInsights,
  aggregateHistoricalData,
  getAcademicCalendar,
  predictLeavePatterns,
  getFallbackPredictions,
  filterByDepartment,
};
