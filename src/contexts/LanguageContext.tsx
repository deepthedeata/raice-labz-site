import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'kn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  en: {
    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.massBalance': 'Mass Balance',
    'nav.knowYourGrains': 'Know Your Grains',
    'nav.analytics': 'Analytics',
    'nav.dataReports': 'Data Reports',
    'nav.grainsViewer': 'Grains Viewer',
    'nav.settings': 'Settings',
    'nav.manuals': 'Manuals',
    'nav.database': 'Database',
    'nav.grainDatabase': 'Grain Database',
    'nav.machineDatabase': 'Machine Database',
    'nav.procurementAnalysis': 'Procurement Analysis',
    'nav.productionAnalysis': 'Production Analysis',
    'nav.milledRiceAnalysis': 'Milled Rice Quality',
    'nav.navigation': 'Navigation',

    // Mass Balance page
    'massBalance.title': 'Mass Balance',
    'massBalance.subtitle': 'Calculate component breakdown from total sample weight',
    'massBalance.machineSelection': 'Machine Selection',
    'massBalance.machineA': 'Machine A',
    'massBalance.machineB': 'Machine B',
    'massBalance.selected': 'Selected',
    'massBalance.machineADesc1': '• High-precision rice analyzer',
    'massBalance.machineADesc2': '• Processing capacity: 100-500g',
    'massBalance.machineADesc3': '• Analysis time: 2-3 minutes',
    'massBalance.machineADesc4': '• Accuracy: ±0.1%',
    'massBalance.machineBDesc1': '• Advanced multi-grain analyzer',
    'massBalance.machineBDesc2': '• Processing capacity: 200-1000g',
    'massBalance.machineBDesc3': '• Analysis time: 1-2 minutes',
    'massBalance.machineBDesc4': '• Accuracy: ±0.05%',
    'massBalance.precisionAnalyzer': 'Precision Analyzer',
    'massBalance.advancedMultiAnalyzer': 'Advanced Multi-Analyzer',
    'massBalance.totalWeightInput': 'Total Sample Weight Input',
    'massBalance.enterTotalWeight': 'Enter Total Weight',
    'massBalance.usingMachine': 'Using Machine',
    'massBalance.forAnalysis': 'for analysis',
    'massBalance.breakdownFormula': 'Breakdown Formula',
    'massBalance.brownRice': 'Brown Rice',
    'massBalance.husk': 'Husk',
    'massBalance.bran': 'Bran',
    'massBalance.paddy': 'Paddy',
    'massBalance.calculatedBreakdown': 'Calculated Breakdown',
    'massBalance.proceedToGrain': 'Proceed to Grain Information',
    
    // Know Your Grains page
    'knowGrains.title': 'Know Your Grains',
    'knowGrains.subtitle': 'Detailed grain properties and parameters',
    'knowGrains.previous': 'Previous',
    'knowGrains.next': 'Next',
    'knowGrains.pageOf': 'Page 1 of 1',
    'knowGrains.grainVisualization': 'Grain Visualization',
    'knowGrains.visualDescription': 'Rice Grain Sample Visualization',
    'knowGrains.visualSubtext': 'Visual representation updates based on entered data',
    'knowGrains.geoProperties': 'Morphological Properties',
    'knowGrains.chemicalProperties': 'Nutritional Properties',
    'knowGrains.gmadProperties': 'GMAD Properties',
    'knowGrains.length': 'Length (mm)',
    'knowGrains.breadth': 'Breadth (mm)',
    'knowGrains.weight': 'Weight (mg)',
    'knowGrains.aspectRatio': 'Aspect Ratio',
    'knowGrains.hardness': 'Hardness (HV)',
    'knowGrains.protein': 'Protein (%)',
    'knowGrains.carbohydrate': 'Carbohydrate (%)',
    'knowGrains.vitamin': 'Vitamin (mg/100g)',
    'knowGrains.mineral': 'Mineral (%)',
    'knowGrains.lipids': 'Lipids (%)',
    'knowGrains.gelatinization': 'Gelatinization Temperature (°C)',
    'knowGrains.moisture': 'Moisture (%)',
    'knowGrains.age': 'Age (Months)',
    'knowGrains.density': 'Density (g/cm³)',
    'knowGrains.addMoreInfo': 'Add More Info',
    'knowGrains.continueToLive': 'Continue to Live Analysis',
    'knowGrains.addProperty': 'Add New Property',
    'knowGrains.propertyName': 'Property Name',
    'knowGrains.propertyValue': 'Property Value',
    'knowGrains.propertyUnit': 'Unit (optional)',
    'knowGrains.cancel': 'Cancel',
    'knowGrains.add': 'Add',
    
    // Settings
    'settings.language': 'Language',
    'settings.hardware': 'Hardware',
    'settings.image': 'Image',
    'settings.reports': 'Reports',
  },
  kn: {
    // Sidebar
    'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'nav.massBalance': 'ದ್ರವ್ಯರಾಶಿ ಸಮತೋಲನ',
    'nav.knowYourGrains': 'ನಿಮ್ಮ ಧಾನ್ಯಗಳನ್ನು ತಿಳಿಯಿರಿ',
    'nav.analytics': 'ವಿಶ್ಲೇಷಣೆಗಳು',
    'nav.dataReports': 'ಡೇಟಾ ವರದಿಗಳು',
    'nav.grainsViewer': 'ಧಾನ್ಯ ವೀಕ್ಷಕ',
    'nav.settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    'nav.manuals': 'ಕೈಪಿಡಿಗಳು',
    'nav.database': 'ಡೇಟಾಬೇಸ್',
    'nav.grainDatabase': 'ಧಾನ್ಯ ಡೇಟಾಬೇಸ್',
    'nav.machineDatabase': 'ಯಂತ್ರ ಡೇಟಾಬೇಸ್',
    'nav.procurementAnalysis': 'ಖರೀದಿ ವಿಶ್ಲೇಷಣೆ',
    'nav.productionAnalysis': 'ಉತ್ಪಾದನಾ ವಿಶ್ಲೇಷಣೆ',
    'nav.milledRiceAnalysis': 'ಮಿಲ್ಡ್ ಅಕ್ಕಿ ಗುಣಮಟ್ಟ',
    'nav.navigation': 'ನ್ಯಾವಿಗೇಶನ್',

    // Mass Balance page
    'massBalance.title': 'ದ್ರವ್ಯರಾಶಿ ಸಮತೋಲನ',
    'massBalance.subtitle': 'ಒಟ್ಟು ಮಾದರಿ ತೂಕದಿಂದ ಘಟಕ ವಿಭಜನೆಯನ್ನು ಲೆಕ್ಕಾಚಾರ ಮಾಡಿ',
    'massBalance.machineSelection': 'ಯಂತ್ರ ಆಯ್ಕೆ',
    'massBalance.machineA': 'ಯಂತ್ರ A',
    'massBalance.machineB': 'ಯಂತ್ರ B',
    'massBalance.selected': 'ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ',
    'massBalance.machineADesc1': '• ಹೆಚ್ಚಿನ ನಿಖರತೆಯ ಅಕ್ಕಿ ವಿಶ್ಲೇಷಕ',
    'massBalance.machineADesc2': '• ಸಂಸ್ಕರಣಾ ಸಾಮರ್ಥ್ಯ: 100-500ಗ್ರಾ',
    'massBalance.machineADesc3': '• ವಿಶ್ಲೇಷಣೆ ಸಮಯ: 2-3 ನಿಮಿಷಗಳು',
    'massBalance.machineADesc4': '• ನಿಖರತೆ: ±0.1%',
    'massBalance.machineBDesc1': '• ಸುಧಾರಿತ ಬಹು-ಧಾನ್ಯ ವಿಶ್ಲೇಷಕ',
    'massBalance.machineBDesc2': '• ಸಂಸ್ಕರಣಾ ಸಾಮರ್ಥ್ಯ: 200-1000ಗ್ರಾ',
    'massBalance.machineBDesc3': '• ವಿಶ್ಲೇಷಣೆ ಸಮಯ: 1-2 ನಿಮಿಷಗಳು',
    'massBalance.machineBDesc4': '• ನಿಖರತೆ: ±0.05%',
    'massBalance.precisionAnalyzer': 'ನಿಖರತೆ ವಿಶ್ಲೇಷಕ',
    'massBalance.advancedMultiAnalyzer': 'ಸುಧಾರಿತ ಬಹು-ವಿಶ್ಲೇಷಕ',
    'massBalance.totalWeightInput': 'ಒಟ್ಟು ಮಾದರಿ ತೂಕ ಇನ್‌ಪುಟ್',
    'massBalance.enterTotalWeight': 'ಒಟ್ಟು ತೂಕವನ್ನು ನಮೂದಿಸಿ',
    'massBalance.usingMachine': 'ಯಂತ್ರ ಬಳಸುತ್ತಿದೆ',
    'massBalance.forAnalysis': 'ವಿಶ್ಲೇಷಣೆಗಾಗಿ',
    'massBalance.breakdownFormula': 'ವಿಭಜನೆ ಸೂತ್ರ',
    'massBalance.brownRice': 'ಕಂದು ಅಕ್ಕಿ',
    'massBalance.husk': 'ಹೊಟ್ಟು',
    'massBalance.bran': 'ಹೊಟ್ಟೆ',
    'massBalance.paddy': 'ಧಾನ್ಯ',
    'massBalance.calculatedBreakdown': 'ಲೆಕ್ಕಾಚಾರದ ವಿಭಜನೆ',
    'massBalance.proceedToGrain': 'ಧಾನ್ಯ ಮಾಹಿತಿಗೆ ಮುಂದುವರಿಯಿರಿ',
    
    // Know Your Grains page
    'knowGrains.title': 'ನಿಮ್ಮ ಧಾನ್ಯಗಳನ್ನು ತಿಳಿಯಿರಿ',
    'knowGrains.subtitle': 'ವಿವರವಾದ ಧಾನ್ಯ ಗುಣಲಕ್ಷಣಗಳು ಮತ್ತು ನಿಯತಾಂಕಗಳು',
    'knowGrains.previous': 'ಹಿಂದಿನ',
    'knowGrains.next': 'ಮುಂದಿನ',
    'knowGrains.pageOf': 'ಪುಟ 1 ರ 1',
    'knowGrains.grainVisualization': 'ಧಾನ್ಯ ದೃಶ್ಯೀಕರಣ',
    'knowGrains.visualDescription': 'ಅಕ್ಕಿ ಧಾನ್ಯ ಮಾದರಿ ದೃಶ್ಯೀಕರಣ',
    'knowGrains.visualSubtext': 'ನಮೂದಿಸಿದ ಡೇಟಾದ ಆಧಾರದ ಮೇಲೆ ದೃಶ್ಯ ಪ್ರಾತಿನಿಧ್ಯ ನವೀಕರಣಗೊಳ್ಳುತ್ತದೆ',
    'knowGrains.geoProperties': 'ಭೌಗೋಳಿಕ ಗುಣಲಕ್ಷಣಗಳು',
    'knowGrains.chemicalProperties': 'ರಾಸಾಯನಿಕ ಗುಣಲಕ್ಷಣಗಳು',
    'knowGrains.gmadProperties': 'ಜಿಮ್ಯಾಡ್ ಗುಣಲಕ್ಷಣಗಳು',
    'knowGrains.length': 'ಉದ್ದ (ಮಿಮೀ)',
    'knowGrains.breadth': 'ಅಗಲ (ಮಿಮೀ)',
    'knowGrains.weight': 'ತೂಕ (ಮಿಗ್ರಾ)',
    'knowGrains.aspectRatio': 'ಆಕಾರ ಅನುಪಾತ',
    'knowGrains.hardness': 'ಗಡಸುತನ (HV)',
    'knowGrains.protein': 'ಪ್ರೋಟೀನ್ (%)',
    'knowGrains.carbohydrate': 'ಕಾರ್ಬೋಹೈಡ್ರೇಟ್ (%)',
    'knowGrains.vitamin': 'ವಿಟಮಿನ್ (ಮಿಗ್ರಾ/100ಗ್ರಾ)',
    'knowGrains.mineral': 'ಖನಿಜ (%)',
    'knowGrains.lipids': 'ಲಿಪಿಡ್‌ಗಳು (%)',
    'knowGrains.gelatinization': 'ಜೆಲಟಿನೀಕರಣ ತಾಪಮಾನ (°C)',
    'knowGrains.moisture': 'ತೇವಾಂಶ (%)',
    'knowGrains.age': 'ವಯಸ್ಸು (ತಿಂಗಳುಗಳು)',
    'knowGrains.density': 'ಸಾಂದ್ರತೆ (ಗ್ರಾ/ಸೆಮೀ³)',
    'knowGrains.addMoreInfo': 'ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಸೇರಿಸಿ',
    'knowGrains.continueToLive': 'ನೇರ ವಿಶ್ಲೇಷಣೆಗೆ ಮುಂದುವರಿಯಿರಿ',
    'knowGrains.addProperty': 'ಹೊಸ ಗುಣಲಕ್ಷಣ ಸೇರಿಸಿ',
    'knowGrains.propertyName': 'ಗುಣಲಕ್ಷಣದ ಹೆಸರು',
    'knowGrains.propertyValue': 'ಗುಣಲಕ್ಷಣದ ಮೌಲ್ಯ',
    'knowGrains.propertyUnit': 'ಘಟಕ (ಐಚ್ಛಿಕ)',
    'knowGrains.cancel': 'ರದ್ದುಮಾಡಿ',
    'knowGrains.add': 'ಸೇರಿಸಿ',
    
    // Settings
    'settings.language': 'ಭಾಷೆ',
    'settings.hardware': 'ಹಾರ್ಡ್‌ವೇರ್',
    'settings.image': 'ಚಿತ್ರ',
    'settings.reports': 'ವರದಿಗಳು',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 