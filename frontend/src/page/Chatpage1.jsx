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
  const [chartOptions, setChartOptions] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar userName="Alisson" />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {!display ? (
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
            // Results Area
            <div className="h-full overflow-auto">
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Query Results</h2>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <select
                        value={selectedChartType}
                        onChange={(e) => setSelectedChartType(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {chartTypes.map((chart) => (
                          <option key={chart.type} value={chart.type}>
                            {chart.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <Skeleton />
                ) : (
                  <div className="space-y-8">
                    {/* Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            {dataRows?.[0]?.map((header, index) => (
                              <th
                                key={index}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dataRows?.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {rowIndex + 1}
                              </td>
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-4 py-3 text-sm text-gray-900"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Chart */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">Data Visualization</h3>
                      <div className="h-[400px]">
                        <ReactECharts
                          option={chartOptions}
                          style={{ height: '100%' }}
                        />
                      </div>
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
  );
};

export default ChatPage;

