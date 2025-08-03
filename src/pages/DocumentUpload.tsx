import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { encryptData, encryptFile, generateDocumentKey, hashKey } from '@/lib/encryption';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TemplateFieldGroup } from '@/components/TemplateFieldGroup';
import { Loader2, Upload, FileText, Shield, ArrowLeft, Clock, CheckCircle } from 'lucide-react';

const uploadSchema = z.object({
  upload_type: z.enum(['file', 'template']),
  template_id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  document_type: z.enum([
    'contract', 'agreement', 'legal_notice', 'compliance_document',
    'litigation_document', 'corporate_document', 'intellectual_property',
    'employment_document', 'real_estate_document', 'other'
  ]),
  jurisdiction: z.enum([
    'federal_australia', 'nsw', 'vic', 'qld', 'wa', 'sa', 
    'tas', 'act', 'nt', 'international', 'other'
  ]).optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateFormData, setTemplateFormData] = useState<Record<string, any>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['personal', 'company']));
  const [autosaveEnabled] = useState(true);

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedTemplate = urlParams.get('template');
  const preselectedType = urlParams.get('type');

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      upload_type: preselectedType === 'template' ? 'template' : 'file',
      template_id: preselectedTemplate || undefined,
      document_type: 'other',
      jurisdiction: 'federal_australia',
    },
  });

  const uploadType = form.watch('upload_type');
  const templateId = form.watch('template_id');

  // Helper functions for enhanced template system
  const toggleGroup = (groupName: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupName)) {
      newExpandedGroups.delete(groupName);
    } else {
      newExpandedGroups.add(groupName);
    }
    setExpandedGroups(newExpandedGroups);
  };

  // Calculate overall completion progress
  const calculateProgress = () => {
    if (!selectedTemplate?.template_schema?.fields) return 0;
    const fields = selectedTemplate.template_schema.fields;
    const requiredFields = fields.filter((field: any) => field.required);
    const completedRequired = requiredFields.filter((field: any) => {
      const value = templateFormData[field.name];
      return value && value.toString().trim() !== '';
    });
    return requiredFields.length > 0 ? (completedRequired.length / requiredFields.length) * 100 : 100;
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      setSelectedTemplate(template);
      if (template) {
        form.setValue('document_type', template.document_type);
        form.setValue('jurisdiction', template.jurisdiction);
      }
    } else {
      setSelectedTemplate(null);
    }
  }, [templateId, templates]);

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
        title: 'Warning',
        description: 'Could not load document templates',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Please select a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a PDF, DOC, DOCX, or TXT file',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const renderTemplateFields = () => {
    if (!selectedTemplate?.template_schema) return null;
    
    const schema = selectedTemplate.template_schema as { fields: any[] };
    const progress = calculateProgress();
    
    // Group fields by category
    const fieldGroups = schema.fields.reduce((groups: Record<string, any[]>, field) => {
      const group = field.group || 'general';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(field);
      return groups;
    }, {});

    // Define group metadata
    const groupMetadata: Record<string, { title: string; description: string }> = {
      personal: { title: "Personal Information", description: "Your personal details and contact information" },
      company: { title: "Company Information", description: "Business details and corporate information" },
      document: { title: "Document Details", description: "Specific information about this document" },
      financial: { title: "Financial Information", description: "Monetary amounts and financial terms" },
      dates: { title: "Important Dates", description: "Timeline and date-related information" },
      general: { title: "General Information", description: "Additional required information" }
    };

    // Create a dummy form for the field renderer
    const templateForm = {
      ...form,
      register: (name: string) => ({
        onChange: (e: any) => {
          const value = e.target?.value ?? e;
          setTemplateFormData(prev => ({ ...prev, [name]: value }));
        },
        value: templateFormData[name] || '',
        name
      }),
      setValue: (name: string, value: any) => {
        setTemplateFormData(prev => ({ ...prev, [name]: value }));
      },
      watch: (name?: string) => {
        if (name) return templateFormData[name];
        return templateFormData;
      }
    };

    return (
      <div className="space-y-6">
        {/* Progress Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedTemplate.name}
                </CardTitle>
                <CardDescription>
                  Fill in the required information for this template
                </CardDescription>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={progress === 100 ? "default" : "secondary"}>
                    {Math.round(progress)}% Complete
                  </Badge>
                </div>
                <Progress value={progress} className="w-32 h-2" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Grouped Fields */}
        {Object.entries(fieldGroups).map(([groupName, fields]) => {
          const metadata = groupMetadata[groupName] || { 
            title: groupName.charAt(0).toUpperCase() + groupName.slice(1), 
            description: `${groupName} information` 
          };
          const group = {
            name: groupName,
            title: metadata.title,
            description: metadata.description,
            icon: null,
            fields: fields as any[]
          };
          
          return (
            <TemplateFieldGroup
              key={groupName}
              group={group}
              form={templateForm as any}
              isExpanded={expandedGroups.has(groupName)}
              onToggle={() => toggleGroup(groupName)}
            />
          );
        })}

        {/* Auto-save indicator */}
        {autosaveEnabled && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Changes are automatically saved
          </div>
        )}
      </div>
    );
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!user) return;

    // Validate required data
    if (uploadType === 'file' && !selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    if (uploadType === 'template' && !templateId) {
      toast({
        title: 'No Template Selected',
        description: 'Please select a template',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Generate encryption key
      const encryptionKey = generateDocumentKey(user.id, Date.now().toString());
      const encryptionKeyHash = hashKey(encryptionKey);

      let encryptedContent = '';
      let filePath = '';
      let fileName = '';
      let fileSize = 0;
      let fileMimeType = '';

      if (uploadType === 'file' && selectedFile) {
        // Handle file upload
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        fileMimeType = selectedFile.type;
        filePath = `${user.id}/${Date.now()}-${fileName}`;

        // Encrypt file content
        const encryptedFileContent = await encryptFile(selectedFile, encryptionKey);
        
        // Upload encrypted file to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, new Blob([encryptedFileContent], { type: 'text/plain' }));

        if (uploadError) throw uploadError;
      } else if (uploadType === 'template') {
        // Handle template form data
        encryptedContent = encryptData(JSON.stringify(templateFormData), encryptionKey);
      }

      // Insert document record
      const documentData = {
        title: data.title,
        description: data.description,
        document_type: data.document_type,
        jurisdiction: data.jurisdiction,
        user_id: user.id,
        status: 'submitted' as const,
        encrypted_content: encryptedContent,
        encryption_key_hash: encryptionKeyHash,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_mime_type: fileMimeType,
        template_data: selectedTemplate ? { template_id: templateId, form_data: templateFormData } : null,
        submitted_at: new Date().toISOString(),
      };

      const { data: insertedDoc, error: insertError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-assign reviewer
      await supabase.rpc('auto_assign_reviewer', {
        p_document_id: insertedDoc.id
      });

      toast({
        title: 'Success!',
        description: 'Document uploaded and submitted for review successfully',
      });

      navigate('/app/documents');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout title="Upload Document" showBackButton>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upload Document</h1>
            <p className="text-muted-foreground">
              Securely upload and submit your legal documents for review
            </p>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Shield className="h-4 w-4 mr-2" />
            End-to-end encrypted
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Upload Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Upload Method</CardTitle>
              <CardDescription>
                Select whether to upload a file or use a pre-built template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="upload_type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2 border rounded-lg p-4">
                          <RadioGroupItem value="file" id="file" />
                          <Label htmlFor="file" className="flex-1 cursor-pointer">
                            <div className="flex items-center">
                              <Upload className="h-5 w-5 mr-2" />
                              <div>
                                <div className="font-medium">Upload File</div>
                                <div className="text-sm text-muted-foreground">
                                  Upload PDF, DOC, or other document
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-lg p-4">
                          <RadioGroupItem value="template" id="template" />
                          <Label htmlFor="template" className="flex-1 cursor-pointer">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 mr-2" />
                              <div>
                                <div className="font-medium">Use Template</div>
                                <div className="text-sm text-muted-foreground">
                                  Fill out a legal document template
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* File Upload */}
          {uploadType === 'file' && (
            <Card>
              <CardHeader>
                <CardTitle>File Upload</CardTitle>
                <CardDescription>
                  Select your document file (PDF, DOC, DOCX, TXT - Max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      PDF, DOC, DOCX, TXT up to 10MB
                    </p>
                  </label>
                </div>
                
                {selectedFile && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedFile(null)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Template Selection */}
          {uploadType === 'template' && (
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
                <CardDescription>
                  Choose from available legal document templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="template_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {template.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Template Form Fields */}
          {uploadType === 'template' && selectedTemplate && renderTemplateFields()}

          {/* Document Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
              <CardDescription>
                Provide basic information about your document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter document title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the document"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="document_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="agreement">Agreement</SelectItem>
                          <SelectItem value="legal_notice">Legal Notice</SelectItem>
                          <SelectItem value="compliance_document">Compliance Document</SelectItem>
                          <SelectItem value="litigation_document">Litigation Document</SelectItem>
                          <SelectItem value="corporate_document">Corporate Document</SelectItem>
                          <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                          <SelectItem value="employment_document">Employment Document</SelectItem>
                          <SelectItem value="real_estate_document">Real Estate Document</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jurisdiction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurisdiction</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="federal_australia">Federal Australia</SelectItem>
                          <SelectItem value="nsw">New South Wales</SelectItem>
                          <SelectItem value="vic">Victoria</SelectItem>
                          <SelectItem value="qld">Queensland</SelectItem>
                          <SelectItem value="wa">Western Australia</SelectItem>
                          <SelectItem value="sa">South Australia</SelectItem>
                          <SelectItem value="tas">Tasmania</SelectItem>
                          <SelectItem value="act">Australian Capital Territory</SelectItem>
                          <SelectItem value="nt">Northern Territory</SelectItem>
                          <SelectItem value="international">International</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={uploading} size="lg">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Document
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </AppLayout>
  );
}