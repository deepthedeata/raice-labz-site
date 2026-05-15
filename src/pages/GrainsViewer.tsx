import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FilterIcon, RefreshCwIcon, DownloadIcon, DatabaseIcon, FileTextIcon, ZoomInIcon } from 'lucide-react';

// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.0.143:5000';
const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

interface Document {
  _id: string;
  [key: string]: any;
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

interface FilterState {
  search: string;
  grainClass: string;
  tmaId: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface TmaIdOption {
  tmaId: string;
  machineName: string;
  status: string;
  createdAt: string;
}

interface GrainClassOption {
  _id: string;
  count: number;
}

interface QualityMetrics {
  goodRice: {
    total: number;
  };
  rejections: {
    total: number;
  };
  foreignMatter: {
    total: number;
  };
  totalGrains?: number;
}

interface ModeDetails {
  variety: string;
  process: string;
  date: string;
  sessionType: string;
}

interface WhitenessIndexData {
  grainClass: string;
  averageWhitenessIndex: number;
  count: number;
}

interface OverallWhitenessData {
  overallAverage: number;
  totalGrains: number;
}

interface ChalkinessData {
  averageChalkyArea: number;
  averageGrainArea: number;
  chalkinessPercentage: number;
  totalGrains: number;
}

const GrainsViewer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tmaIdOptions, setTmaIdOptions] = useState<TmaIdOption[]>([]);
  const [loadingTmaIds, setLoadingTmaIds] = useState(false);
  const [grainClassOptions, setGrainClassOptions] = useState<GrainClassOption[]>([]);
  const [loadingGrainClasses, setLoadingGrainClasses] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [loadingQualityMetrics, setLoadingQualityMetrics] = useState(false);
  const [modeDetails, setModeDetails] = useState<ModeDetails | null>(null);
  const [whitenessIndexData, setWhitenessIndexData] = useState<WhitenessIndexData[]>([]);
  const [overallWhitenessData, setOverallWhitenessData] = useState<OverallWhitenessData | null>(null);
  const [chalkinessData, setChalkinessData] = useState<ChalkinessData | null>(null);
  const [loadingModeDetails, setLoadingModeDetails] = useState(false);
  
  // Initialize filters from URL parameters
  const initializeFiltersFromURL = (): FilterState => {
    const tmaId = searchParams.get('tmaId') || 'all';
    const grainClass = searchParams.get('grainClass') || 'all';
    
    return {
      search: '',
      grainClass: grainClass,
      tmaId: tmaId,
      sortField: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 10
    };
  };
  
  const [filters, setFilters] = useState<FilterState>(initializeFiltersFromURL());

  // Handle URL parameter changes
  useEffect(() => {
    const newFilters = initializeFiltersFromURL();
    setFilters(newFilters);
  }, [searchParams]);

  // Load TMA IDs when TMA ID is selected (if coming from TMA mode)
  useEffect(() => {
    const modeId = searchParams.get('modeId');
    if (modeId && modeId !== 'all') {
      console.log('Loading TMA IDs for modeId:', modeId);
      loadTmaIds(modeId);
    } else {
      console.log('Clearing TMA IDs');
      setTmaIdOptions([]);
      setFilters(prev => ({ ...prev, tmaId: 'all' }));
    }
  }, [searchParams]);

  // Load documents when filters change
  useEffect(() => {
    loadDocuments();
  }, [filters]);

  // Load documents when URL parameters change
  useEffect(() => {
    loadDocuments();
  }, [searchParams]);

  // Load grain classes on component mount
  useEffect(() => {
    loadGrainClasses();
  }, []);

  // Load quality metrics when ModeID changes (for all mode types)
  useEffect(() => {
    const modeId = searchParams.get('modeId');
    if (modeId && modeId !== 'all') {
      loadQualityMetrics(modeId);
      loadModeDetails(modeId);
    } else {
      setQualityMetrics(null);
      setModeDetails(null);
      setWhitenessIndexData([]);
      setOverallWhitenessData(null);
      setChalkinessData(null);
    }
  }, [searchParams]);

  const loadQualityMetrics = async (modeId: string) => {
    try {
      setLoadingQualityMetrics(true);
      console.log('Loading quality metrics for modeId:', modeId);

      // Get the mode type from URL parameters
      const mode = searchParams.get('mode');
      let viewMode = 'individual'; // default
      
      if (mode === 'TMA') {
        viewMode = 'tma';
      } else if (mode === 'Batch') {
        viewMode = 'batch-wise';
      } else if (mode === 'Machine-wise') {
        viewMode = 'machine-wise';
      }

      // Use the same API endpoint as DataReports.tsx
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/grain-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromDate: '2024-01-01', // Use a wide date range to get all data
          toDate: '2025-12-31',
          viewMode: viewMode
        }),
      });
      
      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        setQualityMetrics(null);
        return;
      }

      const data = await response.json();
      console.log('Quality metrics response:', data);
      
      // The API returns an object with a 'data' property containing the array
      const processes = data.data || data;
      
      // Find the process that matches our modeId
      const matchingProcess = processes.find((process: any) => {
        if (!process || typeof process !== 'object') return false;
        return process.modeId === modeId;
      });

      if (matchingProcess) {
        setQualityMetrics({
          goodRice: { total: matchingProcess.overallGoodRice },
          rejections: { total: matchingProcess.overallRejection },
          foreignMatter: { total: matchingProcess.overallForeignMatter },
          totalGrains: matchingProcess.totalQuantity || 0
        });
      } else {
        console.log('No matching process found for modeId:', modeId);
        setQualityMetrics(null);
      }
    } catch (err) {
      console.error('Error loading quality metrics:', err);
      setQualityMetrics(null);
    } finally {
      setLoadingQualityMetrics(false);
    }
  };

  const loadModeDetails = async (modeId: string) => {
    try {
      setLoadingModeDetails(true);
      console.log('Loading mode details for modeId:', modeId);

      // Get the mode type from URL parameters
      const mode = searchParams.get('mode');
      let viewMode = 'individual'; // default
      
      if (mode === 'TMA') {
        viewMode = 'tma';
      } else if (mode === 'Batch') {
        viewMode = 'batch-wise';
      } else if (mode === 'Machine-wise') {
        viewMode = 'machine-wise';
      }

      // Load mode details from the same analytics API
      const response = await fetch(`${BACKEND_URL}/api/raice_labz/analytics/grain-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromDate: '2024-01-01',
          toDate: '2025-12-31',
          viewMode: viewMode
        }),
      });
      
      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        setModeDetails(null);
        setWhitenessIndexData([]);
        return;
      }

      const data = await response.json();
      const processes = data.data || data;
      
      // Find the process that matches our modeId
      const matchingProcess = processes.find((process: any) => {
        if (!process || typeof process !== 'object') return false;
        return process.modeId === modeId;
      });

      if (matchingProcess) {
        // Set mode details
        setModeDetails({
          variety: matchingProcess.variety || 'N/A',
          process: matchingProcess.process || matchingProcess.processType || 'Raw',
          date: matchingProcess.date || 'N/A',
          sessionType: matchingProcess.sessionType || 'N/A'
        });

        // Calculate whiteness index averages for each grain class and chalkiness data
        const whitenessData: WhitenessIndexData[] = [];
        let totalChalkyArea = 0;
        let totalGrainArea = 0;
        let grainsWithAreaData = 0;
        
        // Get all grains for this modeId to calculate whiteness index averages
        const grainsResponse = await fetch(`${BACKEND_URL}/api/raice_labz/database-viewer/grains/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: {},
            modeId: modeId,
            limit: 1000 // Get more grains for better average calculation
          }),
        });

        if (grainsResponse.ok) {
          const grainsData = await grainsResponse.json();
          if (grainsData.status === 'success' && grainsData.data) {
            // Group grains by grainClass and calculate average whiteness index
            const grainClassGroups: { [key: string]: { whitenessIndices: number[], count: number } } = {};
            
            grainsData.data.forEach((grain: any) => {
              const grainClass = grain.grainClass;
              const whitenessIndex = grain.segmentation?.whiteness_index;
              const chalkyArea = grain.segmentation?.chalky_area;
              const grainArea = grain.segmentation?.grain_area;
              
              if (grainClass && whitenessIndex !== undefined && whitenessIndex !== null) {
                if (!grainClassGroups[grainClass]) {
                  grainClassGroups[grainClass] = { whitenessIndices: [], count: 0 };
                }
                grainClassGroups[grainClass].whitenessIndices.push(Number(whitenessIndex));
                grainClassGroups[grainClass].count++;
              }
              
              // Calculate chalkiness data
              if (chalkyArea !== undefined && chalkyArea !== null && grainArea !== undefined && grainArea !== null) {
                totalChalkyArea += Number(chalkyArea);
                totalGrainArea += Number(grainArea);
                grainsWithAreaData++;
              }
            });

            // Calculate averages and overall average
            let totalWhitenessSum = 0;
            let totalGrainsCount = 0;
            
            Object.keys(grainClassGroups).forEach(grainClass => {
              const group = grainClassGroups[grainClass];
              const averageWhitenessIndex = group.whitenessIndices.reduce((sum, val) => sum + val, 0) / group.whitenessIndices.length;
              
              whitenessData.push({
                grainClass,
                averageWhitenessIndex: Number(averageWhitenessIndex.toFixed(2)),
                count: group.count
              });
              
              // Add to overall calculation
              totalWhitenessSum += group.whitenessIndices.reduce((sum, val) => sum + val, 0);
              totalGrainsCount += group.count;
            });

            // Calculate overall average whiteness index
            if (totalGrainsCount > 0) {
              const overallAverage = totalWhitenessSum / totalGrainsCount;
              setOverallWhitenessData({
                overallAverage: Number(overallAverage.toFixed(2)),
                totalGrains: totalGrainsCount
              });
            }

            // Calculate chalkiness data
            if (grainsWithAreaData > 0) {
              const averageChalkyArea = totalChalkyArea / grainsWithAreaData;
              const averageGrainArea = totalGrainArea / grainsWithAreaData;
              const chalkinessPercentage = (averageChalkyArea / averageGrainArea) * 100;
              
              setChalkinessData({
                averageChalkyArea: Number(averageChalkyArea.toFixed(2)),
                averageGrainArea: Number(averageGrainArea.toFixed(2)),
                chalkinessPercentage: Number(chalkinessPercentage.toFixed(2)),
                totalGrains: grainsWithAreaData
              });
            }

            // Sort by average whiteness index (descending)
            whitenessData.sort((a, b) => b.averageWhitenessIndex - a.averageWhitenessIndex);
          }
        }

        setWhitenessIndexData(whitenessData);
      } else {
        console.log('No matching process found for modeId:', modeId);
        setModeDetails(null);
        setWhitenessIndexData([]);
      }
    } catch (err) {
      console.error('Error loading mode details:', err);
      setModeDetails(null);
      setWhitenessIndexData([]);
    } finally {
      setLoadingModeDetails(false);
    }
  };

  const loadGrainClasses = async () => {
    try {
      setLoadingGrainClasses(true);
      console.log('Loading grain classes...');
      
      const response = await fetch('/api/raice_labz/grains/classes');
      
      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        setGrainClassOptions([]);
        return;
      }

      const data = await response.json();
      console.log('Grain classes response:', data);
      
      if (Array.isArray(data)) {
        setGrainClassOptions(data);
      } else {
        console.error('Invalid grain classes response format:', data);
        setGrainClassOptions([]);
      }
    } catch (err) {
      console.error('Error loading grain classes:', err);
      setGrainClassOptions([]);
    } finally {
      setLoadingGrainClasses(false);
    }
  };

  const loadTmaIds = async (modeId: string) => {
    try {
      console.log('Loading TMA IDs for modeId:', modeId);
      setLoadingTmaIds(true);
      
      if (!modeId || modeId === 'all') {
        console.log('Invalid modeId, clearing TMA IDs');
        setTmaIdOptions([]);
        return;
      }
      
      const response = await fetch('/api/raice_labz/database-viewer/tma-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modeId })
      });

      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        setTmaIdOptions([]);
        return;
      }

      const data = await response.json();
      console.log('TMA IDs response:', data);
      
      if (data.status === 'success') {
        setTmaIdOptions(data.tmaIds || []);
      } else {
        console.error('Failed to load TMA IDs:', data.message);
        setTmaIdOptions([]);
      }
    } catch (err) {
      console.error('Error loading TMA IDs:', err);
      setTmaIdOptions([]);
    } finally {
      setLoadingTmaIds(false);
    }
  };


  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get URL parameters for filtering
      const modeId = searchParams.get('modeId');
      const mode = searchParams.get('mode');

      const queryData = {
        query: {},
        search: filters.search,
        grainClass: filters.grainClass === 'all' ? undefined : filters.grainClass,
        tmaId: filters.tmaId === 'all' ? undefined : filters.tmaId,
        modeId: modeId && modeId !== 'all' ? modeId : undefined,
        mode: mode && mode !== 'all' ? mode : undefined,
        sortField: filters.sortField,
        sortOrder: filters.sortOrder,
        page: filters.page,
        limit: filters.limit
      };

      console.log('🔍 [FRONTEND DEBUG] Loading documents with query:', queryData);

      const response = await fetch(`/api/raice_labz/database-viewer/grains/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryData)
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setDocuments(data.data);
        setPagination(data.pagination);
        console.log('🔍 [FRONTEND DEBUG] Loaded documents:', {
          count: data.data?.length || 0,
          total: data.pagination?.total_count || 0,
          sampleIds: data.data?.slice(0, 3).map((doc: any) => doc.grainId) || []
        });
      } else {
        setError(data.message || 'Failed to load grains');
      }
    } catch (err) {
      setError('Failed to load grains');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to page 1 when other filters change
    };
    
    setFilters(newFilters);
    
    // Update URL parameters for important filters
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (key === 'grainClass') {
      if (value === 'all') {
        newSearchParams.delete('grainClass');
      } else {
        newSearchParams.set('grainClass', value);
      }
    }
    
    if (key === 'tmaId') {
      if (value === 'all') {
        newSearchParams.delete('tmaId');
      } else {
        newSearchParams.set('tmaId', value);
      }
    }
    
    // Update URL without triggering a page reload
    setSearchParams(newSearchParams, { replace: true });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      grainClass: 'all',
      tmaId: 'all',
      sortField: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 10
    });
    
    // Clear URL parameters
    setSearchParams({}, { replace: true });
  };

  const exportData = async () => {
    try {
      // Get URL parameters for filtering
      const modeId = searchParams.get('modeId');
      const mode = searchParams.get('mode');

      const queryData = {
        query: {},
        search: filters.search,
        grainClass: filters.grainClass === 'all' ? undefined : filters.grainClass,
        tmaId: filters.tmaId === 'all' ? undefined : filters.tmaId,
        modeId: modeId && modeId !== 'all' ? modeId : undefined,
        mode: mode && mode !== 'all' ? mode : undefined
      };

      const response = await fetch(`/api/raice_labz/database-viewer/grains/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryData)
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grains_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setError(data.message || 'Failed to export data');
      }
    } catch (err) {
      setError('Failed to export data');
    }
  };

  const getFieldValue = (doc: Document, field: string) => {
    const keys = field.split('.');
    let value = doc;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    return value;
  };

  const formatValue = (value: any, field: string): string | JSX.Element => {
    if (value === null || value === undefined) return '-';
    
    // Special handling for grainId - extract only the last part after underscore
    if (field === 'grainId' && typeof value === 'string') {
      const lastUnderscoreIndex = value.lastIndexOf('_');
      if (lastUnderscoreIndex !== -1) {
        // Get everything after the last underscore
        return value.substring(lastUnderscoreIndex + 1);
      }
      // If no underscore found, return the original value
      return value;
    }
    
    // Special handling for individual segmentation metric fields
    if (field.startsWith('segmentation.')) {
      const metricName = field.replace('segmentation.', '');
      
      // Handle numeric segmentation metrics with proper formatting
      if (typeof value === 'number' || (!isNaN(Number(value)) && value !== '')) {
        const numValue = Number(value);
        
        // Format based on metric type
        if (metricName === 'length_mm' || metricName === 'breadth_mm') {
          return `${numValue.toFixed(2)}`;
        } else if (metricName === 'grain_area' || metricName === 'chalky_area') {
          return `${numValue.toFixed(2)}`;
        } else if (metricName === 'whiteness_index') {
          return `${numValue.toFixed(2)}`;
        } else if (metricName === 'mean_r' || metricName === 'mean_g' || metricName === 'mean_b') {
          return `${numValue.toFixed(2)}`;
        }
      }
      
      return String(value);
    }
    
    // Special handling for image field
    if (field === 'image') {
      return <span className="text-blue-600">Image Available</span>;
    }
    
    // Special handling for chalky outline field
    if (field === 'chalkyOutline') {
      return <span className="text-blue-600">Chalky Outline Available</span>;
    }
    
    if (typeof value === 'object') {
      // For nested objects, show key-value pairs in a more readable format
      if (Array.isArray(value)) {
        return value.length > 0 ? `[${value.length} items]` : '[]';
      }
      // For objects, show a summary
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      if (keys.length <= 3) {
        return keys.map(key => `${key}: ${value[key]}`).join(', ');
      }
      return `{${keys.length} fields}`;
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
    return String(value);
  };

  const getCommonFields = (docs: Document[]): string[] => {
    if (docs.length === 0) return [];
    
    // For grains collection, show specific fields in a specific order
    return [
      'grainId',
      'grainClass',
      'segmentation.length_mm',
      'segmentation.breadth_mm',
      'segmentation.grain_area',
      'segmentation.chalky_area',
      'segmentation.whiteness_index',
      'segmentation.mean_r',
      'segmentation.mean_g',
      'segmentation.mean_b',
      'image',
      'chalkyOutline'
    ];
  };

  const commonFields = getCommonFields(documents);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DatabaseIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Grain Details</h1>
          {searchParams.toString() && (
            <Badge variant="secondary" className="ml-2">
              Pre-filtered
            </Badge>
          )}
          {searchParams.get('modeId') && (
            <Badge variant="outline" className="ml-2">
              Mode: {searchParams.get('modeId')}
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {pagination && `Total: ${pagination.total_count} | Page: ${pagination.current_page} of ${pagination.total_pages}`}
        </div>
      </div>


      {/* Mode Details and Whiteness Index */}
      {(modeDetails || overallWhitenessData || chalkinessData) && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DatabaseIcon className="h-5 w-5 text-blue-600" />
              <span>Mode Details & Analysis - {searchParams.get('modeId')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode Details */}
            {modeDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-blue-600 font-semibold text-sm">Variety</div>
                  <div className="text-lg font-bold text-blue-700">{modeDetails.variety.toUpperCase()}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-green-600 font-semibold text-sm">Process</div>
                  <div className="text-lg font-bold text-green-700">{modeDetails.process}</div>
                </div>
              </div>
            )}

            {/* Overall Whiteness Index */}
            {overallWhitenessData && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-gray-600 font-medium text-sm">Overall Average Whiteness Index</div>
                    <div className="text-xs text-gray-500">{overallWhitenessData.totalGrains} grains analyzed</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">{overallWhitenessData.overallAverage}</div>
                    <div className="text-xs text-gray-500">avg whiteness</div>
                  </div>
                </div>
              </div>
            )}

            {/* Chalkiness Analysis */}
            {chalkinessData && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-blue-600 font-medium text-sm">Chalkiness Analysis</div>
                    <div className="text-xs text-blue-500">{chalkinessData.totalGrains} grains analyzed</div>
                    <div className="text-xs text-blue-500 mt-1">
                      Avg Chalky Area: {chalkinessData.averageChalkyArea}px² | 
                      Avg Grain Area: {chalkinessData.averageGrainArea}px²
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-700">{chalkinessData.chalkinessPercentage}%</div>
                    <div className="text-xs text-blue-500">chalkiness</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Mode Details */}
      {loadingModeDetails && (
        <Card className="animate-fade-in">
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCwIcon className="h-6 w-6 animate-spin mr-2 text-blue-600" />
              <span className="text-gray-600">Loading mode details...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FilterIcon className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Grain Class */}
            <div className="space-y-2">
              <Label htmlFor="grainClass">Grain Class</Label>
              <Select 
                value={filters.grainClass} 
                onValueChange={(value) => handleFilterChange('grainClass', value)}
                disabled={loadingGrainClasses}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    loadingGrainClasses 
                      ? "Loading grain classes..." 
                      : "All Grain Classes"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grain Classes</SelectItem>
                  {grainClassOptions.map((option) => (
                    <SelectItem key={option._id} value={option._id}>
                      {option._id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TMA ID (conditional) */}
            {searchParams.get('mode') === 'TMA' && (
              <div className="space-y-2">
                <Label htmlFor="tmaId">TMA ID</Label>
                <Select 
                  value={filters.tmaId} 
                  onValueChange={(value) => handleFilterChange('tmaId', value)}
                  disabled={loadingTmaIds}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingTmaIds 
                        ? "Loading TMA IDs..." 
                        : "Select TMA ID"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All TMA IDs</SelectItem>
                    {tmaIdOptions.map((option) => (
                      <SelectItem key={option.tmaId} value={option.tmaId}>
                        {option.machineName} ({option.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search grains..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadDocuments} disabled={loading}>
              <FilterIcon className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileTextIcon className="h-5 w-5" />
            <span>Grains Data</span>
            <Badge variant="secondary">grains</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCwIcon className="h-6 w-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No grains found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {commonFields.map((field) => {
                      const getDisplayName = (field: string) => {
                        const headerMap: { [key: string]: string } = {
                          'grainId': 'ID',
                          'grainClass': 'Grain Class',
                          'segmentation.length_mm': 'Length (mm)',
                          'segmentation.breadth_mm': 'Breadth (mm)',
                          'segmentation.grain_area': 'Grain Area (px²)',
                          'segmentation.chalky_area': 'Chalky Area (px²)',
                          'segmentation.whiteness_index': 'Whiteness Index',
                          'segmentation.mean_r': 'Mean Red',
                          'segmentation.mean_g': 'Mean Green',
                          'segmentation.mean_b': 'Mean Blue',
                          'image': 'Grain Image',
                          'chalkyOutline': 'Chalky Outline'
                        };
                        return headerMap[field] || field;
                      };
                      
                      return (
                        <TableHead key={field} className="min-w-[150px]">
                          {getDisplayName(field)}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc, index) => (
                    <TableRow key={doc._id || index}>
                      {commonFields.map((field) => (
                        <TableCell key={field} className="max-w-[200px] truncate">
                          {field === 'image' ? (
                            <div className="flex items-center space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <div className="relative cursor-pointer group">
                                    <img 
                                      src={`/api/raice_labz/grains/${doc.grainId}/image`}
                                      alt={`Grain ${doc.grainId}`}
                                      className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded border flex items-center justify-center">
                                      <ZoomInIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-sm text-gray-500 hidden">No Image</span>
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                                  <DialogHeader>
                                    <DialogTitle>Grain Image - {doc.grainId}</DialogTitle>
                                  </DialogHeader>
                                  <div className="flex justify-center">
                                    <img 
                                      src={`/api/raice_labz/grains/${doc.grainId}/image`}
                                      alt={`Grain ${doc.grainId}`}
                                      className="max-w-full max-h-[70vh] object-contain rounded"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ) : field === 'chalkyOutline' ? (
                            <div className="flex items-center space-x-2">
                              {doc.segmentation?.seg_id ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <div className="relative cursor-pointer group">
                                      <img 
                                        src={`/api/db/gridfs/grain_images/${doc.segmentation.seg_id}`}
                                        alt={`Chalky Area ${doc.grainId}`}
                                        className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          target.nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded border flex items-center justify-center">
                                        <ZoomInIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                                    <DialogHeader>
                                      <DialogTitle>Chalky Area - {doc.grainId}</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex justify-center">
                                      <img 
                                        src={`/api/db/gridfs/grain_images/${doc.segmentation.seg_id}`}
                                        alt={`Chalky Area ${doc.grainId}`}
                                        className="max-w-full max-h-[70vh] object-contain rounded"
                                      />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-sm text-gray-500">No data available</span>
                              )}
                            </div>
                          ) : (
                            formatValue(getFieldValue(doc, field), field)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {((pagination.current_page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.current_page * pagination.limit, pagination.total_count)} of{' '}
                {pagination.total_count} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', pagination.current_page - 1)}
                  disabled={!pagination.has_prev}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', pagination.current_page + 1)}
                  disabled={!pagination.has_next}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GrainsViewer;
