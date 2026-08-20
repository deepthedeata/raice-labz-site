import { useState, useEffect } from 'react';

// Interface for data sent TO the backend (simple string format)
interface GrainInfoInput {
  variety: string;
  process: string;
  harvestSeason?: string;
  month?: string;
  category?: string;
  grainType?: string;
  geoProperties: {
    length: string;
    breadth: string;
    weight: string;
    aspectRatio: string;
    hardness: string;
  };
  chemicalProperties: {
    protein: string;
    carbohydrate: string;
    vitamin: string;
    mineral: string;
    lipids: string;
  };
  gmadProperties: {
    gelatinization: string;
    moisture: string;
    age: string;
    density: string;
  };
  customProperties: Array<{
    id: string;
    name: string;
    value: string;
    unit?: string;
  }>;
}

// Interface for data received FROM the backend (complex object format)
interface GrainInfo {
  variety: string;
  process: string;
  harvestSeason?: string;
  MorphologicalProperties: {
    length: { value: number; unit: string; description: string };
    breadth: { value: number; unit: string; description: string };
    weight: { value: number; unit: string; description: string };
    aspectRatio: { value: number; unit: string | null; description: string };
    hardness: { value: number; unit: string; description: string };
  };
  chemicalProperties: {
    protein: { value: number; unit: string; description: string };
    carbohydrate: { value: number; unit: string; description: string };
    vitamin: { value: number; unit: string; description: string };
    mineral: { value: number; unit: string; description: string };
    lipids: { value: number; unit: string; description: string };
  };
  gmadProperties: {
    gelatinization: { value: number; unit: string; description: string };
    moisture: { value: number; unit: string; description: string };
    age: { value: number; unit: string; description: string };
    density: { value: number; unit: string; description: string };
  };
  customProperties: Array<{
    id: string;
    name: string;
    value: string;
    unit?: string;
  }>;
}

export const useGrainInfo = () => {
  const [grainInfo, setGrainInfo] = useState<GrainInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

  const fetchGrainInfo = async (variety: string, process: string, harvestSeason?: string) => {
    if (!variety || !process) return;

    console.log('🔍 Fetching grain info for:', variety, process, harvestSeason);
    setLoading(true);
    setError(null);

    try {
      let url;
      if (harvestSeason) {
        url = `${BACKEND_URL}/api/raice_labz/grain-info/variety/${encodeURIComponent(variety)}/process/${encodeURIComponent(process)}/season/${encodeURIComponent(harvestSeason)}`;
      } else {
        url = `${BACKEND_URL}/api/raice_labz/grain-info/variety/${encodeURIComponent(variety)}/process/${encodeURIComponent(process)}`;
      }
      console.log('🌐 API URL:', url);
      
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Response:', data);
        if (data.status === 'success') {
          console.log('📊 Setting grain info:', data.grain_info);
          setGrainInfo(data.grain_info);
        } else {
          console.log('❌ API returned error status');
          setGrainInfo(null);
        }
      } else if (response.status === 404) {
        console.log('❌ Grain info not found (404)');
        setGrainInfo(null);
      } else {
        console.log('❌ HTTP error:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch grain info');
      setGrainInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const saveGrainInfo = async (grainInfoData: Partial<GrainInfoInput>) => {
    setLoading(true);
    setError(null);

    const url = `${BACKEND_URL}/api/raice_labz/grain-info`;
    console.log('💾 Saving grain info to:', url);
    console.log('📦 Data being sent:', grainInfoData);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(grainInfoData),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response data:', data);
        if (data.status === 'success') {
          setGrainInfo(grainInfoData as GrainInfo);
          return true;
        } else {
          const errorMsg = data.error || 'Failed to save grain info';
          console.error('❌ API returned error:', errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const text = await response.text();
          console.error('❌ Response text:', text);
          throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        }
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save grain info';
      console.error('❌ Save error:', err);
      console.error('❌ Error message:', errorMessage);
      
      // Check if it's a network error
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = `Cannot connect to backend at ${url}. Please check:\n1. Is the backend server running?\n2. Is it accessible at ${BACKEND_URL}?\n3. Are there CORS issues?`;
        console.error('❌ Network error:', networkError);
        setError(networkError);
      } else {
        setError(errorMessage);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateGrainInfo = async (variety: string, process: string, updateData: Partial<GrainInfoInput>, harvestSeason?: string) => {
    setLoading(true);
    setError(null);

    let url;
    if (harvestSeason) {
      url = `${BACKEND_URL}/api/raice_labz/grain-info/variety/${encodeURIComponent(variety)}/process/${encodeURIComponent(process)}/season/${encodeURIComponent(harvestSeason)}`;
    } else {
      url = `${BACKEND_URL}/api/raice_labz/grain-info/variety/${encodeURIComponent(variety)}/process/${encodeURIComponent(process)}`;
    }
    
    console.log('🔄 Updating grain info at:', url);
    console.log('📦 Update data being sent:', updateData);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('📡 Update response status:', response.status);
      console.log('📡 Update response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Update response data:', data);
        if (data.status === 'success') {
          // Don't update grainInfo state after update to prevent useEffect from overwriting user edits
          // The frontend state already has the user's edited values
          return true;
        } else {
          const errorMsg = data.error || data.message || 'Failed to update grain info';
          console.error('❌ API returned error:', errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const text = await response.text();
          console.error('❌ Update response text:', text);
          throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        }
        console.error('❌ Update error response:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update grain info';
      console.error('❌ Update error:', err);
      console.error('❌ Update error message:', errorMessage);
      
      // Check if it's a network error
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = `Cannot connect to backend at ${url}. Please check:\n1. Is the backend server running?\n2. Is it accessible at ${BACKEND_URL}?\n3. Are there CORS issues?`;
        console.error('❌ Network error:', networkError);
        setError(networkError);
      } else {
        setError(errorMessage);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkGrainInfoExists = async (
    variety: string,
    process: string,
    harvestSeason?: string,
    category?: string,
    grainType?: string
  ): Promise<boolean> => {
    try {
      let url;
      if (harvestSeason) {
        url = `${BACKEND_URL}/api/raice_labz/grain-info/check-exists?variety=${encodeURIComponent(
          variety
        )}&process=${encodeURIComponent(process)}&harvestSeason=${encodeURIComponent(harvestSeason)}`;
      } else {
        url = `${BACKEND_URL}/api/raice_labz/grain-info/check-exists?variety=${encodeURIComponent(
          variety
        )}&process=${encodeURIComponent(process)}`;
      }

      // Apply new uniqueness rule when category / grainType are provided
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }
      if (grainType) {
        url += `&grainType=${encodeURIComponent(grainType)}`;
      }
      
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        return data.exists;
      }
      return false;
    } catch (err) {
      console.error('Error checking grain info existence:', err);
      return false;
    }
  };

  return {
    grainInfo,
    loading,
    error,
    fetchGrainInfo,
    saveGrainInfo,
    updateGrainInfo,
    checkGrainInfoExists,
  };
};
