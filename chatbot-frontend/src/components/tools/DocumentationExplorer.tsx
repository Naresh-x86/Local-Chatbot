import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from '../ChatHeader';
import { BookOpen, Search, ChevronRight, File, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const DocumentationExplorer: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const documentationSections = [
    {
      title: 'Introduction',
      items: [
        { name: 'About Radar Systems', type: 'file' },
        { name: 'Safety Guidelines', type: 'file' },
        { name: 'Technician Responsibilities', type: 'file' }
      ]
    },
    {
      title: 'Installation & Setup',
      items: [
        { name: 'Site Preparation', type: 'file' },
        { name: 'Mounting Procedures', type: 'file' },
        { name: 'Power & Grounding', type: 'file' },
        { name: 'Initial Calibration', type: 'file' }
      ]
    },
    {
      title: 'Operation Manual',
      items: [
        { name: 'System Overview', type: 'file' },
        { name: 'Control Panel Functions', type: 'file' },
        { name: 'Routine Operation Checklist', type: 'file' },
        { name: 'Data Interpretation', type: 'file' }
      ]
    },
    {
      title: 'Maintenance',
      items: [
        { name: 'Scheduled Maintenance', type: 'file' },
        { name: 'Cleaning Procedures', type: 'file' },
        { name: 'Firmware Updates', type: 'file' },
        { name: 'Component Replacement', type: 'folder', items: [
          { name: 'Antenna Replacement', type: 'file' },
          { name: 'Transmitter/Receiver Swap', type: 'file' },
          { name: 'Display Module', type: 'file' }
        ]}
      ]
    },
    {
      title: 'Troubleshooting',
      items: [
        { name: 'Common Issues', type: 'file' },
        { name: 'Error Codes', type: 'file' },
        { name: 'Diagnostic Tools', type: 'file' },
        { name: 'Remote Support', type: 'file' }
      ]
    },
    {
      title: 'Technical Reference',
      items: [
        { name: 'Wiring Diagrams', type: 'file' },
        { name: 'Signal Flowcharts', type: 'file' },
        { name: 'Parts List', type: 'file' },
        { name: 'Specifications', type: 'file' }
      ]
    },
    {
      title: 'Compliance & Documentation',
      items: [
        { name: 'Regulatory Standards', type: 'file' },
        { name: 'Inspection Checklists', type: 'file' },
        { name: 'Service Logs', type: 'file' }
      ]
    }
  ];

  // Helper function to recursively filter items by search query
  const filterItems = (items: any[], query: string) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items
      .map(item => {
        if (item.type === 'folder' && item.items) {
          const filteredSub = filterItems(item.items, query);
          if (filteredSub.length > 0 || item.name.toLowerCase().includes(lowerQuery)) {
            return { ...item, items: filteredSub };
          }
        } else if (item.name.toLowerCase().includes(lowerQuery)) {
          return item;
        }
        return null;
      })
      .filter(Boolean);
  };

  // Filter sections and items based on search query
  const filteredSections = documentationSections
    .map(section => {
      const filteredItems = filterItems(section.items, searchQuery);
      if (filteredItems.length > 0 || section.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return { ...section, items: filteredItems };
      }
      return null;
    })
    .filter(Boolean);

  const renderItem = (item: any, depth = 0) => {
    const Icon = item.type === 'folder' ? FolderOpen : File;
    
    return (
      <div key={item.name}>
        <button
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors",
            theme === 'dark' 
              ? "hover:bg-neutral-800 text-neutral-200" 
              : "hover:bg-gray-100 text-gray-700",
            depth > 0 && "ml-4"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{item.name}</span>
          {item.type === 'folder' && <ChevronRight className="h-4 w-4 ml-auto" />}
        </button>
        {item.items?.map((subItem: any) => renderItem(subItem, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "p-6 border-b",
          theme === 'dark' ? "border-neutral-800" : "border-neutral-200"
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className={theme === 'dark' ? "h-5 w-5 text-neutral-200" : "h-5 w-5 text-gray-700"} />
          <h2 className={theme === 'dark' ? "text-lg font-semibold text-neutral-200" : "text-lg font-semibold text-gray-900"}>
            Documentation
          </h2>
        </div>

        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4",
            theme === 'dark' ? "text-neutral-400" : "text-gray-400"
          )} />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-9",
              theme === 'dark' 
                ? "bg-neutral-800 border-neutral-700 text-neutral-200" 
                : "bg-white border-gray-200"
            )}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-4">
          {(searchQuery ? filteredSections : documentationSections).map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className={cn(
                "px-4 mb-2 text-xs font-semibold uppercase tracking-wider",
                theme === 'dark' ? "text-neutral-400" : "text-gray-500"
              )}>
                {section.title}
              </h3>
              {section.items.length > 0
                ? section.items.map(item => renderItem(item))
                : (
                  <div className="px-4 text-sm text-gray-400">
                    No results found.
                  </div>
                )
              }
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DocumentationExplorer;
