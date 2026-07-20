import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Database, Cpu } from "lucide-react";
import GrainDatabase from "./GrainDatabase";
import MachineDatabase from "./MachineDatabase";

const DatabasePage = () => {
  const [activeTab, setActiveTab] = useState("grain");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Database"
        subtitle="Manage grain and machine information"
      />

      <div className="flex-1 overflow-hidden px-6 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grain" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Grain Database</span>
            </TabsTrigger>
            <TabsTrigger value="machine" className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>Machine Database</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grain" className="flex-1 overflow-hidden mt-2">
            <GrainDatabase embedded />
          </TabsContent>
          <TabsContent value="machine" className="flex-1 overflow-hidden mt-2">
            <MachineDatabase embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DatabasePage;
