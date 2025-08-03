import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Calendar, 
  Building, 
  User, 
  DollarSign, 
  Percent,
  Phone,
  Mail,
  MapPin,
  Printer
} from 'lucide-react';
import { formatDate } from 'date-fns';

interface TemplateField {
  name: string;
  label: string;
  type: string;
  options?: string[];
  description?: string;
}

interface FieldGroup {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  fields: TemplateField[];
}

interface DocumentTemplateRendererProps {
  templateData: any;
  documentTitle: string;
  documentId: string;
  createdAt: string;
  status: string;
}

export function DocumentTemplateRenderer({ 
  templateData, 
  documentTitle, 
  documentId,
  createdAt,
  status 
}: DocumentTemplateRendererProps) {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  let parsedData;
  try {
    parsedData = typeof templateData === 'string' ? JSON.parse(templateData) : templateData;
  } catch (error) {
    console.error('Failed to parse template data:', error);
    parsedData = {};
  }

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    if (!parsedData.templateId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', parsedData.templateId)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Warning',
        description: 'Could not load template schema. Displaying basic form data.',
        variant: 'default',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFieldIcon = (type: string, name: string) => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('email')) return <Mail className="h-4 w-4" />;
    if (lowerName.includes('phone')) return <Phone className="h-4 w-4" />;
    if (lowerName.includes('address') || lowerName.includes('location')) return <MapPin className="h-4 w-4" />;
    if (lowerName.includes('company') || lowerName.includes('business')) return <Building className="h-4 w-4" />;
    if (lowerName.includes('date') || type === 'date') return <Calendar className="h-4 w-4" />;
    if (type === 'currency' || lowerName.includes('amount') || lowerName.includes('price')) return <DollarSign className="h-4 w-4" />;
    if (type === 'percentage') return <Percent className="h-4 w-4" />;
    
    return <User className="h-4 w-4" />;
  };

  const formatFieldValue = (field: TemplateField, value: any) => {
    if (!value) return 'Not provided';

    switch (field.type) {
      case 'date':
        try {
          return formatDate(new Date(value), 'MMMM d, yyyy');
        } catch {
          return value;
        }
      case 'currency':
        return `$${parseFloat(value).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
      case 'percentage':
        return `${value}%`;
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : value;
      case 'select':
        return value;
      default:
        return value;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const templateSchema = template?.template_schema || { fieldGroups: [] };
  const fieldGroups: FieldGroup[] = templateSchema.fieldGroups || [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Print Button */}
      <div className="mb-4 print:hidden">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print Document
        </Button>
      </div>

      {/* Document Header */}
      <Card className="mb-6 print:shadow-none">
        <CardHeader className="text-center border-b">
          <div className="space-y-4">
            <div>
              <CardTitle className="text-2xl font-bold text-center mb-2">
                {documentTitle}
              </CardTitle>
              <div className="flex justify-center">
                <Badge className={`${getStatusColor(status)} font-medium`}>
                  {status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2" />
                Document ID: {documentId.slice(0, 8)}...
              </div>
              <div className="flex items-center justify-center">
                <Calendar className="h-4 w-4 mr-2" />
                Created: {formatDate(new Date(createdAt), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center justify-center">
                <User className="h-4 w-4 mr-2" />
                Version: {parsedData.version || 1}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Document Content */}
      <div className="space-y-6">
        {fieldGroups.length > 0 ? (
          fieldGroups.map((group: FieldGroup, groupIndex: number) => (
            <Card key={groupIndex} className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold border-b pb-2">
                  {group.title}
                </CardTitle>
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.fields.map((field: TemplateField, fieldIndex: number) => {
                    const value = parsedData.formData?.[field.name];
                    return (
                      <div key={fieldIndex} className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getFieldIcon(field.type, field.name)}
                          <label className="text-sm font-medium text-muted-foreground">
                            {field.label}
                          </label>
                        </div>
                        <div className="pl-6">
                          <p className="text-base font-medium">
                            {formatFieldValue(field, value)}
                          </p>
                          {field.description && value && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {field.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Fallback for documents without template schema
          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(parsedData.formData || parsedData).map(([key, value]: [string, any]) => {
                  if (key === 'templateId') return null;
                  
                  return (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                      </div>
                      <div className="md:col-span-2 font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value || 'Not provided')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Footer */}
      <Card className="mt-8 print:shadow-none">
        <CardContent className="pt-6">
          <Separator className="mb-4" />
          <div className="text-center text-sm text-muted-foreground">
            <p>This document was generated electronically and contains encrypted data.</p>
            <p className="mt-1">
              Generated on {formatDate(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .print\\:hidden {
              display: none !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            .print\\:border {
              border: 1px solid #e5e7eb !important;
            }
          }
        `
      }} />
    </div>
  );
}