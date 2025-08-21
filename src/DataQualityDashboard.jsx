import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { AlertTriangle, Database, CheckCircle, XCircle, TrendingUp, TrendingDown, Info, RefreshCw, Upload, Search, Filter, Download, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import Papa from 'papaparse';

const DataQualityDashboard = () => {
  const [data, setData] = useState({
    newOldDelete: [],
    columnNameMismatch: [],
    columnDtype: []
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerms, setSearchTerms] = useState({
    newOldDelete: '',
    columnNameMismatch: '',
    columnDtype: ''
  });
  const [filters, setFilters] = useState({
    newOldDelete: { schema: 'all', hasNewColumns: 'all', hasDeletedColumns: 'all' },
    columnNameMismatch: { schema: 'all', mismatchRange: 'all' },
    columnDtype: { schema: 'all', mismatchRange: 'all' }
  });
  const [sortConfig, setSortConfig] = useState({
    newOldDelete: { key: null, direction: 'asc' },
    columnNameMismatch: { key: null, direction: 'asc' },
    columnDtype: { key: null, direction: 'asc' }
  });
  const [visibleSections, setVisibleSections] = useState({
    charts: true,
    tables: true
  });
  const [selectedRow, setSelectedRow] = useState(null);
  const [uploadStates, setUploadStates] = useState({
    newOldDelete: false,
    columnNameMismatch: false,
    columnDtype: false
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadData();
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const newData = { ...data };
      
      try {
        const newOldDeleteContent = await window.fs.readFile('new_old_delete.csv', { encoding: 'utf8' });
        const newOldDeleteData = Papa.parse(newOldDeleteContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        newData.newOldDelete = newOldDeleteData.data;
      } catch (e) {
        console.log('new_old_delete.csv not found, keeping existing data');
      }

      try {
        const columnNameMismatchContent = await window.fs.readFile('column_name_mismatch.csv', { encoding: 'utf8' });
        const columnNameMismatchData = Papa.parse(columnNameMismatchContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        newData.columnNameMismatch = columnNameMismatchData.data;
      } catch (e) {
        console.log('column_name_mismatch.csv not found, keeping existing data');
      }

      try {
        const columnDtypeContent = await window.fs.readFile('column_dtype.csv', { encoding: 'utf8' });
        const columnDtypeData = Papa.parse(columnDtypeContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        newData.columnDtype = columnDtypeData.data;
      } catch (e) {
        console.log('column_dtype.csv not found, keeping existing data');
      }

      setData(newData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleFileUpload = useCallback((file, dataType) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const parsed = Papa.parse(csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });
      
      setData(prev => ({
        ...prev,
        [dataType]: parsed.data
      }));
      
      setUploadStates(prev => ({
        ...prev,
        [dataType]: true
      }));
      
      setLastUpdated(new Date());
    };
    reader.readAsText(file);
  }, []);

  const handleSort = (dataType, key) => {
    setSortConfig(prev => ({
      ...prev,
      [dataType]: {
        key,
        direction: prev[dataType].key === key && prev[dataType].direction === 'asc' ? 'desc' : 'asc'
      }
    }));
  };

  const getFilteredAndSortedData = (dataType) => {
    let filtered = data[dataType];
    const search = searchTerms[dataType].toLowerCase();
    const filter = filters[dataType];
    const sort = sortConfig[dataType];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          value && value.toString().toLowerCase().includes(search)
        )
      );
    }

    // Apply specific filters
    if (dataType === 'newOldDelete') {
      if (filter.schema !== 'all') {
        filtered = filtered.filter(row => row.schema_name === filter.schema);
      }
      if (filter.hasNewColumns !== 'all') {
        const hasNew = filter.hasNewColumns === 'true';
        filtered = filtered.filter(row => (row.new_columns_count > 0) === hasNew);
      }
      if (filter.hasDeletedColumns !== 'all') {
        const hasDeleted = filter.hasDeletedColumns === 'true';
        filtered = filtered.filter(row => (row.deleted_columns_count > 0) === hasDeleted);
      }
    } else if (dataType === 'columnNameMismatch') {
      if (filter.schema !== 'all') {
        filtered = filtered.filter(row => row.schema_name === filter.schema);
      }
      if (filter.mismatchRange !== 'all') {
        const percent = parseFloat(filter.mismatchRange);
        filtered = filtered.filter(row => {
          const rowPercent = row.percent_column_name_mismatch || 0;
          if (percent === 0) return rowPercent === 0;
          if (percent === 25) return rowPercent > 0 && rowPercent <= 25;
          if (percent === 50) return rowPercent > 25 && rowPercent <= 50;
          if (percent === 75) return rowPercent > 50 && rowPercent <= 75;
          if (percent === 100) return rowPercent > 75;
          return true;
        });
      }
    } else if (dataType === 'columnDtype') {
      if (filter.schema !== 'all') {
        filtered = filtered.filter(row => row.schema_name === filter.schema);
      }
      if (filter.mismatchRange !== 'all') {
        const percent = parseFloat(filter.mismatchRange);
        filtered = filtered.filter(row => {
          const rowPercent = row.percent_column_mismatch || 0;
          if (percent === 0) return rowPercent === 0;
          if (percent === 25) return rowPercent > 0 && rowPercent <= 25;
          if (percent === 50) return rowPercent > 25 && rowPercent <= 50;
          if (percent === 75) return rowPercent > 50 && rowPercent <= 75;
          if (percent === 100) return rowPercent > 75;
          return true;
        });
      }
    }

    // Apply sorting
    if (sort.key) {
      filtered.sort((a, b) => {
        const aVal = a[sort.key] || 0;
        const bVal = b[sort.key] || 0;
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const getUniqueSchemas = (dataType) => {
    return [...new Set(data[dataType].map(row => row.schema_name))].filter(Boolean);
  };

  // Data processing functions (keeping the original ones)
  const processNewOldDeleteData = () => {
    if (!data.newOldDelete.length) return { chartData: [], stats: {} };
    
    const stats = {
      totalTables: data.newOldDelete.length,
      tablesWithNewColumns: data.newOldDelete.filter(row => (row.new_columns_count || 0) > 0).length,
      tablesWithDeletedColumns: data.newOldDelete.filter(row => (row.deleted_columns_count || 0) > 0).length,
      totalNewColumns: data.newOldDelete.reduce((sum, row) => sum + (row.new_columns_count || 0), 0),
      totalDeletedColumns: data.newOldDelete.reduce((sum, row) => sum + (row.deleted_columns_count || 0), 0)
    };

    const schemaStats = data.newOldDelete.reduce((acc, row) => {
      const schema = row.schema_name || 'Unknown';
      if (!acc[schema]) {
        acc[schema] = { schema: schema, newColumns: 0, deletedColumns: 0, tables: 0 };
      }
      acc[schema].newColumns += row.new_columns_count || 0;
      acc[schema].deletedColumns += row.deleted_columns_count || 0;
      acc[schema].tables += 1;
      return acc;
    }, {});

    return {
      chartData: Object.values(schemaStats),
      stats
    };
  };

  const processColumnNameMismatchData = () => {
    if (!data.columnNameMismatch.length) return { chartData: [], stats: {} };
    
    const stats = {
      totalTables: data.columnNameMismatch.length,
      tablesWithMismatches: data.columnNameMismatch.filter(row => (row.column_name_mismatch_count || 0) > 0).length,
      totalMismatches: data.columnNameMismatch.reduce((sum, row) => sum + (row.column_name_mismatch_count || 0), 0),
      avgMismatchPercent: data.columnNameMismatch.reduce((sum, row) => sum + (row.percent_column_name_mismatch || 0), 0) / data.columnNameMismatch.length
    };

    const mismatchDistribution = data.columnNameMismatch.reduce((acc, row) => {
      const percent = row.percent_column_name_mismatch || 0;
      let bucket;
      if (percent === 0) bucket = '0%';
      else if (percent <= 25) bucket = '1-25%';
      else if (percent <= 50) bucket = '26-50%';
      else if (percent <= 75) bucket = '51-75%';
      else bucket = '76-100%';
      
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(mismatchDistribution).map(([range, count]) => ({
      range,
      count,
      percentage: ((count / data.columnNameMismatch.length) * 100).toFixed(1)
    }));

    return { chartData, stats };
  };

  const processColumnDtypeData = () => {
    if (!data.columnDtype.length) return { chartData: [], stats: {} };
    
    const stats = {
      totalTables: data.columnDtype.length,
      tablesWithMismatches: data.columnDtype.filter(row => (row.column_dtype_mismatch_count || 0) > 0).length,
      totalMismatches: data.columnDtype.reduce((sum, row) => sum + (row.column_dtype_mismatch_count || 0), 0),
      avgMismatchPercent: data.columnDtype.reduce((sum, row) => sum + (row.percent_column_mismatch || 0), 0) / data.columnDtype.length
    };

    const schemaStats = data.columnDtype.reduce((acc, row) => {
      const schema = row.schema_name || 'Unknown';
      if (!acc[schema]) {
        acc[schema] = { 
          schema: schema, 
          totalMismatches: 0, 
          tables: 0, 
          avgMismatchPercent: 0 
        };
      }
      acc[schema].totalMismatches += row.column_dtype_mismatch_count || 0;
      acc[schema].tables += 1;
      acc[schema].avgMismatchPercent += row.percent_column_mismatch || 0;
      return acc;
    }, {});

    Object.values(schemaStats).forEach(schema => {
      schema.avgMismatchPercent = (schema.avgMismatchPercent / schema.tables).toFixed(1);
    });

    return {
      chartData: Object.values(schemaStats),
      stats
    };
  };

  const FileUploadSection = ({ title, dataType, description, icon: Icon }) => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
      <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) handleFileUpload(file, dataType);
        }}
        className="hidden"
        id={`upload-${dataType}`}
      />
      <label
        htmlFor={`upload-${dataType}`}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload CSV
      </label>
      {uploadStates[dataType] && (
        <div className="mt-2 text-green-600 text-sm flex items-center justify-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          File uploaded successfully
        </div>
      )}
    </div>
  );

  const DataTable = ({ dataType, title, columns }) => {
    const filteredData = getFilteredAndSortedData(dataType);
    const schemas = getUniqueSchemas(dataType);

    return (
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setVisibleSections(prev => ({...prev, [`table-${dataType}`]: !prev[`table-${dataType}`]}))}
                className="text-gray-500 hover:text-gray-700"
              >
                {visibleSections[`table-${dataType}`] !== false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerms[dataType]}
                onChange={(e) => setSearchTerms(prev => ({...prev, [dataType]: e.target.value}))}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filters[dataType].schema}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                [dataType]: {...prev[dataType], schema: e.target.value}
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Schemas</option>
              {schemas.map(schema => (
                <option key={schema} value={schema}>{schema}</option>
              ))}
            </select>

            {dataType === 'newOldDelete' && (
              <>
                <select
                  value={filters[dataType].hasNewColumns}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    [dataType]: {...prev[dataType], hasNewColumns: e.target.value}
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Tables</option>
                  <option value="true">Has New Columns</option>
                  <option value="false">No New Columns</option>
                </select>
                <select
                  value={filters[dataType].hasDeletedColumns}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    [dataType]: {...prev[dataType], hasDeletedColumns: e.target.value}
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Tables</option>
                  <option value="true">Has Deleted Columns</option>
                  <option value="false">No Deleted Columns</option>
                </select>
              </>
            )}

            {(dataType === 'columnNameMismatch' || dataType === 'columnDtype') && (
              <select
                value={filters[dataType].mismatchRange}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  [dataType]: {...prev[dataType], mismatchRange: e.target.value}
                }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Ranges</option>
                <option value="0">0% Mismatch</option>
                <option value="25">1-25% Mismatch</option>
                <option value="50">26-50% Mismatch</option>
                <option value="75">51-75% Mismatch</option>
                <option value="100">76-100% Mismatch</option>
              </select>
            )}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredData.length} of {data[dataType].length} records
          </div>
        </div>

        {visibleSections[`table-${dataType}`] !== false && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(dataType, col.key)}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        {col.label}
                        {sortConfig[dataType].key === col.key && (
                          sortConfig[dataType].direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4 ml-1" /> : 
                          <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedRow(selectedRow === `${dataType}-${index}` ? null : `${dataType}-${index}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {selectedRow === `${dataType}-${index}` ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading data quality metrics...</p>
        </div>
      </div>
    );
  }

  const newOldDeleteAnalysis = processNewOldDeleteData();
  const columnNameMismatchAnalysis = processColumnNameMismatchData();
  const columnDtypeAnalysis = processColumnDtypeData();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Database },
    { id: 'schema-changes', label: 'Schema Changes', icon: TrendingUp },
    { id: 'name-mismatches', label: 'Name Mismatches', icon: AlertTriangle },
    { id: 'type-mismatches', label: 'Type Mismatches', icon: XCircle },
    { id: 'upload', label: 'Upload Data', icon: Upload }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Quality Control Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor schema changes, column mismatches, and data type issues</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadData}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-lg font-medium text-gray-900">{lastUpdated.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload CSV Files</h2>
              <p className="text-gray-600">Upload your CSV files to update the dashboard data</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUploadSection
                title="Schema Changes"
                dataType="newOldDelete"
                description="Upload new_old_delete.csv to track column additions and deletions"
                icon={TrendingUp}
              />
              <FileUploadSection
                title="Column Name Mismatches"
                dataType="columnNameMismatch"
                description="Upload column_name_mismatch.csv to monitor naming inconsistencies"
                icon={AlertTriangle}
              />
              <FileUploadSection
                title="Data Type Mismatches"
                dataType="columnDtype"
                description="Upload column_dtype.csv to track data type issues"
                icon={XCircle}
              />
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Tables</p>
                    <p className="text-2xl font-bold text-gray-900">{data.newOldDelete.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">New Columns</p>
                    <p className="text-2xl font-bold text-gray-900">{newOldDeleteAnalysis.stats.totalNewColumns || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Name Mismatches</p>
                    <p className="text-2xl font-bold text-gray-900">{columnNameMismatchAnalysis.stats.totalMismatches || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Type Mismatches</p>
                    <p className="text-2xl font-bold text-gray-900">{columnDtypeAnalysis.stats.totalMismatches || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Charts Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Schema Changes by Schema</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={newOldDeleteAnalysis.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="schema" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newColumns" fill="#10b981" />
                    <Bar dataKey="deletedColumns" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Mismatch Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={columnNameMismatchAnalysis.chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="count"
                      label={({range}) => range}
                    >
                      {columnNameMismatchAnalysis.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Schema Changes Tab */}
        {activeTab === 'schema-changes' && (
          <>
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Schema Changes Analysis
                </h2>
                <p className="text-gray-600 mt-1">New and deleted columns by schema</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-800">Tables with New Columns</h3>
                    <p className="text-2xl font-bold text-green-600">{newOldDeleteAnalysis.stats.tablesWithNewColumns || 0}</p>
                    <p className="text-sm text-green-600">
                      {((newOldDeleteAnalysis.stats.tablesWithNewColumns || 0) / (newOldDeleteAnalysis.stats.totalTables || 1) * 100).toFixed(1)}% of total tables
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-medium text-red-800">Tables with Deleted Columns</h3>
                    <p className="text-2xl font-bold text-red-600">{newOldDeleteAnalysis.stats.tablesWithDeletedColumns || 0}</p>
                    <p className="text-sm text-red-600">
                      {((newOldDeleteAnalysis.stats.tablesWithDeletedColumns || 0) / (newOldDeleteAnalysis.stats.totalTables || 1) * 100).toFixed(1)}% of total tables
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800">Total Column Changes</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {(newOldDeleteAnalysis.stats.totalNewColumns || 0) + (newOldDeleteAnalysis.stats.totalDeletedColumns || 0)}
                    </p>
                    <p className="text-sm text-blue-600">
                      +{newOldDeleteAnalysis.stats.totalNewColumns || 0} / -{newOldDeleteAnalysis.stats.totalDeletedColumns || 0}
                    </p>
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={newOldDeleteAnalysis.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="schema" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="newColumns" fill="#10b981" name="New Columns" />
                    <Bar dataKey="deletedColumns" fill="#ef4444" name="Deleted Columns" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <DataTable
              dataType="newOldDelete"
              title="Schema Changes Details"
              columns={[
                { key: 'schema_name', label: 'Schema Name' },
                { key: 'table_name', label: 'Table Name' },
                { 
                  key: 'new_columns_count', 
                  label: 'New Columns',
                  render: (value) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {value || 0}
                    </span>
                  )
                },
                { key: 'new_columns_name', label: 'New Column Names' },
                { 
                  key: 'deleted_columns_count', 
                  label: 'Deleted Columns',
                  render: (value) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {value || 0}
                    </span>
                  )
                },
                { key: 'deleted_columns_name', label: 'Deleted Column Names' }
              ]}
            />
          </>
        )}

        {/* Column Name Mismatches Tab */}
        {activeTab === 'name-mismatches' && (
          <>
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Column Name Mismatch Analysis
                </h2>
                <p className="text-gray-600 mt-1">Distribution of column name mismatches across tables</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-medium text-orange-800">Tables with Mismatches</h3>
                    <p className="text-2xl font-bold text-orange-600">{columnNameMismatchAnalysis.stats.tablesWithMismatches || 0}</p>
                    <p className="text-sm text-orange-600">
                      {((columnNameMismatchAnalysis.stats.tablesWithMismatches || 0) / (columnNameMismatchAnalysis.stats.totalTables || 1) * 100).toFixed(1)}% of total tables
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium text-yellow-800">Average Mismatch %</h3>
                    <p className="text-2xl font-bold text-yellow-600">{(columnNameMismatchAnalysis.stats.avgMismatchPercent || 0).toFixed(1)}%</p>
                    <p className="text-sm text-yellow-600">Across all tables</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium text-purple-800">Total Mismatches</h3>
                    <p className="text-2xl font-bold text-purple-600">{columnNameMismatchAnalysis.stats.totalMismatches || 0}</p>
                    <p className="text-sm text-purple-600">Column name issues</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Mismatch Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={columnNameMismatchAnalysis.chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          label={({range, percentage}) => `${range} (${percentage}%)`}
                        >
                          {columnNameMismatchAnalysis.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Tables by Mismatch Range</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={columnNameMismatchAnalysis.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [value, 'Number of Tables']} />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <DataTable
              dataType="columnNameMismatch"
              title="Column Name Mismatch Details"
              columns={[
                { key: 'schema_name', label: 'Schema Name' },
                { key: 'table_name', label: 'Table Name' },
                { key: 'column_count', label: 'Total Columns' },
                { 
                  key: 'column_name_mismatch_count', 
                  label: 'Mismatch Count',
                  render: (value) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {value || 0}
                    </span>
                  )
                },
                { 
                  key: 'percent_column_name_mismatch', 
                  label: 'Mismatch %',
                  render: (value) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value > 50 ? 'bg-red-100 text-red-800' : 
                      value > 25 ? 'bg-orange-100 text-orange-800' : 
                      value > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {value ? `${value.toFixed(1)}%` : '0%'}
                    </span>
                  )
                },
                { key: 'mismatch_column_names', label: 'Mismatched Columns' },
                { key: 'mismatch_columns_current_name', label: 'Current Names' },
                { key: 'mismatch_columns_expected_name', label: 'Expected Names' }
              ]}
            />
          </>
        )}

        {/* Data Type Mismatches Tab */}
        {activeTab === 'type-mismatches' && (
          <>
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  Data Type Mismatch Analysis
                </h2>
                <p className="text-gray-600 mt-1">Column data type inconsistencies by schema</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-medium text-red-800">Tables with Type Issues</h3>
                    <p className="text-2xl font-bold text-red-600">{columnDtypeAnalysis.stats.tablesWithMismatches || 0}</p>
                    <p className="text-sm text-red-600">
                      {((columnDtypeAnalysis.stats.tablesWithMismatches || 0) / (columnDtypeAnalysis.stats.totalTables || 1) * 100).toFixed(1)}% of total tables
                    </p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <h3 className="font-medium text-pink-800">Average Type Mismatch %</h3>
                    <p className="text-2xl font-bold text-pink-600">{(columnDtypeAnalysis.stats.avgMismatchPercent || 0).toFixed(1)}%</p>
                    <p className="text-sm text-pink-600">Across all tables</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="font-medium text-indigo-800">Total Type Mismatches</h3>
                    <p className="text-2xl font-bold text-indigo-600">{columnDtypeAnalysis.stats.totalMismatches || 0}</p>
                    <p className="text-sm text-indigo-600">Data type issues</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Type Mismatches by Schema</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={columnDtypeAnalysis.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="schema" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalMismatches" fill="#dc2626" name="Total Mismatches" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <DataTable
              dataType="columnDtype"
              title="Data Type Mismatch Details"
              columns={[
                { key: 'schema_name', label: 'Schema Name' },
                { key: 'table_name', label: 'Table Name' },
                { key: 'column_count', label: 'Total Columns' },
                { 
                  key: 'column_dtype_mismatch_count', 
                  label: 'Type Mismatches',
                  render: (value) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {value || 0}
                    </span>
                  )
                },
                { 
                  key: 'percent_column_mismatch', 
                  label: 'Mismatch %',
                  render: (value) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value > 50 ? 'bg-red-100 text-red-800' : 
                      value > 25 ? 'bg-orange-100 text-orange-800' : 
                      value > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {value ? `${value.toFixed(1)}%` : '0%'}
                    </span>
                  )
                },
                { key: 'mismatch_columns', label: 'Mismatched Columns' },
                { key: 'mismatch_column_current_dtypes', label: 'Current Types' },
                { key: 'expected_column_dtypes', label: 'Expected Types' }
              ]}
            />
          </>
        )}

        {/* Row Details Modal */}
        {selectedRow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Row Details</h3>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-2">
                {selectedRow && (() => {
                  const [dataType, index] = selectedRow.split('-');
                  const rowData = getFilteredAndSortedData(dataType)[parseInt(index)];
                  return Object.entries(rowData).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b">
                      <div className="font-medium text-gray-700">{key.replace(/_/g, ' ').toUpperCase()}</div>
                      <div className="col-span-2 text-gray-900">{value || 'N/A'}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataQualityDashboard;
