import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MachineContextType {
  machines: string[];
  lineOutput: string;
  setMachines: (machines: string[]) => void;
  setLineOutput: (output: string) => void;
  addMachine: (machine: string) => void;
  updateMachine: (index: number, machine: string) => void;
  deleteMachine: (index: number) => void;
}

const MachineContext = createContext<MachineContextType | undefined>(undefined);

// Default machine list
export const DEFAULT_MACHINE_OPTIONS = [
  "CLEAN - I",
  "TRAY SEPARATOR", 
  "WHITENER 1",
  "WHITENER 2",
  "WHITENER 3",
  "SILKY 1",
  "SILKY 2",
  "LENGTH GRADER",
  "COLOUR SORTER"
];
const defaultMachines = [...DEFAULT_MACHINE_OPTIONS];

interface MachineProviderProps {
  children: ReactNode;
}

export const MachineProvider: React.FC<MachineProviderProps> = ({ children }) => {
  const [machines, setMachines] = useState<string[]>(defaultMachines);
  const [lineOutput, setLineOutput] = useState<string>("10");

  const addMachine = (machine: string) => {
    if (machine.trim() && !machines.includes(machine.trim())) {
      setMachines(prev => [...prev, machine.trim()]);
    }
  };

  const updateMachine = (index: number, machine: string) => {
    if (machine.trim() && index >= 0 && index < machines.length) {
      setMachines(prev => {
        const updated = [...prev];
        updated[index] = machine.trim();
        return updated;
      });
    }
  };

  const deleteMachine = (index: number) => {
    if (index >= 0 && index < machines.length) {
      setMachines(prev => prev.filter((_, i) => i !== index));
    }
  };

  const value: MachineContextType = {
    machines,
    lineOutput,
    setMachines,
    setLineOutput,
    addMachine,
    updateMachine,
    deleteMachine
  };

  return (
    <MachineContext.Provider value={value}>
      {children}
    </MachineContext.Provider>
  );
};

export const useMachine = (): MachineContextType => {
  const context = useContext(MachineContext);
  if (!context) {
    throw new Error('useMachine must be used within a MachineProvider');
  }
  return context;
};