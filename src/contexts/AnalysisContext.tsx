import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnalysisContextType {
  hasStartedAnalysis: boolean;
  setHasStartedAnalysis: (value: boolean) => void;
  seriesExecutionLocked: boolean;
  setSeriesExecutionLocked: (value: boolean) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

interface AnalysisProviderProps {
  children: ReactNode;
}

export const AnalysisProvider: React.FC<AnalysisProviderProps> = ({ children }) => {
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);
  const [seriesExecutionLocked, setSeriesExecutionLocked] = useState(false);

  return (
    <AnalysisContext.Provider value={{
      hasStartedAnalysis, setHasStartedAnalysis,
      seriesExecutionLocked, setSeriesExecutionLocked,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
};
