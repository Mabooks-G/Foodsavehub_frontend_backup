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
  const [chartType, setChartType] = useState("pie"); // "pie", "bar", "line"
  const [timePeriod, setTimePeriod] = useState("weekly"); // "weekly", "monthly"
  const [chartData, setChartData] = useState([]);
  const [totalStats, setTotalStats] = useState({ totalUsed: 0, totalWasted: 0, totalEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllData();
  }, [currentUser, timePeriod]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const email = currentUser?.email;
      if (!email) {
        setError("User email not available");
        return;
      }
  
      // Fetch all data - UPDATED PATHS
      const [statsResponse, chartResponse] = await Promise.all([
        fetch(`${API_BACKEND}/api/wasteanalyses/stats?email=${email}`), // CHANGED
        fetch(`${API_BACKEND}/api/wasteanalyses/${timePeriod}?email=${email}`) // CHANGED
      ]);
  
      if (!statsResponse.ok) throw new Error('Failed to fetch waste statistics');
      if (!chartResponse.ok) throw new Error(`Failed to fetch ${timePeriod} data`);
  
      const statsData = await statsResponse.json();
      const chartData = await chartResponse.json();
  
      setTotalStats(statsData);
      setChartData(chartData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching waste data:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Chart rendering functions
  const renderPieChart = () => {
    const pieData = [
      { name: "Used", value: totalStats.totalUsed, color: COLORS.used },
      { name: "Wasted", value: totalStats.totalWasted, color: COLORS.wasted }
    ].filter(item => item.value > 0);

    if (pieData.length === 0) {
      return (
        <div className="no-data">
          <p>No data available for pie chart</p>
          <p className="no-data-msg">Track some food usage to see analytics</p>
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
          <p className="no-data-msg">No waste entries found for the selected period</p>
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
          <p className="no-data-msg">No waste entries found for the selected period</p>
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
    
    return `${baseTitle} (${timePeriod})`;
  };

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
            <div className="stat-number">{totalStats.totalUsed}</div>
            <div className="stat-label">Items Used</div>
          </div>
        </div>
        <div className="stat-card wasted">
          <div className="stat-icon">🗑️</div>
          <div className="stat-content">
            <div className="stat-number">{totalStats.totalWasted}</div>
            <div className="stat-label">Items Wasted</div>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{totalStats.totalEntries}</div>
            <div className="stat-label">Total Entries</div>
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
              ? `Showing ${chartData.length} data points • ${totalStats.totalUsed + totalStats.totalWasted} total items`
              : 'No data available'
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
            <span className="summary-label">Usage Rate:</span>
            <span className="summary-value">
              {totalStats.totalUsed + totalStats.totalWasted > 0 
                ? `${((totalStats.totalUsed / (totalStats.totalUsed + totalStats.totalWasted)) * 100).toFixed(1)}%`
                : "0%"
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Waste Rate:</span>
            <span className="summary-value">
              {totalStats.totalUsed + totalStats.totalWasted > 0 
                ? `${((totalStats.totalWasted / (totalStats.totalUsed + totalStats.totalWasted)) * 100).toFixed(1)}%`
                : "0%"
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Impact:</span>
            <span className="summary-value">
              {totalStats.totalUsed} items saved from waste
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WasteAnalyses;