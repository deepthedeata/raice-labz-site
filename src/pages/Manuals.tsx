
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, ExternalLink, FileText, Video, HelpCircle } from "lucide-react";

const Manuals = () => {
  const manualSections = [
    {
      title: "Quick Start Guide",
      description: "Get started with RAICE LABZ in minutes",
      icon: BookOpen,
      type: "PDF",
      size: "2.1 MB",
      pages: "12 pages"
    },
    {
      title: "Hardware Setup Manual",
      description: "Complete guide for camera and sensor installation",
      icon: FileText,
      type: "PDF",
      size: "5.8 MB",
      pages: "45 pages"
    },
    {
      title: "Software Configuration Guide",
      description: "Detailed software setup and configuration instructions",
      icon: FileText,
      type: "PDF",
      size: "3.2 MB",
      pages: "28 pages"
    },
    {
      title: "Operation Manual",
      description: "Day-to-day operation procedures and best practices",
      icon: BookOpen,
      type: "PDF",
      size: "7.4 MB",
      pages: "68 pages"
    },
    {
      title: "Video Tutorial - Basic Setup",
      description: "Step-by-step video guide for initial setup",
      icon: Video,
      type: "MP4",
      size: "125 MB",
      duration: "15 minutes"
    },
    {
      title: "Video Tutorial - Advanced Features",
      description: "Advanced features and troubleshooting",
      icon: Video,
      type: "MP4",
      size: "98 MB",
      duration: "12 minutes"
    },
    {
      title: "Troubleshooting Guide",
      description: "Common issues and their solutions",
      icon: HelpCircle,
      type: "PDF",
      size: "2.9 MB",
      pages: "24 pages"
    },
    {
      title: "API Documentation",
      description: "Technical documentation for developers",
      icon: FileText,
      type: "HTML",
      size: "1.2 MB",
      external: true
    }
  ];

  const handleDownload = (title: string) => {
    console.log(`Downloading: ${title}`);
    // Here would be the actual download logic
  };

  const handleExternalLink = (title: string) => {
    console.log(`Opening external link for: ${title}`);
    // Here would be the external link logic
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader 
        title="Manuals & Documentation" 
        subtitle="Complete documentation and video tutorials"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Introduction */}
          <Card className="animate-fade-in">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-rice-primary mb-4">Welcome to RAICE LABZ Documentation</h2>
                <p className="text-gray-600 max-w-3xl mx-auto">
                  Access comprehensive guides, tutorials, and documentation to help you get the most out of your RAICE LABZ system. 
                  From initial setup to advanced features, we've got you covered.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Manual Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manualSections.map((manual, index) => (
              <Card 
                key={index} 
                className="animate-fade-in hover:shadow-lg transition-all duration-200 hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-rice-primary">
                    <div className="w-10 h-10 bg-rice-primary/10 rounded-lg flex items-center justify-center">
                      <manual.icon className="w-5 h-5 text-rice-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{manual.title}</div>
                      <div className="text-xs text-gray-500 font-normal">{manual.type}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">{manual.description}</p>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Size: {manual.size}</span>
                      <span>
                        {manual.pages && manual.pages}
                        {manual.duration && manual.duration}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      {manual.external ? (
                        <Button
                          onClick={() => handleExternalLink(manual.title)}
                          className="flex-1 bg-rice-secondary text-rice-primary hover:bg-rice-secondary/90"
                          size="sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleDownload(manual.title)}
                          className="flex-1 bg-rice-secondary text-rice-primary hover:bg-rice-secondary/90"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Support Information */}
          <Card className="animate-fade-in" style={{ animationDelay: "800ms" }}>
            <CardHeader>
              <CardTitle className="text-rice-primary">Need Additional Support?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Technical Support:</span>
                      <p>support@apit.com</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Phone:</span>
                      <p>+91 (XXX) XXX-XXXX</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Business Hours:</span>
                      <p>Monday - Friday, 9:00 AM - 6:00 PM IST</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Online Resources</h3>
                  <div className="space-y-2 text-sm">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Knowledge Base
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Community Forum
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Video Library
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="animate-fade-in" style={{ animationDelay: "900ms" }}>
            <CardHeader>
              <CardTitle className="text-rice-primary">System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Software Version:</span>
                  <p className="font-medium">RAICE LABZ v2.1.0</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Build Date:</span>
                  <p className="font-medium">June 2024</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">License:</span>
                  <p className="font-medium">Commercial</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Developed by:</span>
                  <p className="font-medium">APIT</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Manuals;