import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { BarChartIcon, LineChart, PieChart, Users, Calendar, DollarSign, Paperclip, Plus, ArrowRight, Download, ChevronDown } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { Navbar } from '../components/Navbar';
import Skeleton from '../components/Skeleton';
import { QueryInput } from "../components/QueryInput";

const ChatPage = () => {
  const [userQuery, setuserQuery] = useState("");
  const [userQueryy, setUserQueryy] = useState("");
  const [dataRows, setdataRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [display, setDisplay] = useState(false);
  const [filePath, setfilePath] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState("bar");
  const [chartOptions, setChartOptions] = useState({});

  const url="http://127.0.0.1:8080";
 // const url = "https://duckdb-super-ai.onrender.com";

  const businesses = [
    {
      name: "Factory Girl Restaurant",
      address: "89 Stratford Lane",
      metrics: "1.40M - 661.7K"
    },
    {
      name: "Downtown Cafe",
      address: "123 Main St",
      metrics: "890K - 445.2K"
    }
  ];

  const chartTypes = [
    { type: "bar", icon: BarChartIcon, label: "Bar Chart" },
    { type: "line", icon: LineChart, label: "Line Chart" },
    { type: "pie", icon: PieChart, label: "Pie Chart" },
  ];

  const handleQueryChange = (newQuery) => {
    setUserQueryy(newQuery);
  };

  const selectFile = (data) => {
    setBadgeCount(1);
    setIsDropdownOpen(false);
    setfilePath(data);
  };

  const setDefaultQuery = (data) => {
    setuserQuery(data);
    setUserQueryy(data);
  };

  const uploadFile = async (file) => {
    if (!file) {
      throw new Error('No file provided for upload.');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${url}/upload_file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setfilePath(res.data.filePath);
      alert("File uploaded successfully!");
      return res.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(error.response?.data?.error || 'File upload failed.');
    }
  };

  const generateSQL = async () => {
    try {
      if (!userQuery && !userQueryy) {
        alert("Please enter a query");
        return;
      }

      const queryToSend = userQueryy || userQuery;

      if (!filePath) {
        alert("Please upload a file");
        return;
      }

      setIsLoading(true);
      setDisplay(true);

      const res = await axios.post(`${url}/generate_sql`, {
        text: queryToSend,
        filePath: filePath,
      }, { responseType: 'blob' });

      const reader = new FileReader();
      reader.onload = () => {
        const csvText = reader.result;
        Papa.parse(csvText, {
          complete: (results) => {
            setdataRows(results.data);
            setIsLoading(false);
          },
        });
      };
      reader.readAsText(res.data);
    } catch (error) {
      console.error('Error fetching CSV:', error);
      setIsLoading(false);
      setDisplay(false);
      setBadgeCount(0);
    }
  };

  const handleDownload = () => {
    if (!dataRows || dataRows.length === 0) {
      alert("No data available to download");
      return;
    }

    try {
      const csvString = Papa.unparse(dataRows);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'data.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating the download:", error);
    }
  };

  const generateChartOptions = () => {
    if (!dataRows || dataRows.length < 2) return {};

    const headers = dataRows[0];
    const data = dataRows.slice(1);

    let xAxis, yAxis;
    if (headers.length >= 2) {
      xAxis = headers[0];
      yAxis = headers[1];
    } else {
      return {};
    }

    const seriesData = data.map(row => ({
      name: row[0],
      value: parseFloat(row[1]) || 0
    }));

    switch (selectedChartType) {
      case 'bar':
        return {
          xAxis: {
            type: 'category',
            data: seriesData.map(item => item.name),
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            data: seriesData.map(item => item.value),
            type: 'bar'
          }],
          tooltip: {
            trigger: 'axis'
          }
        };
      case 'line':
        return {
          xAxis: {
            type: 'category',
            data: seriesData.map(item => item.name),
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            data: seriesData.map(item => item.value),
            type: 'line'
          }],
          tooltip: {
            trigger: 'axis'
          }
        };
      case 'pie':
        return {
          series: [{
            type: 'pie',
            data: seriesData,
            radius: '50%'
          }],
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          }
        };
      default:
        return {};
    }
  };

  useEffect(() => {
    if (dataRows.length > 0) {
      setChartOptions(generateChartOptions());
    }
  }, [dataRows, selectedChartType]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName="Alisson" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl text-center font-semibold mb-6">Overview</h1>

          {/* Business Selector */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Business</h2>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full text-left bg-white border rounded-lg px-4 py-2 flex items-center justify-between hover:border-gray-400 transition-colors"
              >
                <span className="text-gray-700">
                  {selectedBusiness || "Select a business"}
                </span>
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </button>
              {isDropdownOpen && (
                <div className="absolute w-full mt-2 bg-white border rounded-lg shadow-lg z-10">
                  {businesses.map((business, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setSelectedBusiness(business.name);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <div className="font-medium">{business.name}</div>
                      <div className="text-sm text-gray-500">
                        {business.address} - {business.metrics}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Query Interface */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Query Interface</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  className="flex items-center px-3 py-1.5 bg-white border rounded-lg text-sm hover:border-gray-400 transition-colors"
                  onClick={() => setDefaultQuery("Show me the top 5 customers by total orders")}
                >
                  <BarChartIcon className="h-4 w-4 mr-2" />
                  <span>Top 5 customers</span>
                </button>
                <button
                  className="flex items-center px-3 py-1.5 bg-white border rounded-lg text-sm hover:border-gray-400 transition-colors"
                  onClick={() => setDefaultQuery("Calculate average order value by country")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  <span>Average order value</span>
                </button>
                {/* Add more sample queries as needed */}
              </div>

              <div className="border rounded-lg p-4">

                <textarea
                  className="w-full min-h-[100px] resize-none border-0 focus:ring-0 text-sm outline-none"
                  placeholder="Enter your natural language query..."
                  value={userQueryy || userQuery}
                  onChange={(e) => {
                    setuserQuery(e.target.value);
                    setUserQueryy(e.target.value);
                  }}
                />
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer">
                      <Paperclip className="h-5 w-5 text-gray-500" />
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => uploadFile(e.target.files[0])}
                        accept=".csv,.txt"
                      />
                    </label>
                    <QueryInput
                      onQueryChange={handleQueryChange}
                      query={userQueryy}
                      isLoading={loading}
                    />
                  </div>
                  <button
                    onClick={generateSQL}
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {display && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Query Results</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center px-3 py-1.5 bg-white border rounded-lg text-sm hover:border-gray-400 transition-colors"
                  >
                    {chartTypes.find(chart => chart.type === selectedChartType)?.label || "Select Chart"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                      {chartTypes.map((chart) => (
                        <button
                          key={chart.type}
                          className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                          onClick={() => {
                            setSelectedChartType(chart.type);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <chart.icon className="h-4 w-4 mr-2" />
                          {chart.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center px-3 py-1.5 border rounded-lg text-sm hover:border-gray-400 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </button>
              </div>
            </div>

            {isLoading ? (
              <Skeleton />
            ) : (
              <div className="space-y-8">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-500">
                          INDEX
                        </th>
                        {dataRows?.[0]?.map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-2 border-b text-left text-sm font-medium text-gray-500"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataRows?.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="px-4 py-2 border-b text-sm text-gray-700">
                            {rowIndex + 1}
                          </td>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-2 border-b text-sm text-gray-700"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Charts */}
                <div className="space-y-8">
                  <div className="h-[400px]">
                    <ReactECharts
                      option={chartOptions}
                      style={{ height: '100%' }}
                    />
                  </div>
                  {/* Add more charts as needed */}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;

