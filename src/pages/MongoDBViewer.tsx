import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon, FilterIcon, RefreshCwIcon, DownloadIcon, DatabaseIcon, FileTextIcon, ZoomInIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Collection {
  name: string;
  count: number;
  indexes: any[];
  error?: string;
}

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
  collection: string;
  search: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  mode: string;
  modeId: string;
  tmaId: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const MongoDBViewer: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    collection: '',
    search: '',
    startDate: undefined,
    endDate: undefined,
    mode: 'all',
    modeId: '',
    tmaId: '',
    sortField: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });

  // Load collections on component mount
  useEffect(() => {
    loadCollections();
  }, []);

  // Load documents when filters change
  useEffect(() => {
    if (filters.collection) {
      loadDocuments();
    }
  }, [filters]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      console.log('Loading collections...');
      const response = await fetch('/api/raice_labz/database-viewer/collections');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.status === 'success') {
        const collectionList = Object.values(data.collections) as Collection[];
        console.log('Collection list:', collectionList);
        setCollections(collectionList);
        if (collectionList.length > 0 && !filters.collection) {
          setFilters(prev => ({ ...prev, collection: collectionList[0].name }));
        }
      } else {
        console.error('API returned error status:', data.status, data.message);
        setError(data.message || 'Failed to load collections');
      }
    } catch (err) {
      console.error('Error loading collections:', err);
      setError(`Failed to load collections: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!filters.collection) return;

    try {
      setLoading(true);
      setError(null);

      const queryData = {
        query: {},
        search: filters.search,
        dateRange: filters.startDate && filters.endDate ? {
          start: filters.startDate.toISOString(),
          end: filters.endDate.toISOString()
        } : undefined,
        mode: filters.mode,
        modeId: filters.modeId,
        tmaId: filters.tmaId,
        sortField: filters.sortField,
        sortOrder: filters.sortOrder,
        page: filters.page,
        limit: filters.limit
      };

      const response = await fetch(`/api/raice_labz/database-viewer/${filters.collection}/query`, {
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
      } else {
        setError(data.message || 'Failed to load documents');
      }
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to page 1 when other filters change
    }));
  };

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      search: '',
      startDate: undefined,
      endDate: undefined,
      mode: 'all',
      modeId: '',
      tmaId: '',
      page: 1
    }));
  };

  const exportData = async () => {
    if (!filters.collection) return;

    try {
      const queryData = {
        query: {},
        search: filters.search,
        dateRange: filters.startDate && filters.endDate ? {
          start: filters.startDate.toISOString(),
          end: filters.endDate.toISOString()
        } : undefined,
        mode: filters.mode,
        modeId: filters.modeId,
        tmaId: filters.tmaId
      };

      const response = await fetch(`/api/raice_labz/database-viewer/${filters.collection}/export`, {
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
        a.download = `${filters.collection}_export_${new Date().toISOString().split('T')[0]}.json`;
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
    // Special handling for segmentation field in grains collection - check this first
    if (field === 'segmentation' && filters.collection === 'grains') {
      if (value === null || value === undefined) {
        return <div className="text-gray-500 text-center">No data available</div>;
      }
      if (typeof value === 'object' && value !== null) {
        const segData = value as any;
        return (
          <div className="space-y-1 text-sm">
            {segData.length_mm && (
              <div className="flex justify-between">
                <span className="text-gray-600">Length:</span>
                <span className="font-medium">{segData.length_mm}mm</span>
              </div>
            )}
            {segData.breadth_mm && (
              <div className="flex justify-between">
                <span className="text-gray-600">Breadth:</span>
                <span className="font-medium">{segData.breadth_mm}mm</span>
              </div>
            )}
            {segData.grain_area && (
              <div className="flex justify-between">
                <span className="text-gray-600">Grain Area:</span>
                <span className="font-medium">{segData.grain_area}px²</span>
              </div>
            )}
            {segData.chalky_area && (
              <div className="flex justify-between">
                <span className="text-gray-600">Chalky Area:</span>
                <span className="font-medium">{segData.chalky_area}px²</span>
              </div>
            )}
            {segData.whiteness_index !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Whiteness Index:</span>
                <span className="font-medium">{Number(segData.whiteness_index).toFixed(2)}</span>
              </div>
            )}
            {segData.mean_r !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mean Red:</span>
                <span className="font-medium">{Number(segData.mean_r).toFixed(2)}</span>
              </div>
            )}
            {segData.mean_g !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mean Green:</span>
                <span className="font-medium">{Number(segData.mean_g).toFixed(2)}</span>
              </div>
            )}
            {segData.mean_b !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mean Blue:</span>
                <span className="font-medium">{Number(segData.mean_b).toFixed(2)}</span>
              </div>
            )}
            {!segData.length_mm && !segData.breadth_mm && !segData.grain_area && !segData.chalky_area && !segData.whiteness_index && !segData.mean_r && !segData.mean_g && !segData.mean_b && (
              <div className="text-gray-500 text-center">No data available</div>
            )}
          </div>
        );
      }
      return <div className="text-gray-500 text-center">No data available</div>;
    }
    
    if (value === null || value === undefined) return '-';
    
    // Special handling for image field in grains collection
    if (field === 'image' && filters.collection === 'grains') {
      return <span className="text-blue-600">Image Available</span>;
    }
    
    // Special handling for chalky outline field in grains collection
    if (field === 'chalkyOutline' && filters.collection === 'grains') {
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
    
    // Special handling for grains collection
    if (filters.collection === 'grains') {
      return [
        'grainId',
        'grainClass', 
        'segmentation',
        'image',
        'chalkyOutline'
      ];
    }
    
    // Special handling for modes collection
    if (filters.collection === 'modes') {
      return [
        'ModeID',
        'ModeType', 
        'PrimaryClassification',
        'MorphologicalProperties',
        'NutritionalProperties',
        'GMAD Properties',
        'SamplingStrategy',
        'startTime',
        'EndTime',
        'Status'
      ];
    }
    
    const fieldCounts: { [key: string]: number } = {};
    docs.forEach(doc => {
      Object.keys(doc).forEach(key => {
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      });
    });

    // Return fields that appear in at least 50% of documents
    const threshold = Math.ceil(docs.length * 0.5);
    return Object.entries(fieldCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([field, _]) => field)
      .sort();
  };

  const commonFields = getCommonFields(documents);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DatabaseIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">MongoDB Database Viewer</h1>
        </div>
        <div className="text-sm text-gray-500">
          {pagination && `Total: ${pagination.total_count} | Page: ${pagination.current_page} of ${pagination.total_pages}`}
        </div>
      </div>

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
            {/* Collection Selector */}
            <div className="space-y-2">
              <Label htmlFor="collection">Collection</Label>
              <Select value={filters.collection} onValueChange={(value) => handleFilterChange('collection', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.name} value={collection.name}>
                      {collection.name} ({collection.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode Selector */}
            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select value={filters.mode} onValueChange={(value) => handleFilterChange('mode', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Machine-wise">Machine-wise</SelectItem>
                  <SelectItem value="Batch">Batch</SelectItem>
                  <SelectItem value="TMA">TMA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mode ID */}
            <div className="space-y-2">
              <Label htmlFor="modeId">Mode ID</Label>
              <Input
                id="modeId"
                placeholder="Enter Mode ID"
                value={filters.modeId}
                onChange={(e) => handleFilterChange('modeId', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* TMA ID (conditional) */}
            {filters.mode === 'TMA' && (
              <div className="space-y-2">
                <Label htmlFor="tmaId">TMA ID</Label>
                <Input
                  id="tmaId"
                  placeholder="Enter TMA ID"
                  value={filters.tmaId}
                  onChange={(e) => handleFilterChange('tmaId', e.target.value)}
                />
              </div>
            )}

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, "dd-MM-yyyy") : "dd-mm-yyyy"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, "dd-MM-yyyy") : "dd-mm-yyyy"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
            <Button variant="outline" onClick={loadDocuments} disabled={loading}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportData} disabled={!filters.collection}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Export
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
            <span>Data Table</span>
            {filters.collection && (
              <Badge variant="secondary">{filters.collection}</Badge>
            )}
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
              No documents found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {commonFields.map((field) => {
                      // Special formatting for collection headers
                      const getDisplayName = (field: string) => {
                        if (filters.collection === 'grains') {
                          const headerMap: { [key: string]: string } = {
                            'grainId': 'Grain ID',
                            'grainClass': 'Grain Class',
                            'segmentation': 'Grain Metrics',
                            'image': 'Grain Image',
                            'chalkyOutline': 'Chalky Area'
                          };
                          return headerMap[field] || field;
                        }
                        if (filters.collection === 'modes') {
                          const headerMap: { [key: string]: string } = {
                            'ModeID': 'Mode ID',
                            'ModeType': 'Mode Type',
                            'PrimaryClassification': 'Primary Classification',
                            'MorphologicalProperties': 'Morphological Properties',
                            'NutritionalProperties': 'Nutritional Properties',
                            'GMAD Properties': 'GMAD Properties',
                            'SamplingStrategy': 'Sampling Strategy',
                            'startTime': 'Start Time',
                            'EndTime': 'End Time',
                            'Status': 'Status'
                          };
                          return headerMap[field] || field;
                        }
                        return field;
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
                          {field === 'image' && filters.collection === 'grains' ? (
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
                          ) : field === 'chalkyOutline' && filters.collection === 'grains' ? (
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

export default MongoDBViewer;
