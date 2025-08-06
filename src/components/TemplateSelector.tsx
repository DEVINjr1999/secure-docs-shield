import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HelpTooltip, helpContent } from '@/components/HelpTooltip';
import { FileText, ArrowRight, Loader2, Upload, RefreshCw } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  document_type: string;
  jurisdiction: string;
  template_schema: any;
}

export default function TemplateSelector() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Could not load document templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    navigate(`/app/upload?template=${templateId}&type=template`);
  };

  const formatDocumentType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatJurisdiction = (jurisdiction: string) => {
    return jurisdiction?.replace('_', ' ').toUpperCase() || 'N/A';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="h-8 bg-muted rounded w-64 mx-auto animate-pulse" />
          <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse" />
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-10 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-xl font-semibold mb-2">No Templates Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Document templates are currently unavailable. This might be temporary - please try again later, 
              or contact support if the issue persists.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Templates
          </Button>
          <Button onClick={() => navigate('/app/upload')}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Custom Document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Templates Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg line-clamp-2">
                    {template.name}
                  </CardTitle>
                  <HelpTooltip 
                    content={helpContent.templateSelection}
                    title="Template Selection Tips"
                    triggerClassName="flex-shrink-0"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {formatDocumentType(template.document_type)}
                  </Badge>
                  {template.jurisdiction && (
                    <Badge variant="outline" className="text-xs">
                      {formatJurisdiction(template.jurisdiction)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <CardDescription className="flex-1 text-sm mb-4 line-clamp-3">
                {template.description}
              </CardDescription>
              <Button 
                onClick={() => handleTemplateSelect(template.id)}
                className="w-full mt-auto"
                size="sm"
              >
                <FileText className="mr-2 h-4 w-4" />
                Use This Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Upload Section */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
      <div className="text-center space-y-4">
        <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
        <div>
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-medium">Need something custom?</h3>
            <HelpTooltip 
              content={helpContent.fileUpload}
              title="File Upload Guidelines"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Upload your own document for review and processing
          </p>
        </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/app/upload')}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Custom Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}