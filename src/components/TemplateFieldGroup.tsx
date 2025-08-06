import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TemplateFieldRenderer } from "./TemplateFieldRenderer";
import { HelpTooltip, helpContent } from "@/components/HelpTooltip";
import { Users, Building, FileText, Settings, Calendar, DollarSign } from "lucide-react";

interface TemplateField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  suggestions?: string;
  group?: string;
  conditional?: {
    field: string;
    value: any;
  };
}

interface FieldGroup {
  name: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: TemplateField[];
}

interface TemplateFieldGroupProps {
  group: FieldGroup;
  form: UseFormReturn<any>;
  isExpanded: boolean;
  onToggle: () => void;
}

const getGroupIcon = (groupName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'personal': <Users className="h-5 w-5" />,
    'company': <Building className="h-5 w-5" />,
    'document': <FileText className="h-5 w-5" />,
    'financial': <DollarSign className="h-5 w-5" />,
    'dates': <Calendar className="h-5 w-5" />,
    'settings': <Settings className="h-5 w-5" />,
  };
  
  return iconMap[groupName.toLowerCase()] || <FileText className="h-5 w-5" />;
};

const getGroupHelpContent = (groupName: string) => {
  switch (groupName.toLowerCase()) {
    case 'personal': return helpContent.personalInfo;
    case 'company': return helpContent.companyInfo;
    case 'financial': return helpContent.financialInfo;
    case 'dates': return helpContent.dateFields;
    default: return "Fill in all required fields in this section to complete your document.";
  }
};

export const TemplateFieldGroup: React.FC<TemplateFieldGroupProps> = ({ 
  group, 
  form, 
  isExpanded, 
  onToggle 
}) => {
  // Calculate completion percentage
  const watchedValues = form.watch();
  const requiredFields = group.fields.filter(field => field.required);
  const completedRequired = requiredFields.filter(field => {
    const value = watchedValues[field.name];
    return value && value.toString().trim() !== '';
  });
  const optionalFields = group.fields.filter(field => !field.required);
  const completedOptional = optionalFields.filter(field => {
    const value = watchedValues[field.name];
    return value && value.toString().trim() !== '';
  });
  
  const requiredProgress = requiredFields.length > 0 ? (completedRequired.length / requiredFields.length) * 100 : 100;
  const totalProgress = group.fields.length > 0 ? ((completedRequired.length + completedOptional.length) / group.fields.length) * 100 : 100;
  
  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-gray-300";
  };

  return (
    <Card className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20' : 'hover:shadow-md'}`}>
      <CardHeader 
        className="cursor-pointer transition-colors hover:bg-muted/50" 
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {getGroupIcon(group.name)}
            </div>
            <div className="flex items-center gap-2">
              <div>
                <CardTitle className="text-lg">{group.title}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {group.description}
                </CardDescription>
              </div>
              <HelpTooltip 
                content={getGroupHelpContent(group.name)}
                title={`${group.title} Tips`}
                triggerClassName="text-muted-foreground/70 hover:text-muted-foreground"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={requiredProgress === 100 ? "default" : "secondary"} className="text-xs">
                  {completedRequired.length}/{requiredFields.length} Required
                </Badge>
                {optionalFields.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {completedOptional.length}/{optionalFields.length} Optional
                  </Badge>
                )}
              </div>
              <Progress 
                value={totalProgress} 
                className={`w-24 h-2 ${getProgressColor(totalProgress)}`}
              />
            </div>
            
            <div className="text-2xl text-muted-foreground transition-transform duration-300">
              {isExpanded ? '−' : '+'}
            </div>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-6 pt-6 border-t animate-in slide-in-from-top-2 duration-300">
          {group.fields.map((field) => (
            <div key={field.name} className="relative">
              <TemplateFieldRenderer 
                field={field} 
                form={form} 
                groupName={group.name}
              />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
};