import React, { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer
} from "recharts";
import "./WasteAnalyses.css";

const API_BACKEND = process.env.REACT_APP_API_BACKEND;

const COLORS = {
  used: "#4CAF50",
  wasted: "#F44336",
  userWaste: "#F44336",
  cityWaste: "#2196F3",
  regional: "#FF9800"
};

// List of supported regions
const VALID_REGIONS = [
  "Durban, KwaZulu-Natal",
  "Cape Town, Western Cape",
  "Pretoria, Gauteng",
  "Johannesburg, Gauteng",
  "Port Elizabeth (Gqeberha), Eastern Cape",
  "Bloemfontein, Free State",
  "Nelspruit (Mbombela), Mpumalanga",
  "Kimberley, Northern Cape",
  "Potchefstroom, North West",
  "Polokwane, Limpopo",
  "George, Western Cape",
  "East London, Eastern Cape",
  "Welkom, Free State",
  "Mthatha, Eastern Cape",
  "Stellenbosch, Western Cape",
  "Pietermaritzburg, KwaZulu-Natal"
];

const WasteAnalyses = ({ currentUser }) => {
  const [chartType, setChartType] = useState("pie"); // "pie", "bar", "line"
  const [timePeriod, setTimePeriod] = useState("weekly"); // "weekly", "monthly"
  const [dataScope, setDataScope] = useState("personal"); // "personal", "regional"
  const [region, setRegion] = useState("");
  const [chartData, setChartData] = useState([]);
  const [totalStats, setTotalStats] = useState({ totalUsed: 0, totalWasted: 0, totalEntries: 0 });
  const [regionalStats, setRegionalStats] = useState({ regionalUsed: 0, regionalWasted: 0, regionalEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Set user's region on component mount
  useEffect(() => {
    if (currentUser?.region && VALID_REGIONS.includes(currentUser.region)) {
      setRegion(currentUser.region);
    } else if (VALID_REGIONS.length > 0) {
      setRegion(VALID_REGIONS[0]); // Default to first region
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAllData();
  }, [currentUser, timePeriod, dataScope, region]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const email = currentUser?.email;
      if (!email) {
        setError("User email not available");
        return;
      }

      if (dataScope === "personal") {
        // Fetch personal data
        const [statsResponse, chartResponse] = await Promise.all([
          fetch(`${API_BACKEND}/api/wasteanalyses/stats?email=${email}`),
          fetch(`${API_BACKEND}/api/wasteanalyses/${timePeriod}?email=${email}`)
        ]);

        if (!statsResponse.ok) throw new Error('Failed to fetch personal statistics');
        if (!chartResponse.ok) throw new Error(`Failed to fetch ${timePeriod} data`);

        const statsData = await statsResponse.json();
        const chartData = await chartResponse.json();

        setTotalStats(statsData);
        setRegionalStats({ regionalUsed: 0, regionalWasted: 0, regionalEntries: 0 });
        setChartData(chartData);
      } else {
        // Fetch regional data
        const [regionalStatsResponse, regionalChartResponse] = await Promise.all([
          fetch(`${API_BACKEND}/api/wasteanalyses/regional/stats?region=${encodeURIComponent(region)}`),
          fetch(`${API_BACKEND}/api/wasteanalyses/regional/${timePeriod}?region=${encodeURIComponent(region)}`)
        ]);

        if (!regionalStatsResponse.ok) throw new Error('Failed to fetch regional statistics');
        if (!regionalChartResponse.ok) throw new Error(`Failed to fetch regional ${timePeriod} data`);

        const regionalStatsData = await regionalStatsResponse.json();
        const regionalChartData = await regionalChartResponse.json();

        setRegionalStats(regionalStatsData);
        setTotalStats({ totalUsed: 0, totalWasted: 0, totalEntries: 0 });
        setChartData(regionalChartData);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching waste data:", err);
      
      // Set empty data on error
      setTotalStats({ totalUsed: 0, totalWasted: 0, totalEntries: 0 });
      setRegionalStats({ regionalUsed: 0, regionalWasted: 0, regionalEntries: 0 });
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  // Chart rendering functions
  const renderPieChart = () => {
    let pieData = [];
    
    if (dataScope === "personal") {
      pieData = [
        { name: "Used", value: totalStats.totalUsed, color: COLORS.used },
        { name: "Wasted", value: totalStats.totalWasted, color: COLORS.wasted }
      ].filter(item => item.value > 0);
    } else {
      pieData = [
        { name: "Used", value: regionalStats.regionalUsed, color: COLORS.used },
        { name: "Wasted", value: regionalStats.regionalWasted, color: COLORS.wasted }
      ].filter(item => item.value > 0);
    }

    if (pieData.length === 0) {
      return (
        <div className="no-data">
          <p>No data available for pie chart</p>
          <p className="no-data-msg">
            {dataScope === "personal" 
              ? "Track some food usage to see analytics" 
              : "No regional data available for the selected region"
            }
          </p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderBarChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="no-data">
          <p>No data available for bar chart</p>
          <p className="no-data-msg">
            {dataScope === "personal" 
              ? "No waste entries found for the selected period" 
              : "No regional data available for the selected region and period"
            }
          </p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
          <Legend />
          <Bar dataKey="used" fill={COLORS.used} name="Items Used" />
          <Bar dataKey="wasted" fill={COLORS.wasted} name="Items Wasted" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderLineChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="no-data">
          <p>No data available for line chart</p>
          <p className="no-data-msg">
            {dataScope === "personal" 
              ? "No waste entries found for the selected period" 
              : "No regional data available for the selected region and period"
            }
          </p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="used" 
            stroke={COLORS.used} 
            name="Items Used" 
            strokeWidth={2} 
            dot={{ fill: COLORS.used, strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="wasted" 
            stroke={COLORS.wasted} 
            name="Items Wasted" 
            strokeWidth={2} 
            dot={{ fill: COLORS.wasted, strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case "pie":
        return renderPieChart();
      case "bar":
        return renderBarChart();
      case "line":
        return renderLineChart();
      default:
        return renderPieChart();
    }
  };

  const getChartTitle = () => {
    const baseTitle = chartType === "pie" 
      ? "Usage vs Waste Distribution" 
      : chartType === "bar" 
        ? `${timePeriod === "weekly" ? "Daily" : "Weekly"} Waste Analysis` 
        : "Waste Trends Over Time";
    
    const scopeText = dataScope === "personal" ? "Personal" : `Regional (${region})`;
    
    return `${scopeText} - ${baseTitle}`;
  };

  const getTotalUsed = () => dataScope === "personal" ? totalStats.totalUsed : regionalStats.regionalUsed;
  const getTotalWasted = () => dataScope === "personal" ? totalStats.totalWasted : regionalStats.regionalWasted;
  const getTotalEntries = () => dataScope === "personal" ? totalStats.totalEntries : regionalStats.regionalEntries;

  if (loading) {
    return (
      <div className="waste-analysis-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading waste analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="waste-analysis-container">
      <div className="dashboard-header">
        <h1>Waste Analysis Dashboard</h1>
        <div className="last-updated">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="retry-btn" onClick={fetchAllData}>
            Retry
          </button>
        </div>
      )}

      {/* Total Statistics */}
      <div className="total-stats">
        <div className="stat-card used">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{getTotalUsed()}</div>
            <div className="stat-label">
              {dataScope === "personal" ? "Items Used" : "Regional Items Used"}
            </div>
          </div>
        </div>
        <div className="stat-card wasted">
          <div className="stat-icon">🗑️</div>
          <div className="stat-content">
            <div className="stat-number">{getTotalWasted()}</div>
            <div className="stat-label">
              {dataScope === "personal" ? "Items Wasted" : "Regional Items Wasted"}
            </div>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{getTotalEntries()}</div>
            <div className="stat-label">
              {dataScope === "personal" ? "Total Entries" : "Regional Entries"}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="chart-controls">
        {/* Chart Type Buttons */}
        <div className="control-group">
          <label>Chart Type</label>
          <div className="button-group">
            <button 
              className={`chart-btn ${chartType === "pie" ? "active" : ""}`}
              onClick={() => setChartType("pie")}
            >
              Pie Chart
            </button>
            <button 
              className={`chart-btn ${chartType === "bar" ? "active" : ""}`}
              onClick={() => setChartType("bar")}
            >
              Bar Chart
            </button>
            <button 
              className={`chart-btn ${chartType === "line" ? "active" : ""}`}
              onClick={() => setChartType("line")}
            >
              Line Chart
            </button>
          </div>
        </div>

        {/* Time Period Buttons */}
        <div className="control-group">
          <label>Time Period</label>
          <div className="button-group">
            <button 
              className={`period-btn ${timePeriod === "weekly" ? "active" : ""}`}
              onClick={() => setTimePeriod("weekly")}
            >
              Weekly
            </button>
            <button 
              className={`period-btn ${timePeriod === "monthly" ? "active" : ""}`}
              onClick={() => setTimePeriod("monthly")}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Data Scope Buttons */}
        <div className="control-group">
          <label>Data Scope</label>
          <div className="button-group">
            <button 
              className={`scope-btn ${dataScope === "personal" ? "active" : ""}`}
              onClick={() => setDataScope("personal")}
            >
              Personal
            </button>
            <button 
              className={`scope-btn ${dataScope === "regional" ? "active" : ""}`}
              onClick={() => setDataScope("regional")}
            >
              Regional
            </button>
          </div>
        </div>

        {/* Region Selector (only show for regional data) */}
        {dataScope === "regional" && (
          <div className="control-group">
            <label>Region</label>
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              className="region-select"
            >
              {VALID_REGIONS.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>
        )}

        <button className="refresh-btn" onClick={fetchAllData}>
          Refresh Data
        </button>
      </div>

      {/* Chart Container */}
      <div className="chart-container">
        <div className="chart-header">
          <h2>{getChartTitle()}</h2>
          <div className="chart-summary">
            {chartData.length > 0 
              ? `Showing ${chartData.length} data points • ${getTotalUsed() + getTotalWasted()} total items`
              : dataScope === "personal" 
                ? 'No personal data available' 
                : `No regional data available for ${region}`
            }
          </div>
        </div>
        {renderChart()}
      </div>

      {/* Data Summary */}
      <div className="data-summary">
        <h3>Performance Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">
              {dataScope === "personal" ? "Your Usage Rate:" : "Regional Usage Rate:"}
            </span>
            <span className="summary-value">
              {getTotalUsed() + getTotalWasted() > 0 
                ? `${((getTotalUsed() / (getTotalUsed() + getTotalWasted())) * 100).toFixed(1)}%`
                : "0%"
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">
              {dataScope === "personal" ? "Your Waste Rate:" : "Regional Waste Rate:"}
            </span>
            <span className="summary-value">
              {getTotalUsed() + getTotalWasted() > 0 
                ? `${((getTotalWasted() / (getTotalUsed() + getTotalWasted())) * 100).toFixed(1)}%`
                : "0%"
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">
              {dataScope === "personal" ? "Your Total Impact:" : "Regional Total Impact:"}
            </span>
            <span className="summary-value">
              {getTotalUsed()} items saved from waste
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WasteAnalyses;