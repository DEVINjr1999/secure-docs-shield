import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, ArrowRight, Loader2 } from 'lucide-react';

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

  console.log('TemplateSelector component rendered');

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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose a Legal Document Template</h2>
        <p className="text-muted-foreground">
          Get started quickly with our pre-built legal document templates
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Templates Available</h3>
            <p className="text-muted-foreground mb-4">
              There are currently no active document templates available.
            </p>
            <Button onClick={() => navigate('/app/upload')}>
              Upload Your Own Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <Badge variant="secondary" className="text-xs">
                    {formatJurisdiction(template.jurisdiction)}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight">
                  {template.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <Badge variant="outline">
                      {formatDocumentType(template.document_type)}
                    </Badge>
                  </div>
                  
                  <Button 
                    className="w-full group-hover:bg-primary/90 transition-colors"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    Use This Template
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center">
        <p className="text-muted-foreground mb-4">
          Don't see what you need? You can also upload your own document.
        </p>
        <Button variant="outline" onClick={() => navigate('/app/upload')}>
          <FileText className="h-4 w-4 mr-2" />
          Upload Custom Document
        </Button>
      </div>
    </div>
  );
}