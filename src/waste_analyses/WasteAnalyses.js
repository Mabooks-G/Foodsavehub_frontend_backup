/* Author: Gift Mabokela
   Event: Sprint 2
   LatestUpdate: 2025/09/28 - Region name shown in city charts
   Description: Waste analysis dashboard with dropdown controls
   Returns: React component for waste analysis visualization
*/

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
};

const WasteAnalyses = ({ currentUser }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError] = useState("");

  const [chartType, setChartType] = useState("pie"); // pie | line | bar
  const [timeRange, setTimeRange] = useState("weekly"); // weekly | monthly

  useEffect(() => {
    if (currentUser?.email) {
      fetchAllData();
    }
  }, [currentUser]);

  const fetchAllData = async () => {
    if (!currentUser?.email) return;

    try {
      setLoading(true);
      setError("");
      const email = currentUser.email;

      const endpoints = [
        "user-pie-data",
        "user-weekly-data",
        "user-monthly-data",
        "city-weekly-data",
        "city-monthly-data",
      ];

      const responses = await Promise.all(
        endpoints.map(async (endpoint) => {
          const url = `${API_BACKEND}/api/wasteanalyses/${endpoint}?email=${encodeURIComponent(email)}`;
          try {
            const response = await fetch(url, { credentials: "include" });
            if (!response.ok) return { error: `Status ${response.status}`, endpoint };
            return await response.json();
          } catch (fetchError) {
            return { error: fetchError.message, endpoint };
          }
        })
      );

      const transformedData = {
        userPie: transformPieData(responses[0]),
        userWeekly: transformTimeData(responses[1], "weekly"),
        userMonthly: transformTimeData(responses[2], "monthly"),
        cityWeekly: transformTimeData(responses[3], "weekly"),
        cityMonthly: transformTimeData(responses[4], "monthly"),
        // store city/region name once for chart headings
        cityName:
          responses[3]?.[0]?.region ||
          responses[3]?.[0]?.city ||
          responses[4]?.[0]?.region ||
          responses[4]?.[0]?.city ||
          "City",
      };

      setData(transformedData);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Transformations -----------------
  const transformPieData = (pieData) => {
    if (!pieData || typeof pieData !== "object") return { used: 0, wasted: 0, hasData: false };
    return {
      used: Number(pieData.used) || 0,
      wasted: Number(pieData.wasted) || 0,
      hasData: pieData.hasData !== false,
      city: pieData.city || "Region",
    };
  };

  const transformTimeData = (timeData, rangeType) => {
    if (!Array.isArray(timeData)) return [];
    return timeData.map((item) => ({
      period:
        rangeType === "weekly"
          ? item.week_display || item.week || item.period || "Unknown"
          : item.month_display || item.month || item.period || "Unknown",
      waste: Number(item.waste || item.amountwasted || item.wasted || 0),
    }));
  };

  // ----------------- Chart Renderers -----------------
  const renderPieChart = (chartData, title) => {
    if (!chartData.hasData) {
      return (
        <div className="chart-card no-data">
          <h3>{title}</h3>
          <p className="no-data-msg">No data available</p>
        </div>
      );
    }

    return (
      <div className="chart-card">
        <h3>{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={[
                { name: "Used", value: chartData.used },
                { name: "Wasted", value: chartData.wasted },
              ]}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              <Cell key="used" fill={COLORS.used} />
              <Cell key="wasted" fill={COLORS.wasted} />
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderLineChart = (chartData, title, color) => (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="waste" stroke={color} name="Waste" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderBarChart = (chartData, title, color) => (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="waste" fill={color} name="Waste" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // ----------------- Chart Selector -----------------
  const renderSelectedCharts = () => {
    if (chartType === "pie") {
      return (
        <div className="chart-grid">
          {renderPieChart(data.userPie || { used: 0, wasted: 0 }, "Your Usage vs Waste")}
        </div>
      );
    }

    if (chartType === "line") {
      return (
        <div className="chart-grid">
          {renderLineChart(
            data[`user${capitalize(timeRange)}`] || [],
            `Your ${capitalize(timeRange)} Waste`,
            COLORS.userWaste
          )}
          {renderLineChart(
            data[`city${capitalize(timeRange)}`] || [],
            `${data.cityName} ${capitalize(timeRange)} Waste`,
            COLORS.cityWaste
          )}
        </div>
      );
    }

    if (chartType === "bar") {
      return (
        <div className="chart-grid">
          {renderBarChart(
            data[`user${capitalize(timeRange)}`] || [],
            `Your ${capitalize(timeRange)} Waste`,
            COLORS.userWaste
          )}
          {renderBarChart(
            data[`city${capitalize(timeRange)}`] || [],
            `${data.cityName} ${capitalize(timeRange)} Waste`,
            COLORS.cityWaste
          )}
        </div>
      );
    }
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // ----------------- MAIN RENDER -----------------
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading waste analysis data...</p>
      </div>
    );
  }

  return (
    <div className="waste-analysis-container">
      <div className="dashboard-header">
        <h1>🍽️ Waste Analysis Dashboard</h1>
        {lastUpdated && <div className="last-updated">Last updated: {lastUpdated}</div>}
        <button onClick={fetchAllData} className="refresh-btn">🔄 Refresh Data</button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={fetchAllData} className="retry-btn">Retry</button>
        </div>
      )}

      {/* Controls */}
      <div className="chart-controls">
        <div className="control-group">
          <label>Chart Type:</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
            <option value="pie">Pie Chart</option>
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>
        <div className="control-group">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Chart Display */}
      <div className="chart-section">
        {renderSelectedCharts()}
      </div>
    </div>
  );
};

export default WasteAnalyses;
