import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { BarChartIcon, LineChart, PieChart, Users, Calendar, DollarSign, Paperclip, Plus, ArrowRight, Download, ChevronDown, Send, Upload, Mic, MicOff } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { Navbar } from '../components/Navbar';
import Skeleton from '../components/Skeleton';
import { QueryInput } from "../components/QueryInput";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const ChatPage = () => {
  const { user, isAuthenticated, isLoading: userLoading } = useUser();
  const navigate = useNavigate();

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, userLoading, navigate]);

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
  const [chartCustomization, setChartCustomization] = useState({});
  const [pinnedCharts, setPinnedCharts] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isConnectedToDatabase, setIsConnectedToDatabase] = useState(false);
  const chartRefs = useRef({});
  const chartInstances = useRef({});
  const url = "http://127.0.0.1:8080";

  // Show loading screen while checking authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BarChartIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Dashboard Agent...</h2>
          <p className="text-gray-600">Checking authentication status</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (backup check)
  if (!isAuthenticated) {
    return null; // The useEffect will handle the redirect
  }

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
      
      // Initialize chart customization for this conversation
      setChartCustomization(prev => ({
        ...prev,
        [newConversationEntry.id]: {
          xAxis: 0,
          yAxis: 1,
          chartType: selectedChartType
        }
      }));

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

  const generateChartOptions = (data, chartType = selectedChartType, customXAxis = null, customYAxis = null, conversationId = null) => {
    if (!data || data.length < 2) return {};

    const headers = data[0];
    const rows = data.slice(1);

    // Use custom axis selections if provided
    const customization = conversationId ? chartCustomization[conversationId] : null;
    const xAxisIndex = customXAxis !== null ? customXAxis : (customization?.xAxis !== undefined ? customization.xAxis : 0);
    const yAxisIndex = customYAxis !== null ? customYAxis : (customization?.yAxis !== undefined ? customization.yAxis : 1);
    const selectedChartType = customization?.chartType || chartType;

    if (xAxisIndex >= headers.length || yAxisIndex >= headers.length) {
      return {};
    }

    const seriesData = rows.map(row => ({
      name: row[xAxisIndex] || '',
      value: parseFloat(row[yAxisIndex]) || 0
    }));

    // Color palettes for charts
    const colorPalettes = {
      vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
      professional: ['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'],
      pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA', '#E0BBE4', '#FFDFD3', '#C7CEEA'],
      gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7']
    };

    const colors = colorPalettes.vibrant;

    switch (selectedChartType) {
      case 'bar':
        return {
          title: {
            text: `${headers[yAxisIndex]} by ${headers[xAxisIndex]}`,
            left: 'center',
            textStyle: {
              fontSize: 18,
              fontWeight: 'bold',
              color: '#2c3e50'
            }
          },
          xAxis: {
            type: 'category',
            data: seriesData.map(item => item.name),
            axisLabel: {
              rotate: seriesData.length > 5 ? 45 : 0,
              fontSize: 12,
              margin: 8
            },
            name: headers[xAxisIndex],
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: {
              fontSize: 13,
              fontWeight: 'bold'
            }
          },
          yAxis: {
            type: 'value',
            name: headers[yAxisIndex],
            nameLocation: 'middle',
            nameGap: 60,
            nameTextStyle: {
              fontSize: 13,
              fontWeight: 'bold'
            },
            axisLabel: {
              fontSize: 12
            }
          },
          series: [{
            data: seriesData.map((item, index) => ({
              value: item.value,
              itemStyle: {
                color: colors[index % colors.length]
              }
            })),
            type: 'bar',
            barWidth: '60%',
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }],
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: {
              color: '#fff'
            }
          },
          grid: {
            left: '15%',
            right: '10%',
            bottom: '20%',
            top: '20%',
            containLabel: true
          }
        };
      case 'line':
        return {
          title: {
            text: `${headers[yAxisIndex]} vs ${headers[xAxisIndex]}`,
            left: 'center',
            textStyle: {
              fontSize: 18,
              fontWeight: 'bold',
              color: '#2c3e50'
            }
          },
          xAxis: {
            type: 'category',
            data: seriesData.map(item => item.name),
            name: headers[xAxisIndex],
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: {
              fontSize: 13,
              fontWeight: 'bold'
            },
            axisLabel: {
              fontSize: 12,
              margin: 8
            }
          },
          yAxis: {
            type: 'value',
            name: headers[yAxisIndex],
            nameLocation: 'middle',
            nameGap: 60,
            nameTextStyle: {
              fontSize: 13,
              fontWeight: 'bold'
            },
            axisLabel: {
              fontSize: 12
            }
          },
          series: [{
            data: seriesData.map(item => item.value),
            type: 'line',
            smooth: true,
            lineStyle: {
              width: 3,
              color: colors[0]
            },
            itemStyle: {
              color: colors[0],
              borderWidth: 2,
              borderColor: '#fff'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [{
                  offset: 0, color: colors[0] + '40'
                }, {
                  offset: 1, color: colors[0] + '10'
                }]
              }
            }
          }],
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: {
              color: '#fff'
            }
          },
          grid: {
            left: '15%',
            right: '10%',
            bottom: '20%',
            top: '20%',
            containLabel: true
          }
        };
      case 'pie':
        return {
          title: {
            text: `Distribution of ${headers[yAxisIndex]}`,
            left: 'center',
            textStyle: {
              fontSize: 18,
              fontWeight: 'bold',
              color: '#2c3e50'
            }
          },
          series: [{
            type: 'pie',
            data: seriesData.map((item, index) => ({
              name: item.name,
              value: item.value,
              itemStyle: {
                color: colors[index % colors.length]
              }
            })),
            radius: ['40%', '70%'],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            labelLine: {
              show: true,
              length: 15,
              length2: 10
            },
            label: {
              show: true,
              formatter: '{b}: {d}%',
              fontSize: 11,
              fontWeight: 'bold'
            }
          }],
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: {
              color: '#fff'
            }
          },
          grid: {
            left: '15%',
            right: '10%',
            bottom: '20%',
            top: '20%',
            containLabel: true
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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const pinChart = (conversationId, chartData, query, timestamp) => {
    const chartConfig = {
      id: conversationId,
      data: chartData,
      query: query,
      timestamp: timestamp,
      customization: chartCustomization[conversationId] || {
        xAxis: 0,
        yAxis: 1,
        chartType: 'bar'
      },
      chartOptions: generateChartOptions(
        chartData,
        chartCustomization[conversationId]?.chartType || 'bar',
        chartCustomization[conversationId]?.xAxis,
        chartCustomization[conversationId]?.yAxis,
        conversationId
      )
    };

    setPinnedCharts(prev => {
      const exists = prev.find(chart => chart.id === conversationId);
      if (exists) {
        // Update existing pinned chart
        showNotification('📌 Chart updated in dashboard!', 'success');
        return prev.map(chart => 
          chart.id === conversationId ? chartConfig : chart
        );
      } else {
        // Add new pinned chart
        showNotification('📌 Chart pinned to dashboard!', 'success');
        return [...prev, chartConfig];
      }
    });
  };

  const unpinChart = (conversationId) => {
    setPinnedCharts(prev => prev.filter(chart => chart.id !== conversationId));
    showNotification('📌 Chart unpinned from dashboard', 'info');
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const isChartPinned = (conversationId) => {
    return pinnedCharts.some(chart => chart.id === conversationId);
  };

  const downloadDashboard = async () => {
    if (pinnedCharts.length === 0) {
      showNotification('No charts pinned to download!', 'info');
      return;
    }

    setIsGeneratingPDF(true);
    showNotification('📄 Optimizing charts and generating high-quality PDF...', 'info');

    try {
      // Give charts time to fully render before capture
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if all required chart instances are available
      const missingCharts = pinnedCharts.filter(chart => !chartInstances.current[chart.id]);
      if (missingCharts.length > 0) {
        showNotification(`⏳ Waiting for ${missingCharts.length} charts to load... Please try again in a moment.`, 'info');
        setIsGeneratingPDF(false);
        return;
      }
      
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Define grid layout - 2 charts per row, 2 rows per page (4 charts per page)
      const chartsPerRow = 2;
      const rowsPerPage = 2;
      const chartsPerPage = chartsPerRow * rowsPerPage;
      
      const margin = 10;
      const headerHeight = 45;
      const footerHeight = 15;
      const availableWidth = pageWidth - (2 * margin);
      const availableHeight = pageHeight - headerHeight - footerHeight - 20;
      
      const chartWidth = (availableWidth - margin) / chartsPerRow; // Space between charts
      const chartHeight = (availableHeight - margin) / rowsPerPage; // Space between rows
      
      const imgWidth = chartWidth - 5; // Slightly smaller for padding
      const imgHeight = chartHeight * 0.7; // 70% for image, 30% for text
      
      // Add header function
      const addHeader = () => {
        pdf.setFillColor(102, 126, 234);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.text('📊 Analytics Dashboard', pageWidth / 2, 20, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();
        pdf.text(`Generated on ${currentDate} at ${currentTime}`, pageWidth / 2, 32, { align: 'center' });
        
        pdf.setFontSize(8);
        pdf.text(`Total Charts: ${pinnedCharts.length}`, pageWidth / 2, 40, { align: 'center' });
      };
      
      // Add footer function
      const addFooter = (pageNum, totalPages) => {
        const footerY = pageHeight - 10;
        pdf.setFillColor(44, 62, 80);
        pdf.rect(0, footerY - 5, pageWidth, 15, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Data Analytics Platform - Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
      };

      // Calculate total pages needed
      const totalPages = Math.ceil(pinnedCharts.length / chartsPerPage);
      
      // Process charts in groups of 4 (2x2 grid)
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        addHeader();
        
        const startChartIndex = pageIndex * chartsPerPage;
        const endChartIndex = Math.min(startChartIndex + chartsPerPage, pinnedCharts.length);
        const chartsOnThisPage = pinnedCharts.slice(startChartIndex, endChartIndex);
        
        // Process charts in 2x2 grid
        for (let i = 0; i < chartsOnThisPage.length; i++) {
          const chart = chartsOnThisPage[i];
          const row = Math.floor(i / chartsPerRow);
          const col = i % chartsPerRow;
          
          // Calculate position
          const x = margin + (col * chartWidth);
          const y = headerHeight + 10 + (row * chartHeight);
          
          // Add chart title
          pdf.setTextColor(44, 62, 80);
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'bold');
          const chartTitle = `Chart ${startChartIndex + i + 1}: ${chart.data[0]?.[chart.customization.yAxis] || 'Data'}`;
          pdf.text(chartTitle, x, y, { maxWidth: chartWidth - 5 });
          
          // Add query text (smaller and wrapped)
          pdf.setFontSize(8);
          pdf.setFont(undefined, 'italic');
          pdf.setTextColor(108, 117, 125);
          const wrappedQuery = pdf.splitTextToSize(`"${chart.query}"`, chartWidth - 5);
          const queryHeight = Math.min(wrappedQuery.length * 3, 12); // Limit query text height
          pdf.text(wrappedQuery.slice(0, 4), x, y + 8); // Max 4 lines
          
          // Capture and add chart image
          const chartInstance = chartInstances.current[chart.id];
          if (chartInstance) {
            try {
              // Wait for chart to fully render
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Temporarily resize chart for better PDF capture
              const originalSize = chartInstance.getWidth ? {
                width: chartInstance.getWidth(),
                height: chartInstance.getHeight()
              } : null;
              
              // Set optimal size for PDF capture (higher resolution)
              const pdfCaptureWidth = 1000;
              const pdfCaptureHeight = 750;
              
              if (chartInstance.resize) {
                chartInstance.resize({
                  width: pdfCaptureWidth,
                  height: pdfCaptureHeight
                });
                
                // Wait longer for resize to complete and chart to re-render
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              // Use ECharts' built-in image export with optimized settings
              const imgData = chartInstance.getDataURL({
                type: 'png',
                pixelRatio: 2, // Good balance of quality and file size
                backgroundColor: '#ffffff',
                excludeComponents: ['toolbox', 'dataZoom'], // Remove unnecessary components
                width: pdfCaptureWidth,
                height: pdfCaptureHeight
              });
              
              // Restore original size if we resized
              if (originalSize && chartInstance.resize) {
                chartInstance.resize(originalSize);
              }
              
              console.log(`✅ Successfully captured chart ${startChartIndex + i + 1} at ${pdfCaptureWidth}x${pdfCaptureHeight}`);
              
              // Add image to PDF
              const imageY = y + queryHeight + 15;
              pdf.addImage(imgData, 'PNG', x, imageY, imgWidth, imgHeight);
              
              // Add chart details below image
              pdf.setFontSize(7);
              pdf.setFont(undefined, 'normal');
              pdf.setTextColor(102, 126, 234);
              const chartDetails = `${chart.data[0]?.[chart.customization.yAxis]} vs ${chart.data[0]?.[chart.customization.xAxis]} (${chart.customization.chartType.charAt(0).toUpperCase() + chart.customization.chartType.slice(1)})`;
              const wrappedDetails = pdf.splitTextToSize(chartDetails, chartWidth - 5);
              pdf.text(wrappedDetails[0], x, imageY + imgHeight + 5);
              
            } catch (error) {
              console.error('Error capturing chart:', error);
              // Add error placeholder with better styling
              pdf.setFillColor(248, 249, 250);
              pdf.rect(x, y + queryHeight + 15, imgWidth, imgHeight, 'F');
              pdf.setDrawColor(220, 221, 225);
              pdf.rect(x, y + queryHeight + 15, imgWidth, imgHeight, 'S');
              
              pdf.setFontSize(10);
              pdf.setTextColor(220, 53, 69);
              pdf.text('❌ Chart could not be captured', x + 5, y + queryHeight + 30);
              pdf.setFontSize(8);
              pdf.setTextColor(108, 117, 125);
              pdf.text('Please try regenerating the PDF', x + 5, y + queryHeight + 40);
            }
          } else {
            // Add placeholder for missing chart instance
            pdf.setFillColor(248, 249, 250);
            pdf.rect(x, y + queryHeight + 15, imgWidth, imgHeight, 'F');
            pdf.setDrawColor(220, 221, 225);
            pdf.rect(x, y + queryHeight + 15, imgWidth, imgHeight, 'S');
            
            pdf.setFontSize(10);
            pdf.setTextColor(108, 117, 125);
            pdf.text('📊 Chart preview loading...', x + 5, y + queryHeight + 30);
            pdf.setFontSize(8);
            pdf.text('Try downloading again in a moment', x + 5, y + queryHeight + 40);
          }
        }
        
        addFooter(pageIndex + 1, totalPages);
      }
      
      // Save the PDF
      const fileName = `analytics-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log(`📄 PDF generated successfully: ${fileName}`);
      showNotification(`✅ Dashboard PDF downloaded! (${pinnedCharts.length} charts across ${totalPages} pages)`, 'success');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (error.message?.includes('getDataURL')) {
        showNotification('❌ Error capturing chart images. Please ensure all charts are fully loaded and try again.', 'info');
      } else {
        showNotification('❌ Error generating PDF. Please try again in a moment.', 'info');
      }
    } finally {
      setIsGeneratingPDF(false);
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
        <Navbar 
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          isConnectedToDatabase={isConnectedToDatabase}
        />

        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="text-xs opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
                    Welcome to Data Analytics, {user?.firstName || user?.name || 'User'}!
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
                {/* Header with Dashboard Controls */}
                <div className="sticky top-0 bg-gradient-to-br from-gray-50 to-gray-100 p-4 border-b border-gray-200 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-xl font-bold text-gray-800">Query History</h2>
                      {pinnedCharts.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
                            📌 {pinnedCharts.length} Pinned
                          </span>
                          <button
                            onClick={() => setShowDashboard(!showDashboard)}
                            className="flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          >
                            {showDashboard ? '📊 Hide Dashboard' : '📊 View Dashboard'}
                          </button>
                          <button
                            onClick={downloadDashboard}
                            disabled={isGeneratingPDF}
                            className={`flex items-center px-3 py-1.5 rounded-lg transition-colors text-sm ${
                              isGeneratingPDF 
                                ? 'bg-gray-400 text-white cursor-not-allowed' 
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isGeneratingPDF ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2"></div>
                                Generating PDF...
                              </>
                            ) : (
                              <>
                                💾 Download Dashboard
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setConversationHistory([]);
                        setChartCustomization({});
                        setPinnedCharts([]);
                        setShowDashboard(false);
                        chartInstances.current = {}; // Clear chart instances
                      }}
                      className="flex items-center px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-6" style={{maxWidth: '900px', margin: '0 auto'}}>
                  
                  {/* Dashboard View */}
                  {showDashboard && (
                    pinnedCharts.length > 0 ? (
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-2xl font-bold text-purple-800 mb-2">📊 Dashboard Preview</h3>
                            <p className="text-purple-600">Your pinned charts organized in a dashboard layout</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                              {pinnedCharts.length} Charts
                            </span>
                            <button
                              onClick={() => setPinnedCharts([])}
                              className="flex items-center px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              🗑️ Clear Pins
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {pinnedCharts.map((pinnedChart, index) => (
                            <div key={pinnedChart.id} className="bg-white rounded-lg shadow-md p-4 border border-purple-100">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800">Chart {index + 1}</h4>
                                <button
                                  onClick={() => unpinChart(pinnedChart.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  ✕ Unpin
                                </button>
                              </div>
                              <div className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded italic">
                                "{pinnedChart.query}"
                              </div>
                              <div className="text-xs text-purple-600 mb-3">
                                📊 {pinnedChart.data[0]?.[pinnedChart.customization.yAxis]} vs {pinnedChart.data[0]?.[pinnedChart.customization.xAxis]} 
                                ({pinnedChart.customization.chartType.charAt(0).toUpperCase() + pinnedChart.customization.chartType.slice(1)})
                              </div>
                              <div 
                                className="h-64 overflow-auto rounded-lg bg-white border custom-scrollbar"
                                style={{
                                  scrollbarWidth: 'thin', 
                                  scrollbarColor: '#6B7280 #F3F4F6'
                                }}
                              >
                                <div ref={el => chartRefs.current[pinnedChart.id] = el}>
                                  <ReactECharts
                                    option={pinnedChart.chartOptions}
                                    style={{ height: '100%', width: '100%', minWidth: '300px', minHeight: '240px' }}
                                    onChartReady={(chart) => {
                                      chartInstances.current[pinnedChart.id] = chart;
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="text-blue-700">
                              <p className="font-medium">💡 Dashboard Ready!</p>
                              <p className="text-sm">Click "Generate Report" to download an optimized PDF with full-size charts and clear axis labels.</p>
                            </div>
                            <button
                              onClick={downloadDashboard}
                              disabled={isGeneratingPDF}
                              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                                isGeneratingPDF 
                                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isGeneratingPDF ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  📄 Generate Report
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300 text-center">
                        <div className="text-6xl mb-4">📌</div>
                        <h3 className="text-xl font-bold text-gray-600 mb-2">No Charts Pinned Yet</h3>
                        <p className="text-gray-500 mb-4">Pin charts from your query results to build a dashboard!</p>
                        <div className="text-sm text-gray-400">
                          1. Generate some charts from your queries<br/>
                          2. Click the "📌 Pin Chart" button on charts you like<br/>
                          3. Come back here to see your dashboard
                        </div>
                      </div>
                    )
                  )}
                  
                  {conversationHistory.map((conversation, index) => (
                    <div key={conversation.id} className="bg-white rounded-xl shadow-lg p-6 max-w-full">
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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-md font-medium text-gray-700">Results</h4>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                                📊 {conversation.data[0]?.length || 0} columns • {conversation.data?.length - 1 || 0} rows
                              </span>
                              <button
                                onClick={() => handleDownload(conversation.data, conversation.query)}
                                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mb-3 flex items-center">
                            <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-200">
                              💡 Use scrollbars to view all data • Fixed 800px width × 400px height
                            </span>
                          </div>

                          {/* Table - Fixed Size Container */}
                          <div className="rounded-lg border border-gray-200 bg-white">
                            <div 
                              className="overflow-auto custom-scrollbar" 
                              style={{
                                width: '100%',
                                maxWidth: '800px',
                                height: '400px',
                                scrollbarWidth: 'thin', 
                                scrollbarColor: '#6B7280 #F3F4F6'
                              }}
                            >
                              <table className="w-full min-w-max">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                                      #
                                    </th>
                                    {conversation.data[0]?.map((header, headerIndex) => (
                                      <th
                                        key={headerIndex}
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 last:border-r-0"
                                      >
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {conversation.data?.slice(1).map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap border-r border-gray-100 font-medium">
                                        {rowIndex + 1}
                                      </td>
                                      {row.map((cell, cellIndex) => (
                                        <td
                                          key={cellIndex}
                                          className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap border-r border-gray-100 last:border-r-0"
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 text-center text-sm text-gray-600 border-t flex items-center justify-between">
                              <span>📋 {conversation.data.length - 1} rows total</span>
                              <span>🔄 Scroll ↕️ ↔️ to navigate</span>
                            </div>
                          </div>

                          {/* Chart - Fixed Size Container */}
                          <div className="bg-gray-50 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-md font-medium text-gray-700">Data Visualization</h4>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500 bg-purple-50 px-2 py-1 rounded-full">
                                  📈 {(chartCustomization[conversation.id]?.chartType || conversation.chartType || 'bar').charAt(0).toUpperCase() + (chartCustomization[conversation.id]?.chartType || conversation.chartType || 'bar').slice(1)} Chart
                                </span>
                                <button
                                  onClick={() => {
                                    if (isChartPinned(conversation.id)) {
                                      unpinChart(conversation.id);
                                    } else {
                                      pinChart(conversation.id, conversation.data, conversation.query, conversation.timestamp);
                                    }
                                  }}
                                  className={`flex items-center px-3 py-1.5 rounded-lg transition-colors text-sm ${
                                    isChartPinned(conversation.id)
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {isChartPinned(conversation.id) ? '📌 Pinned' : '📌 Pin Chart'}
                                </button>
                              </div>
                            </div>
                            
                            {/* Chart Customization Controls */}
                            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* X-Axis Selection */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    📊 X-Axis Column
                                  </label>
                                  <select
                                    value={chartCustomization[conversation.id]?.xAxis ?? 0}
                                    onChange={(e) => {
                                      setChartCustomization(prev => ({
                                        ...prev,
                                        [conversation.id]: {
                                          ...prev[conversation.id],
                                          xAxis: parseInt(e.target.value)
                                        }
                                      }));
                                      // Update pinned chart if it exists
                                      if (isChartPinned(conversation.id)) {
                                        setTimeout(() => {
                                          pinChart(conversation.id, conversation.data, conversation.query, conversation.timestamp);
                                        }, 100);
                                      }
                                    }}
                                    className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {conversation.data[0]?.map((header, index) => {
                                      // Check if column contains numeric data
                                      const isNumeric = conversation.data.slice(1, 6).some(row => 
                                        !isNaN(parseFloat(row[index])) && isFinite(row[index])
                                      );
                                      return (
                                        <option key={index} value={index}>
                                          {header} {isNumeric ? '📊' : '📝'}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <div className="text-xs text-gray-500 mt-1">
                                    📊 = Numeric • 📝 = Text
                                  </div>
                                </div>

                                {/* Y-Axis Selection */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    📈 Y-Axis Column
                                  </label>
                                  <select
                                    value={chartCustomization[conversation.id]?.yAxis ?? 1}
                                    onChange={(e) => {
                                      setChartCustomization(prev => ({
                                        ...prev,
                                        [conversation.id]: {
                                          ...prev[conversation.id],
                                          yAxis: parseInt(e.target.value)
                                        }
                                      }));
                                      // Update pinned chart if it exists
                                      if (isChartPinned(conversation.id)) {
                                        setTimeout(() => {
                                          pinChart(conversation.id, conversation.data, conversation.query, conversation.timestamp);
                                        }, 100);
                                      }
                                    }}
                                    className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {conversation.data[0]?.map((header, index) => {
                                      // Check if column contains numeric data
                                      const isNumeric = conversation.data.slice(1, 6).some(row => 
                                        !isNaN(parseFloat(row[index])) && isFinite(row[index])
                                      );
                                      return (
                                        <option key={index} value={index}>
                                          {header} {isNumeric ? '📊' : '📝'}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <div className="text-xs text-gray-500 mt-1">
                                    📊 = Numeric • 📝 = Text
                                  </div>
                                </div>

                                {/* Chart Type Selection */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    🎨 Chart Type
                                  </label>
                                  <select
                                    value={chartCustomization[conversation.id]?.chartType || conversation.chartType || 'bar'}
                                    onChange={(e) => {
                                      setChartCustomization(prev => ({
                                        ...prev,
                                        [conversation.id]: {
                                          ...prev[conversation.id],
                                          chartType: e.target.value
                                        }
                                      }));
                                      // Update pinned chart if it exists
                                      if (isChartPinned(conversation.id)) {
                                        setTimeout(() => {
                                          pinChart(conversation.id, conversation.data, conversation.query, conversation.timestamp);
                                        }, 100);
                                      }
                                    }}
                                    className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {chartTypes.map((chart) => (
                                      <option key={chart.type} value={chart.type}>
                                        {chart.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              {/* Reset and Color Palette */}
                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setChartCustomization(prev => ({
                                        ...prev,
                                        [conversation.id]: {
                                          xAxis: 0,
                                          yAxis: 1,
                                          chartType: 'bar'
                                        }
                                      }));
                                      // Update pinned chart if it exists
                                      if (isChartPinned(conversation.id)) {
                                        setTimeout(() => {
                                          pinChart(conversation.id, conversation.data, conversation.query, conversation.timestamp);
                                        }, 100);
                                      }
                                    }}
                                    className="text-xs px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                  >
                                    🔄 Reset
                                  </button>
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Current:</span> 
                                    {" " + conversation.data[0]?.[chartCustomization[conversation.id]?.yAxis ?? 1]} vs {conversation.data[0]?.[chartCustomization[conversation.id]?.xAxis ?? 0]}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-gray-500">Colors:</span>
                                  <div className="flex space-x-1">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-teal-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-500 mb-3">
                              <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-200">
                                📐 Fixed 800px × 400px container • Scroll to explore chart • Customize above
                              </span>
                            </div>
                            <div 
                              className="overflow-auto rounded-lg bg-white p-2 custom-scrollbar border-2 border-dashed border-gray-300" 
                              style={{
                                width: '100%',
                                maxWidth: '800px',
                                height: '400px',
                                scrollbarWidth: 'thin', 
                                scrollbarColor: '#6B7280 #F3F4F6'
                              }}
                            >
                              <ReactECharts
                                option={generateChartOptions(
                                  conversation.data, 
                                  chartCustomization[conversation.id]?.chartType || conversation.chartType || 'bar',
                                  chartCustomization[conversation.id]?.xAxis,
                                  chartCustomization[conversation.id]?.yAxis,
                                  conversation.id
                                )}
                                style={{ height: '100%', width: '100%', minWidth: '600px', minHeight: '360px' }}
                                onChartReady={(chart) => {
                                  chartInstances.current[conversation.id] = chart;
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  
                  {/* Loading indicator for new query */}
                  {isLoading && (
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-full">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          Query #{conversationHistory.length}
                        </h3>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                          <p className="text-gray-700 italic">Processing...</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white" style={{maxWidth: '800px', height: '500px'}}>
                        <div className="flex items-center justify-center h-full">
                          <Skeleton />
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
    </>
  );
};

export default ChatPage; 