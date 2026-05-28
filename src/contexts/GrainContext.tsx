import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface GrainFormData {
  grainType: string;
  variety: string;
  process: string;
  harvestSeason?: string;
  month?: string;
  testing: string;
  sampling: string;
  samplingInterval?: string;
  batch: string;
  machine: string;
  series?: string;
  enableTam?: boolean;
  tamSeries?: string;
  tamMachines?: string[];
  customId?: string;
}

export interface GrainProperties {
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

interface GrainContextType {
  grainFormData: GrainFormData;
  grainProperties: GrainProperties;
  updateGrainFormData: (data: Partial<GrainFormData>) => void;
  updateGrainProperties: (properties: Partial<GrainProperties>) => void;
  resetGrainData: () => void;
  isGrainFormComplete: boolean;
  isGrainPropertiesComplete: boolean;
  geoPropertiesComplete: boolean;
  chemicalPropertiesComplete: boolean;
  gmadPropertiesComplete: boolean;
  isFullConfigurationComplete: boolean;
  isAnalysisRunning: boolean;
  setIsAnalysisRunning: (running: boolean) => void;
  generateInputJSON: () => any;
  sendDataToBackend: () => Promise<void>;
}

const GrainContext = createContext<GrainContextType | undefined>(undefined);

const initialGrainFormData: GrainFormData = {
  grainType: "",
  variety: "",
  process: "",
  harvestSeason: "",
  month: "",
  testing: "",
  sampling: "",
  batch: "1",
  machine: ""
};

const initialGrainProperties: GrainProperties = {
  geoProperties: {
    length: "4.5",
    breadth: "2.3",
    weight: "22.5",
    aspectRatio: "2.4",
    hardness: "45"
  },
  chemicalProperties: {
    protein: "7.2",
    carbohydrate: "78.9",
    vitamin: "0.4",
    mineral: "1.3",
    lipids: "2.8"
  },
  gmadProperties: {
    gelatinization: "", // Not auto-filled
    moisture: "14.5",
    age: "6",
    density: "" // Not auto-filled
  },
  customProperties: []
};

interface GrainProviderProps {
  children: ReactNode;
}

export const GrainProvider: React.FC<GrainProviderProps> = ({ children }) => {
  const [grainFormData, setGrainFormData] = useState<GrainFormData>(initialGrainFormData);
  const [grainProperties, setGrainProperties] = useState<GrainProperties>(initialGrainProperties);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState<boolean>(false);

  const updateGrainFormData = (data: Partial<GrainFormData>) => {
    setGrainFormData(prev => {
      const newData = { ...prev, ...data };
      return newData;
    });
  };

  const updateGrainProperties = (properties: Partial<GrainProperties>) => {
    setGrainProperties(prev => ({
      ...prev,
      ...properties,
      // Deep merge for nested objects
      geoProperties: properties.geoProperties 
        ? { ...prev.geoProperties, ...properties.geoProperties }
        : prev.geoProperties,
      chemicalProperties: properties.chemicalProperties
        ? { ...prev.chemicalProperties, ...properties.chemicalProperties }
        : prev.chemicalProperties,
      gmadProperties: properties.gmadProperties
        ? { ...prev.gmadProperties, ...properties.gmadProperties }
        : prev.gmadProperties,
      customProperties: properties.customProperties !== undefined
        ? properties.customProperties
        : prev.customProperties,
    }));
  };

  const resetGrainData = () => {
    setGrainFormData(initialGrainFormData);
    setGrainProperties(initialGrainProperties);
  };

  const generateInputJSON = () => {
    const currentTimestamp = new Date().toISOString();
    const userId = "user_" + Math.random().toString(36).substr(2, 9);
    const sessionId = "session_" + Math.random().toString(36).substr(2, 9);

    // Default values to use when user input is missing
    const defaultValues = {
      grain_information: {
        grain_type: "rice",
        variety: "basmati",
        process: "raw"
      },
      testing_details: {
        testing_option: "batch",
        sampling_technique: "random",
        batch_selection: "dryer"
      },
      geo_properties: {
        length: 6.0,
        breadth: 2.0,
        weight: 20.0,
        aspectRatio: 3.0,
        hardness: 7.0
      },
      chemical_properties: {
        protein: 7.0,
        carbohydrate: 78.0,
        vitamin: 0.5,
        mineral: 1.0,
        lipids: 0.8
      },
      gmad_properties: {
        gelatinization: 65.0,
        moisture: 14.0,
        age: 6.0,
        density: 1.4
      }
    };

    // Helper function to convert string to number, return default if empty/invalid
    const toNumberWithDefault = (value: string, defaultValue: number) => {
      const num = parseFloat(value);
      return isNaN(num) || value.trim() === "" ? defaultValue : num;
    };

    // Helper function to get string value or default
    const getValueOrDefault = (value: string, defaultValue: string) => {
      // Handle undefined/null values
      if (value === undefined || value === null) {
        return defaultValue;
      }
      
      // Handle empty strings
      if (value.trim() === "") {
        return defaultValue;
      }
      
      return value;
    };

    // Helper function to get unit based on property type
    const getUnit = (propertyType: string, propertyName: string) => {
      const unitMap: { [key: string]: { [key: string]: string } } = {
        geo: {
          length: "mm",
          breadth: "mm", 
          weight: "mg",
          aspectRatio: null,
          hardness: "N"
        },
        chemical: {
          protein: "%",
          carbohydrate: "%",
          vitamin: "mg",
          mineral: "%",
          lipids: "%"
        },
        gmad: {
          gelatinization: "°C",
          moisture: "%",
          age: "months",
          density: "g/cm3"
        }
      };
      return unitMap[propertyType]?.[propertyName] || null;
    };

    const inputJSON = {
      metadata: {
        timestamp: currentTimestamp,
        user_id: userId,
        session_id: sessionId
      },
      grain_information: {
        grain_type: getValueOrDefault(grainFormData.grainType, defaultValues.grain_information.grain_type),
        variety: getValueOrDefault(grainFormData.variety, defaultValues.grain_information.variety),
        process: getValueOrDefault(grainFormData.process, defaultValues.grain_information.process)
      },
      testing_details: {
        testing_option: getValueOrDefault(grainFormData.testing, defaultValues.testing_details.testing_option),
        sampling_technique: getValueOrDefault(grainFormData.sampling, defaultValues.testing_details.sampling_technique),
        batch: getValueOrDefault(grainFormData.batch, "1"),  // Send batch number in 'batch' field
        machine: getValueOrDefault(grainFormData.machine, "")
      },
      geo_properties: [
        {
          name: "Length",
          value: toNumberWithDefault(grainProperties.geoProperties.length, defaultValues.geo_properties.length),
          unit: getUnit("geo", "length")
        },
        {
          name: "Breadth", 
          value: toNumberWithDefault(grainProperties.geoProperties.breadth, defaultValues.geo_properties.breadth),
          unit: getUnit("geo", "breadth")
        },
        {
          name: "Weight",
          value: toNumberWithDefault(grainProperties.geoProperties.weight, defaultValues.geo_properties.weight),
          unit: getUnit("geo", "weight")
        },
        {
          name: "Aspect Ratio",
          value: toNumberWithDefault(grainProperties.geoProperties.aspectRatio, defaultValues.geo_properties.aspectRatio),
          unit: getUnit("geo", "aspectRatio")
        },
        {
          name: "Hardness",
          value: toNumberWithDefault(grainProperties.geoProperties.hardness, defaultValues.geo_properties.hardness),
          unit: getUnit("geo", "hardness")
        }
      ], // Removed filter - always include all properties with defaults
      chemical_properties: [
        {
          name: "Protein",
          value: toNumberWithDefault(grainProperties.chemicalProperties.protein, defaultValues.chemical_properties.protein),
          unit: getUnit("chemical", "protein")
        },
        {
          name: "Carbohydrate",
          value: toNumberWithDefault(grainProperties.chemicalProperties.carbohydrate, defaultValues.chemical_properties.carbohydrate),
          unit: getUnit("chemical", "carbohydrate")
        },
        {
          name: "Vitamin",
          value: toNumberWithDefault(grainProperties.chemicalProperties.vitamin, defaultValues.chemical_properties.vitamin),
          unit: getUnit("chemical", "vitamin")
        },
        {
          name: "Mineral",
          value: toNumberWithDefault(grainProperties.chemicalProperties.mineral, defaultValues.chemical_properties.mineral),
          unit: getUnit("chemical", "mineral")
        },
        {
          name: "Lipids",
          value: toNumberWithDefault(grainProperties.chemicalProperties.lipids, defaultValues.chemical_properties.lipids),
          unit: getUnit("chemical", "lipids")
        }
      ], // Removed filter - always include all properties with defaults
      gmad_properties: [
        {
          name: "Gelatinization Temperature",
          value: toNumberWithDefault(grainProperties.gmadProperties.gelatinization, defaultValues.gmad_properties.gelatinization),
          unit: getUnit("gmad", "gelatinization")
        },
        {
          name: "Moisture",
          value: toNumberWithDefault(grainProperties.gmadProperties.moisture, defaultValues.gmad_properties.moisture),
          unit: getUnit("gmad", "moisture")
        },
        {
          name: "Age",
          value: toNumberWithDefault(grainProperties.gmadProperties.age, defaultValues.gmad_properties.age),
          unit: getUnit("gmad", "age")
        },
        {
          name: "Density",
          value: toNumberWithDefault(grainProperties.gmadProperties.density, defaultValues.gmad_properties.density),
          unit: getUnit("gmad", "density")
        }
      ], // Removed filter - always include all properties with defaults
      // Add custom properties if any exist
      ...(grainProperties.customProperties.length > 0 && {
        custom_properties: grainProperties.customProperties.map(prop => ({
          name: prop.name,
          value: toNumberWithDefault(prop.value, 0) !== 0 ? toNumberWithDefault(prop.value, 0) : prop.value,
          unit: prop.unit || null
        }))
      })
    };

    return inputJSON;
  };

  const sendDataToBackend = async () => {
    
    // Configure your backend URL here - backend is running on port 5000
    // In Vite, use import.meta.env instead of process.env and prefix with VITE_
    // const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.0.143:5000';
    const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
    const API_ENDPOINT = `${BACKEND_URL}/api/input/config`;
    
    try {
      const inputJSON = generateInputJSON();
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputJSON),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Step 5: Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      
      // Store the batch ID in session storage for LiveAnalysis to access
      if (data.status === 'success' && data.batch_id) {
        sessionStorage.setItem('current_batch_id', data.batch_id);
        sessionStorage.setItem('current_batch_data', JSON.stringify({
          grain_type: data.grain_type,
          variety: data.variety,
          testing_option: data.testing_option,
          batch_id: data.batch_id
        }));
        console.log('✅ Batch ID stored in session storage:', data.batch_id);
      }
      
      return data;
    } catch (error) {
      console.error('❌ DETAILED ERROR CAUGHT:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // More specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ This is a FETCH ERROR - likely CORS or network issue');
        throw new Error(`Cannot connect to backend at ${API_ENDPOINT}. Is your backend server running?`);
      } else if (error.message.includes('CORS')) {
        console.error('❌ This is a CORS ERROR');
        throw new Error(`CORS error: Backend needs to allow requests from your frontend domain`);
      } else {
        throw error;
      }
    }
  };

  const isGrainFormComplete = Object.values(grainFormData).every(value => value.trim() !== "");
  
  // Check if ALL grain properties are complete (every field must be filled)
  const geoPropertiesComplete = Object.values(grainProperties.geoProperties).every(value => value.trim() !== "");
  const chemicalPropertiesComplete = Object.values(grainProperties.chemicalProperties).every(value => value.trim() !== "");
  const gmadPropertiesComplete = Object.values(grainProperties.gmadProperties).every(value => value.trim() !== "");
  
  // All property categories must be complete
  const isGrainPropertiesComplete = geoPropertiesComplete && chemicalPropertiesComplete && gmadPropertiesComplete;
  
  const isFullConfigurationComplete = isGrainFormComplete && isGrainPropertiesComplete;

  return (
    <GrainContext.Provider value={{
      grainFormData,
      grainProperties,
      updateGrainFormData,
      updateGrainProperties,
      resetGrainData,
      isGrainFormComplete,
      isGrainPropertiesComplete,
      geoPropertiesComplete,
      chemicalPropertiesComplete,
      gmadPropertiesComplete,
      isFullConfigurationComplete,
      isAnalysisRunning,
      setIsAnalysisRunning,
      generateInputJSON,
      sendDataToBackend
    }}>
      {children}
    </GrainContext.Provider>
  );
};

export const useGrain = (): GrainContextType => {
  const context = useContext(GrainContext);
  if (!context) {
    throw new Error('useGrain must be used within a GrainProvider');
  }
  return context;
};