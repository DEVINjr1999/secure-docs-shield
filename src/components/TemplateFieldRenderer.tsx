import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HelpCircle, Info, Star } from "lucide-react";

// Smart value suggestions datasets
const VALUE_SUGGESTIONS = {
  jobTitles: [
    "Chief Executive Officer", "Chief Technology Officer", "Chief Financial Officer",
    "President", "Vice President", "Director", "Manager", "Senior Manager",
    "Attorney", "Senior Attorney", "Partner", "Associate", "Paralegal",
    "Legal Counsel", "General Counsel", "Corporate Secretary",
    "Consultant", "Senior Consultant", "Advisor", "Specialist",
    "Analyst", "Senior Analyst", "Coordinator", "Administrator"
  ],
  businessTypes: [
    "Corporation", "LLC", "Partnership", "Sole Proprietorship",
    "Non-Profit Organization", "Professional Corporation", "Limited Partnership"
  ],
  states: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"
  ],
  industries: [
    "Technology", "Healthcare", "Finance", "Legal Services", "Manufacturing",
    "Retail", "Real Estate", "Construction", "Education", "Government",
    "Non-Profit", "Entertainment", "Transportation", "Energy", "Agriculture"
  ]
};

// Enhanced field hints and help content
const FIELD_HINTS = {
  email: {
    hint: "Enter a valid email address (e.g., john@company.com)",
    help: "This should be a business email address that can receive legal documents and communications.",
    format: "Format: username@domain.com"
  },
  phone: {
    hint: "Enter phone number with area code",
    help: "Include country code if international. This number may be used for urgent legal matters.",
    format: "Format: (555) 123-4567 or +1-555-123-4567"
  },
  date: {
    hint: "Select or enter date (MM/DD/YYYY)",
    help: "Use the calendar picker or type the date directly. Future dates are allowed for agreements.",
    format: "Format: MM/DD/YYYY"
  },
  currency: {
    hint: "Enter amount without currency symbol",
    help: "Enter numbers only. Currency symbol will be added automatically based on jurisdiction.",
    format: "Format: 1000000 (for $1,000,000)"
  },
  percentage: {
    hint: "Enter as whole number (e.g., 15 for 15%)",
    help: "Enter the percentage as a whole number. The % symbol will be added automatically.",
    format: "Format: 15 (represents 15%)"
  }
};

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

interface TemplateFieldRendererProps {
  field: TemplateField;
  form: UseFormReturn<any>;
  groupName?: string;
}

const getSmartSuggestions = (fieldName: string, fieldType: string, suggestions?: string): string[] => {
  const lowerName = fieldName.toLowerCase();
  
  if (suggestions && VALUE_SUGGESTIONS[suggestions as keyof typeof VALUE_SUGGESTIONS]) {
    return VALUE_SUGGESTIONS[suggestions as keyof typeof VALUE_SUGGESTIONS];
  }
  
  // Auto-detect based on field name
  if (lowerName.includes('job') || lowerName.includes('title') || lowerName.includes('position')) {
    return VALUE_SUGGESTIONS.jobTitles;
  }
  if (lowerName.includes('state') || lowerName.includes('jurisdiction')) {
    return VALUE_SUGGESTIONS.states;
  }
  if (lowerName.includes('business') || lowerName.includes('entity') || lowerName.includes('company')) {
    return VALUE_SUGGESTIONS.businessTypes;
  }
  if (lowerName.includes('industry') || lowerName.includes('sector')) {
    return VALUE_SUGGESTIONS.industries;
  }
  
  return [];
};

const getFieldHint = (fieldType: string, fieldName: string): { hint: string; help: string; format?: string } => {
  const lowerName = fieldName.toLowerCase();
  
  if (lowerName.includes('email')) return FIELD_HINTS.email;
  if (lowerName.includes('phone')) return FIELD_HINTS.phone;
  if (lowerName.includes('date')) return FIELD_HINTS.date;
  if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('salary')) return FIELD_HINTS.currency;
  if (lowerName.includes('percent') || lowerName.includes('rate')) return FIELD_HINTS.percentage;
  
  return {
    hint: `Enter ${fieldName.toLowerCase()}`,
    help: `Provide the required information for ${fieldName.toLowerCase()}. This field is ${fieldType === 'required' ? 'required' : 'optional'}.`
  };
};

export const TemplateFieldRenderer: React.FC<TemplateFieldRendererProps> = ({ field, form, groupName }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const fieldHint = getFieldHint(field.type, field.name);
  const smartSuggestions = getSmartSuggestions(field.name, field.type, field.suggestions);
  
  // Check conditional rendering
  if (field.conditional) {
    const conditionalValue = form.watch(field.conditional.field);
    if (conditionalValue !== field.conditional.value) {
      return null;
    }
  }

  const renderFieldByType = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder || fieldHint.hint}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            {...form.register(field.name)}
          />
        );
        
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder || fieldHint.hint}
            className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            {...form.register(field.name)}
          />
        );
        
      case 'select':
        const options = smartSuggestions.length > 0 ? smartSuggestions : (field.options || []);
        const filteredOptions = searchTerm 
          ? options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()))
          : options;
          
        return (
          <div className="space-y-2">
            <Select onValueChange={(value) => form.setValue(field.name, value)}>
              <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {smartSuggestions.length > 10 && (
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search options..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                    />
                  </div>
                )}
                {filteredOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {smartSuggestions.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3" />
                <span>Smart suggestions enabled</span>
              </div>
            )}
          </div>
        );
        
      case 'number':
        return (
          <Input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step || 1}
            placeholder={field.placeholder || fieldHint.hint}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            {...form.register(field.name, { valueAsNumber: true })}
          />
        );
        
      case 'range':
        const currentValue = form.watch(field.name) || field.min || 0;
        return (
          <div className="space-y-4">
            <div className="px-3">
              <Slider
                value={[currentValue]}
                onValueChange={(value) => form.setValue(field.name, value[0])}
                min={field.min || 0}
                max={field.max || 100}
                step={field.step || 1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{field.min || 0}</span>
              <Badge variant="secondary" className="px-3 py-1">
                {currentValue}
              </Badge>
              <span>{field.max || 100}</span>
            </div>
          </div>
        );
        
      case 'date':
        return (
          <Input
            type="date"
            placeholder={field.placeholder || fieldHint.hint}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            {...form.register(field.name)}
          />
        );
        
      default:
        return (
          <Input
            placeholder={field.placeholder || fieldHint.hint}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            {...form.register(field.name)}
          />
        );
    }
  };

  return (
    <TooltipProvider>
      <FormField
        control={form.control}
        name={field.name}
        rules={{ required: field.required ? `${field.label} is required` : false }}
        render={({ field: formField }) => (
          <FormItem className="space-y-3">
            <div className="flex items-center gap-2">
              <FormLabel className="flex items-center gap-2">
                {field.label}
                {field.required && (
                  <span className="text-destructive text-sm">*</span>
                )}
              </FormLabel>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4 space-y-2">
                  <div className="font-medium">{field.label}</div>
                  <div className="text-sm">{fieldHint.help}</div>
                  {fieldHint.format && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      {fieldHint.format}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
            
            <FormControl>
              {renderFieldByType()}
            </FormControl>
            
            {(field.description || fieldHint.hint) && (
              <FormDescription className="flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{field.description || fieldHint.hint}</span>
              </FormDescription>
            )}
            
            <FormMessage />
          </FormItem>
        )}
      />
    </TooltipProvider>
  );
};