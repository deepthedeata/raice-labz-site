import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  CalendarIcon, 
  LineChart as LineChartIcon, 
  BarChart3, 
  PieChart as PieChartIcon,
  Settings,
  Check,
  ChevronsUpDown,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// API base URL
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.143:5000';
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

// Type definitions
interface DateRange {
  from?: Date;
  to?: Date;
}

interface AnalyticsFilters {
  dateRange: DateRange;
  viewMode: 'machine-wise' | 'batch-wise' | 'individual' | 'tma-analysis';
  selectedMachine?: string;
  chartType: 'bar' | 'pie' | 'line';
  selectedCategories: string[];
}

interface AnalyticsData {
  date: string;
  modeId: string;
  modeType: string;
  machineName: string;
  sessionId: string;
  sessionStatus: string;
  totalGrains: number;
  // Good Rice metrics
  headRice: number;
  threeFourthHead: number;
  halfBrokens: number;
  quarterFineBrokens: number;
  tips: number;
  // Basmati region good rice categories
  secondOne?: number;
  tibar?: number;
  dubar?: number;
  miniDubar?: number;
  mongra?: number;
  miniMongra?: number;
  nakku?: number;
  goodRiceTotal: number;
  // Rejection metrics
  chalkyBellyCore: number;
  yellow: number;
  black: number;
  immatureGreen: number;
  peckyGrains: number;
  discolored: number;
  chalkyWhole: number;
  blackTips: number;
  burnt: number;
  spot: number;
  discoloration: number;
  rejectionsTotal: number;
  // Foreign Matter metrics
  red: number;
  husk: number;
  paddy: number;
  chaff: number;
  straw: number;
  sticks: number;
  brownRice: number;
  stones: number;
  mud: number;
  thread: number;
  plastic: number;
  metals: number;
  glass: number;
  foreignMatterTotal: number;
}

const Analytics = () => {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      from: new Date(2024, 0, 1), // January 1, 2024
      to: new Date(2024, 5, 30)   // June 30, 2024
    },
    viewMode: 'machine-wise',
    selectedMachine: undefined,
    chartType: 'bar',
    selectedCategories: ['accepted', 'rejected']
  });

  const [datePickerOpen, setDatePickerOpen] = useState({ from: false, to: false });
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData[]>([]);

  // Machine options - predefined list to maintain consistency
  const machineOptions = [
    { value: 'CLEAN - I', label: 'CLEAN - I' },
    { value: 'TRAY SEPARATOR', label: 'TRAY SEPARATOR' },
    { value: 'WHITENER 1', label: 'WHITENER 1' },
    { value: 'WHITENER 2', label: 'WHITENER 2' },
    { value: 'WHITENER 3', label: 'WHITENER 3' },
    { value: 'SILKY 1', label: 'SILKY 1' },
    { value: 'SILKY 2', label: 'SILKY 2' },
    { value: 'LENGTH GRADER', label: 'LENGTH GRADER' },
    { value: 'COLOUR SORTER', label: 'COLOUR SORTER' }
  ];

  // Category options - predefined list to maintain consistency
  const categoryOptions = [
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'brokens', label: 'Brokens' },
    { value: 'chalky', label: 'Chalky' },
    { value: 'moisture', label: 'Moisture' },
    { value: 'weight', label: 'Weight' },
    { value: 'variety', label: 'Variety' }
  ];

  // Colors for charts
  const pieColors = ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  // Function to convert date to UTC while preserving the intended day
  const dateToUTCString = (date: Date) => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return utcDate.toISOString();
  };

  // Fetch analytics data from API
  const fetchAnalyticsData = async () => {
    // Check if dates are valid
    if (!filters.dateRange.from || !filters.dateRange.to) {
      console.log('🔍 [FRONTEND DEBUG] Dates not ready yet:', { fromDate: filters.dateRange.from, toDate: filters.dateRange.to });
      setData([]);
      return;
    }

    // Validate that machine is selected for machine-wise mode
    if (filters.viewMode === 'machine-wise' && !filters.selectedMachine) {
      console.warn('⚠️ [FRONTEND DEBUG] Machine-wise mode requires a machine selection');
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        fromDate: dateToUTCString(filters.dateRange.from),
        toDate: dateToUTCString(filters.dateRange.to),
        viewMode: filters.viewMode,
        selectedMachine: filters.selectedMachine || undefined
      };
      
      console.log('🔍 [FRONTEND DEBUG] Sending request to backend:');
      console.log('   - fromDate (original):', filters.dateRange.from.toString());
      console.log('   - toDate (original):', filters.dateRange.to.toString());
      console.log('   - fromDate (UTC):', requestBody.fromDate);
      console.log('   - toDate (UTC):', requestBody.toDate);
      console.log('   - viewMode:', filters.viewMode);
      console.log('   - selectedMachine:', filters.selectedMachine);
      console.log('   - Date range covers:', `${filters.dateRange.from.getFullYear()}-${filters.dateRange.from.getMonth()+1}-${filters.dateRange.from.getDate()} to ${filters.dateRange.to.getFullYear()}-${filters.dateRange.to.getMonth()+1}-${filters.dateRange.to.getDate()}`);

      // Choose endpoint based on view mode
      const endpoint = filters.viewMode === 'tma-analysis' 
        ? `${API_BASE_URL}/api/raice_labz/analytics/tma-analysis`
        : `${API_BASE_URL}/api/raice_labz/analytics/grain-analysis`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('🔍 [FRONTEND DEBUG] Raw API response:', result);
        console.log('🔍 [FRONTEND DEBUG] Raw data from API:', result.data);
        console.log('🔍 [FRONTEND DEBUG] Number of data points:', result.data.length);
        
        // Sort data by date to ensure chronological order
        const sortedData = result.data.sort((a: AnalyticsData, b: AnalyticsData) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        console.log('🔍 [FRONTEND DEBUG] Sorted data dates:', sortedData.map((item: AnalyticsData) => item.date));
        
        setData(sortedData);
        
        toast.success(`Fetched ${result.count} records of data`);
      } else {
        throw new Error(result.message || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to fetch analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when date range or filters change
  useEffect(() => {
    fetchAnalyticsData();
  }, [filters.dateRange.from, filters.dateRange.to, filters.viewMode, filters.selectedMachine]);

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category]
    }));
  };

  const renderChart = () => {
    const { chartType, selectedCategories } = filters;

    if (chartType === 'pie') {
      console.log('🔍 [FRONTEND DEBUG] Pie chart data check:');
      console.log('   - data length:', data.length);
      console.log('   - selectedCategories:', selectedCategories);
      
      if (!data || data.length === 0) {
        console.log('⚠️ [FRONTEND DEBUG] No data available for pie chart');
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data available for pie chart</p>
            </div>
          </div>
        );
      }
      
      // For pie chart, aggregate all data points instead of just using the latest
      const pieData = selectedCategories.map((category, index) => {
        // Sum all values for this category across all data points
        const totalValue = data.reduce((sum, item) => {
          const value = item[category as keyof AnalyticsData] as number || 0;
          return sum + value;
        }, 0);
        
        console.log(`   - ${category}: ${totalValue} (sum of ${data.length} data points)`);
        return {
          name: categoryOptions.find(opt => opt.value === category)?.label || category,
          value: totalValue,
          fill: pieColors[index % pieColors.length]
        };
      });
      
      // For debugging, let's also show what happens if we don't filter zero values
      const pieDataWithZeros = pieData;
      const pieDataFiltered = pieData.filter(item => item.value > 0);
      
      console.log('   - pieDataWithZeros:', pieDataWithZeros);
      console.log('   - pieDataFiltered:', pieDataFiltered);
      
      // Use filtered data (original behavior)
      const finalPieData = pieDataFiltered;
      
      console.log('   - finalPieData:', finalPieData);
      
      if (finalPieData.length === 0) {
        console.log('⚠️ [FRONTEND DEBUG] All pie chart values are zero');
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data to display in pie chart</p>
              <p className="text-sm">All selected categories have zero values</p>
            </div>
          </div>
        );
      }

      console.log('🔍 [FRONTEND DEBUG] Rendering pie chart with data:', finalPieData);
      
      return (
        <PieChart width={400} height={300}>
          <Pie
            data={finalPieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {finalPieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {selectedCategories.map((category, index) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              stroke={pieColors[index % pieColors.length]}
              strokeWidth={3}
              dot={{ fill: pieColors[index % pieColors.length], strokeWidth: 2, r: 4 }}
              name={categoryOptions.find(opt => opt.value === category)?.label || category}
              animationDuration={1000}
            />
          ))}
        </LineChart>
      );
    }

    // Default: Bar chart
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        {selectedCategories.map((category, index) => (
          <Bar
            key={category}
            dataKey={category}
            fill={pieColors[index % pieColors.length]}
            name={categoryOptions.find(opt => opt.value === category)?.label || category}
            animationDuration={1000}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader 
        title="Analytics" 
        subtitle="Visual representation of rice quality data with advanced filtering"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Filters Section */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-rice-primary">
                <Settings className="w-5 h-5" />
                <span>Filters & Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                
                {/* Date Range Picker */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date From - To</Label>
                  <div className="space-y-2">
                    <Popover open={datePickerOpen.from} onOpenChange={(open) => setDatePickerOpen(prev => ({ ...prev, from: open }))}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange.from ? format(filters.dateRange.from, "MMM dd, yyyy") : "From date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.from}
                          onSelect={(date) => {
                            setFilters(prev => ({
                              ...prev,
                              dateRange: { ...prev.dateRange, from: date }
                            }));
                            setDatePickerOpen(prev => ({ ...prev, from: false }));
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover open={datePickerOpen.to} onOpenChange={(open) => setDatePickerOpen(prev => ({ ...prev, to: open }))}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dateRange.to && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange.to ? format(filters.dateRange.to, "MMM dd, yyyy") : "To date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.to}
                          onSelect={(date) => {
                            setFilters(prev => ({
                              ...prev,
                              dateRange: { ...prev.dateRange, to: date }
                            }));
                            setDatePickerOpen(prev => ({ ...prev, to: false }));
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* View Mode Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">View Mode</Label>
                  <RadioGroup
                    value={filters.viewMode}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      viewMode: value as 'machine-wise' | 'batch-wise' | 'individual' | 'tma-analysis',
                      selectedMachine: (value === 'batch-wise' || value === 'individual' || value === 'tma-analysis') ? undefined : prev.selectedMachine
                    }))}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="machine-wise" id="machine-wise" />
                      <Label htmlFor="machine-wise" className="text-sm cursor-pointer">Machine-wise</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="batch-wise" id="batch-wise" />
                      <Label htmlFor="batch-wise" className="text-sm cursor-pointer">Batch-wise</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="text-sm cursor-pointer">Individual</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tma-analysis" id="tma-analysis" />
                      <Label htmlFor="tma-analysis" className="text-sm cursor-pointer">TMA Analysis</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Machine Selector (Conditional) */}
                {(filters.viewMode === 'machine-wise' || filters.viewMode === 'tma-analysis') && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Select Machine
                      {filters.viewMode === 'machine-wise' && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Select
                      value={filters.selectedMachine}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, selectedMachine: value }))}
                    >
                      <SelectTrigger className={filters.viewMode === 'machine-wise' && !filters.selectedMachine ? 'border-red-500' : ''}>
                        <SelectValue placeholder={filters.viewMode === 'machine-wise' ? "Required: Choose machine..." : "Choose machine..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {machineOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Chart Type Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Chart Type</Label>
                  <ToggleGroup
                    type="single"
                    value={filters.chartType}
                    onValueChange={(value) => value && setFilters(prev => ({ ...prev, chartType: value as any }))}
                    className="grid grid-cols-3 w-full"
                  >
                    <ToggleGroupItem value="bar" aria-label="Bar Chart" className="flex flex-col items-center space-y-1 p-3">
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-xs">Bar</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pie" aria-label="Pie Chart" className="flex flex-col items-center space-y-1 p-3">
                      <PieChartIcon className="w-4 h-4" />
                      <span className="text-xs">Pie</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="line" aria-label="Line Chart" className="flex flex-col items-center space-y-1 p-3">
                      <LineChartIcon className="w-4 h-4" />
                      <span className="text-xs">Line</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Category Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Data for Chart</Label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        className="w-full justify-between"
                      >
                        {filters.selectedCategories.length > 0
                          ? `${filters.selectedCategories.length} selected`
                          : "Select categories..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search categories..." />
                        <CommandList>
                          <CommandEmpty>No categories found.</CommandEmpty>
                          <CommandGroup>
                            {categoryOptions.map((option) => (
                              <CommandItem
                                key={option.value}
                                value={option.value}
                                onSelect={() => handleCategoryToggle(option.value)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    filters.selectedCategories.includes(option.value)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filters.selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {filters.selectedCategories.map((category) => (
                        <span
                          key={category}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary text-primary-foreground"
                        >
                          {categoryOptions.find(opt => opt.value === category)?.label}
                          <button
                            onClick={() => handleCategoryToggle(category)}
                            className="ml-1 text-primary-foreground hover:text-primary-foreground/80"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Chart Display Area */}
          <Card className="animate-scale-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-rice-primary">
                  {filters.viewMode === 'machine-wise' 
                    ? `${machineOptions.find(m => m.value === filters.selectedMachine)?.label || 'Machine'} Analysis`
                    : filters.viewMode === 'batch-wise'
                      ? 'Batch Analysis'
                      : filters.viewMode === 'individual'
                        ? 'Individual Session Analysis'
                        : 'TMA Analysis'
                  } - {filters.chartType.charAt(0).toUpperCase() + filters.chartType.slice(1)} Chart
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Loading data...</span>
                    </div>
                  ) : !filters.dateRange.from || !filters.dateRange.to ? (
                    <div className="text-center">
                      <p>Please select a date range to view analytics</p>
                      <p className="text-sm text-gray-400 mt-2">Choose "From" and "To" dates above</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p>No data available for the selected date range</p>
                      <p className="text-sm">Please try a different date range or view mode</p>
                    </div>
                  )}
                </div>
              ) : filters.selectedCategories.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Please select at least one category to display the chart</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          {filters.selectedCategories.length > 0 && data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filters.selectedCategories.map((category, index) => {
                const values = data.map(d => d[category as keyof AnalyticsData] as number);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const max = Math.max(...values);
                const min = Math.min(...values);
                const categoryLabel = categoryOptions.find(opt => opt.value === category)?.label || category;

                return (
                  <Card key={category} className="animate-fade-in">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div 
                          className="w-4 h-4 rounded-full mx-auto mb-2"
                          style={{ backgroundColor: pieColors[index % pieColors.length] }}
                        />
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {categoryLabel}
                        </h3>
                        <div className="mt-4 space-y-2">
                          <div>
                            <span className="text-sm text-gray-600">Average</span>
                            <p className="text-xl font-bold" style={{ color: pieColors[index % pieColors.length] }}>
                              {avg.toFixed(1)}%
                            </p>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Min: {min.toFixed(1)}%</span>
                            <span>Max: {max.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;