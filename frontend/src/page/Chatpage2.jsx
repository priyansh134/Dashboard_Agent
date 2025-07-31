import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { BarChartIcon, LineChart, PieChart, Users, Calendar, DollarSign, Paperclip, Plus, ArrowRight, Download, ChevronDown, Send, Upload, Mic, MicOff } from 'lucide-react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState("bar");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const url = "http://127.0.0.1:8080";
  //const url = "https://duckdb-super-ai.onrender.com";



  const chartTypes = [
    { type: "bar", icon: BarChartIcon, label: "Bar Chart" },
    { type: "line", icon: LineChart, label: "Line Chart" },
    { type: "pie", icon: PieChart, label: "Pie Chart" },
  ];

  const quickQueries = [
    { text: "Show me the top 5 customers by total orders", icon: BarChartIcon },
    { text: "Calculate average order value by country", icon: Users },
    { text: "Monthly sales trends", icon: Calendar },
    { text: "Revenue breakdown by category", icon: DollarSign },
    { text: "Show product performance by region", icon: BarChartIcon },
    { text: "Customer retention analysis", icon: Users },
    { text: "Seasonal sales patterns", icon: Calendar },
    { text: "Profit margin by product category", icon: DollarSign },
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

      // Add the query to conversation history immediately
      const newConversationEntry = {
        id: Date.now(),
        query: queryToSend,
        timestamp: new Date(),
        isLoading: true,
        data: null,
        chartType: selectedChartType
      };

      setConversationHistory(prev => [...prev, newConversationEntry]);

      const res = await axios.post(`${url}/generate_sql`, {
        text: queryToSend,
        filePath: filePath,
      }, { responseType: 'blob' });

      const reader = new FileReader();
      reader.onload = () => {
        const csvText = reader.result;
        Papa.parse(csvText, {
          complete: (results) => {
            // Update the conversation history with the result
            setConversationHistory(prev => 
              prev.map(entry => 
                entry.id === newConversationEntry.id 
                  ? { ...entry, data: results.data, isLoading: false }
                  : entry
              )
            );
            
            // Keep the current dataRows for the latest result (for backward compatibility)
            setdataRows(results.data);
            setIsLoading(false);
            
            // Clear the input
            setuserQuery("");
            setUserQueryy("");
          },
        });
      };
      reader.readAsText(res.data);
    } catch (error) {
      console.error('Error fetching CSV:', error);
      
      // Update the conversation history to show error
      setConversationHistory(prev => 
        prev.map(entry => 
          entry.isLoading 
            ? { ...entry, isLoading: false, error: "Failed to generate results" }
            : entry
        )
      );
      
      setIsLoading(false);
      setDisplay(false);
      setBadgeCount(0);
    }
  };

  const handleDownload = (data, queryText) => {
    if (!data || data.length === 0) {
      alert("No data available to download");
      return;
    }

    try {
      const csvString = Papa.unparse(data);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      const fileName = `query_result_${Date.now()}.csv`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating the download:", error);
    }
  };

  const generateChartOptions = (data, chartType = selectedChartType) => {
    if (!data || data.length < 2) return {};

    const headers = data[0];
    const rows = data.slice(1);

    let xAxis, yAxis;
    if (headers.length >= 2) {
      xAxis = headers[0];
      yAxis = headers[1];
    } else {
      return {};
    }

    const seriesData = rows.map(row => ({
      name: row[0],
      value: parseFloat(row[1]) || 0
    }));

    switch (chartType) {
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



  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setIsListening(true);
      };

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setuserQuery(transcript);
        setUserQueryy(transcript);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #f3f4f6;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar userName="Alisson" />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {conversationHistory.length === 0 ? (
            // Welcome State
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChartIcon className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Welcome to Data Analytics
                </h2>
                <p className="text-gray-600 mb-8">
                  Upload your data and start querying with natural language. 
                  Your results will appear here.
                </p>
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-sm text-gray-500">
                    👈 Use the chat panel to get started
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Conversation History
            <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar" style={{scrollbarWidth: 'thin', scrollbarColor: '#6B7280 #F3F4F6'}}>
              {/* Header with Clear Button */}
              <div className="sticky top-0 bg-gradient-to-br from-gray-50 to-gray-100 p-4 border-b border-gray-200 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">Query History</h2>
                  <button
                    onClick={() => setConversationHistory([])}
                    className="flex items-center px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    Clear History
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-6">
                {conversationHistory.map((conversation, index) => (
                  <div key={conversation.id} className="bg-white rounded-xl shadow-lg p-6">
                    {/* Query Header */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Query #{index + 1}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {conversation.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                        <p className="text-gray-700 italic">"{conversation.query}"</p>
                      </div>
                    </div>

                    {/* Results */}
                    {conversation.isLoading ? (
                      <div className="py-8">
                        <Skeleton />
                      </div>
                    ) : conversation.error ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600">{conversation.error}</p>
                      </div>
                    ) : conversation.data ? (
                      <div className="space-y-6">
                        {/* Controls */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-md font-medium text-gray-700">Results</h4>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleDownload(conversation.data, conversation.query)}
                              className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-lg border border-gray-200 bg-white">
                          <div 
                            className="overflow-auto max-h-96 custom-scrollbar" 
                            style={{
                              scrollbarWidth: 'thin', 
                              scrollbarColor: '#6B7280 #F3F4F6'
                            }}
                          >
                            <table className="w-full min-w-max">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    #
                                  </th>
                                  {conversation.data[0]?.map((header, headerIndex) => (
                                    <th
                                      key={headerIndex}
                                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {conversation.data?.slice(1, 11).map((row, rowIndex) => (
                                  <tr key={rowIndex} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                      {rowIndex + 1}
                                    </td>
                                    {row.map((cell, cellIndex) => (
                                      <td
                                        key={cellIndex}
                                        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {conversation.data.length > 11 && (
                            <div className="bg-gray-50 px-4 py-3 text-center text-sm text-gray-600 border-t">
                              Showing first 10 rows of {conversation.data.length - 1} total rows
                            </div>
                          )}
                        </div>

                        {/* Chart */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h4 className="text-md font-medium mb-4 text-gray-700">Data Visualization</h4>
                          <div 
                            className="h-[300px] overflow-auto rounded-lg bg-white p-2 custom-scrollbar" 
                            style={{
                              scrollbarWidth: 'thin', 
                              scrollbarColor: '#6B7280 #F3F4F6'
                            }}
                          >
                            <ReactECharts
                              option={generateChartOptions(conversation.data, conversation.chartType)}
                              style={{ height: '100%', minWidth: '400px', minHeight: '280px' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
                
                {/* Loading indicator for new query */}
                {isLoading && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Query #{conversationHistory.length}
                      </h3>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                        <p className="text-gray-700 italic">Processing...</p>
                      </div>
                    </div>
                    <div className="py-8">
                      <Skeleton />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className="w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Data Assistant</h3>
            <p className="text-sm text-gray-600">Ask questions about your data in natural language</p>
          </div>

          {/* File Upload */}
          <div className="p-4 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Data File</label>
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => uploadFile(e.target.files[0])}
                accept=".csv,.txt"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
              >
                <Upload className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  {filePath ? "File uploaded ✓" : "Upload CSV/TXT file"}
                </span>
              </label>
            </div>
          </div>

          {/* Quick Queries Dropdown */}
          <div className="p-4 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sample Queries</label>
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setDefaultQuery(e.target.value);
                    e.target.value = ""; // Reset dropdown
                  }
                }}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a sample query...</option>
                {quickQueries.map((query, index) => (
                  <option key={index} value={query.text}>
                    {query.text}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Chat Input */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Query</label>
              <div className="relative">
                <textarea
                  className="w-full h-32 resize-none border border-gray-300 rounded-lg px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ask me anything about your data..."
                  value={userQueryy || userQuery}
                  onChange={(e) => {
                    setuserQuery(e.target.value);
                    setUserQueryy(e.target.value);
                  }}
                />
                {/* Voice Recognition Button */}
                <button
                  onClick={toggleVoiceRecognition}
                  className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isListening && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  Listening... Speak now
                </p>
              )}
            </div>

            {/* Send Button */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={generateSQL}
                disabled={isLoading || !filePath}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Generate Query
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ChatPage;

