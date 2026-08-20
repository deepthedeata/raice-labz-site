
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Monitor, Camera, Database, Users, Shield, Cog } from "lucide-react";

const LoadConfigurations = () => {
  const [language, setLanguage] = useState("english");
  const [cameraResolution, setCameraResolution] = useState("1920x1080");
  const [autoSave, setAutoSave] = useState(true);
  const [realTimeProcessing, setRealTimeProcessing] = useState(true);

  const handleSaveSettings = () => {
    console.log("Saving configuration settings");
    // Here would be the actual save logic
  };

  const handleCancelSettings = () => {
    console.log("Canceling configuration changes");
    // Here would be the reset logic
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader 
        title="Load Configurations" 
        subtitle="System configuration and technical settings"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="hardware" className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-8">
              <TabsTrigger value="hardware" className="flex items-center space-x-2">
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">Hardware</span>
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center space-x-2">
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Image</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">Database</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center space-x-2">
                <Cog className="w-4 h-4" />
                <span className="hidden sm:inline">Advanced</span>
              </TabsTrigger>
            </TabsList>

            {/* Hardware Settings */}
            <TabsContent value="hardware">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-rice-primary">
                    <Monitor className="w-6 h-6" />
                    <span>Hardware Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="camera-port">Camera Port</Label>
                        <Select defaultValue="usb1">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usb1">USB Port 1</SelectItem>
                            <SelectItem value="usb2">USB Port 2</SelectItem>
                            <SelectItem value="ethernet">Ethernet Camera</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lighting">Lighting Control</Label>
                        <Select defaultValue="auto">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-calibration">Auto Calibration</Label>
                        <Switch id="auto-calibration" defaultChecked />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="conveyor-speed">Conveyor Speed (mm/s)</Label>
                        <Input
                          id="conveyor-speed"
                          type="number"
                          placeholder="150"
                          defaultValue="150"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sensor-sensitivity">Sensor Sensitivity</Label>
                        <Select defaultValue="high">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="vibration-damping">Vibration Damping</Label>
                        <Switch id="vibration-damping" defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Image Settings */}
            <TabsContent value="image">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-rice-primary">
                    <Camera className="w-6 h-6" />
                    <span>Image Processing Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="resolution">Camera Resolution</Label>
                        <Select value={cameraResolution} onValueChange={setCameraResolution}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                            <SelectItem value="1920x1080">1920x1080 (FHD)</SelectItem>
                            <SelectItem value="2560x1440">2560x1440 (QHD)</SelectItem>
                            <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fps">Frame Rate (FPS)</Label>
                        <Select defaultValue="30">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 FPS</SelectItem>
                            <SelectItem value="30">30 FPS</SelectItem>
                            <SelectItem value="60">60 FPS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="brightness">Brightness</Label>
                        <Input
                          id="brightness"
                          type="range"
                          min="0"
                          max="100"
                          defaultValue="50"
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="contrast">Contrast</Label>
                        <Input
                          id="contrast"
                          type="range"
                          min="0"
                          max="100"
                          defaultValue="50"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="saturation">Saturation</Label>
                        <Input
                          id="saturation"
                          type="range"
                          min="0"
                          max="100"
                          defaultValue="50"
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="real-time-processing">Real-time Processing</Label>
                        <Switch 
                          id="real-time-processing" 
                          checked={realTimeProcessing}
                          onCheckedChange={setRealTimeProcessing}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Information and Reports */}
            <TabsContent value="reports">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-rice-primary">
                    <Settings className="w-6 h-6" />
                    <span>Information and Reports</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="language-select">Language</Label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">English (EN)</SelectItem>
                            <SelectItem value="kannada">Kannada (KA)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="report-format">Default Report Format</Label>
                        <Select defaultValue="pdf">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-save-reports">Auto Save Reports</Label>
                        <Switch 
                          id="auto-save-reports" 
                          checked={autoSave}
                          onCheckedChange={setAutoSave}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input
                          id="company-name"
                          placeholder="Rice Mill Private Limited"
                          defaultValue="Rice Mill Private Limited"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="report-logo">Report Logo Path</Label>
                        <Input
                          id="report-logo"
                          placeholder="/images/company-logo.png"
                          defaultValue="/images/company-logo.png"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="include-charts">Include Charts in Reports</Label>
                        <Switch id="include-charts" defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Database Settings */}
            <TabsContent value="database">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-rice-primary">
                    <Database className="w-6 h-6" />
                    <span>Database Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="db-host">Database Host</Label>
                        <Input
                          id="db-host"
                          placeholder="192.168.0.143"
                          defaultValue="192.168.0.143"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="db-port">Database Port</Label>
                        <Input
                          id="db-port"
                          type="number"
                          placeholder="5432"
                          defaultValue="5432"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="db-name">Database Name</Label>
                        <Input
                          id="db-name"
                          placeholder="rice_doctor"
                          defaultValue="rice_doctor"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="backup-frequency">Backup Frequency</Label>
                        <Select defaultValue="daily">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="retention-period">Data Retention (days)</Label>
                        <Input
                          id="retention-period"
                          type="number"
                          placeholder="365"
                          defaultValue="365"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-backup">Auto Backup</Label>
                        <Switch id="auto-backup" defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users and Security */}
            <TabsContent value="users">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-rice-primary">
                    <Users className="w-6 h-6" />
                    <span>Users and Security</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center text-gray-600">
                      <p>User management and security features will be available in future releases.</p>
                      <p className="text-sm mt-2">Current version operates in single-user mode.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security */}
            <TabsContent value="security">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-rice-primary">
                    <Shield className="w-6 h-6" />
                    <span>Security Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center text-gray-600">
                      <p>Advanced security features will be available in future releases.</p>
                      <p className="text-sm mt-2">Current version includes basic data protection.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-rice-primary">
                    <Cog className="w-6 h-6" />
                    <span>Advanced Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="processing-threads">Processing Threads</Label>
                        <Select defaultValue="4">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Threads</SelectItem>
                            <SelectItem value="4">4 Threads</SelectItem>
                            <SelectItem value="8">8 Threads</SelectItem>
                            <SelectItem value="auto">Auto Detect</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="memory-usage">Max Memory Usage (MB)</Label>
                        <Input
                          id="memory-usage"
                          type="number"
                          placeholder="2048"
                          defaultValue="2048"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="debug-mode">Debug Mode</Label>
                        <Switch id="debug-mode" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="log-level">Log Level</Label>
                        <Select defaultValue="info">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="error">Error</SelectItem>
                            <SelectItem value="warn">Warning</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="debug">Debug</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cache-size">Cache Size (MB)</Label>
                        <Input
                          id="cache-size"
                          type="number"
                          placeholder="512"
                          defaultValue="512"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="performance-mode">Performance Mode</Label>
                        <Switch id="performance-mode" defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <Button 
              onClick={handleCancelSettings}
              variant="outline"
              className="px-8 py-3"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSettings}
              className="bg-rice-secondary text-rice-primary hover:bg-rice-secondary/90 px-8 py-3 font-bold"
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadConfigurations;
