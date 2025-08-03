import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { encryptData, generateDocumentKey, hashKey } from '@/lib/encryption';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Upload, FileText, ArrowLeft } from 'lucide-react';

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  document_type: z.enum([
    'contract',
    'agreement', 
    'legal_notice',
    'compliance_document',
    'litigation_document',
    'corporate_document',
    'intellectual_property',
    'employment_document',
    'real_estate_document',
    'other'
  ]),
  jurisdiction: z.enum([
    'federal_australia',
    'nsw',
    'vic',
    'qld',
    'wa',
    'sa',
    'tas',
    'act',
    'nt',
    'international',
    'other'
  ]).optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

export default function DocumentEditor() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<any>(null);
  const [originalDocument, setOriginalDocument] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isRevision, setIsRevision] = useState(false);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      description: '',
      document_type: 'other',
      jurisdiction: 'federal_australia',
    },
  });

  useEffect(() => {
    if (documentId && documentId !== 'new') {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    if (!documentId || documentId === 'new') return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      // Check if user can edit this document
      if (data.user_id !== user?.id) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to edit this document',
          variant: 'destructive',
        });
        navigate('/app/documents');
        return;
      }

      // Check if this is a revision (rejected or requires_revision status)
      const canRevise = ['rejected', 'requires_revision'].includes(data.status);
      setIsRevision(canRevise);
      
      if (canRevise) {
        // Find the original document (root of the version chain)
        let rootDoc = data;
        if (data.parent_document_id) {
          const { data: parentData } = await supabase
            .from('documents')
            .select('*')
            .eq('id', data.parent_document_id)
            .single();
          if (parentData) rootDoc = parentData;
        }
        setOriginalDocument(rootDoc);
      }

      setDocument(data);
      form.reset({
        title: data.title,
        description: data.description || '',
        document_type: data.document_type,
        jurisdiction: data.jurisdiction || 'federal_australia',
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      });
      console.error('Error loading document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: DocumentFormData, isDraft = true) => {
    if (!user) return;

    setSaving(true);
    try {
      let encryptedContent = '';
      let encryptionKeyHash = '';
      let filePath = '';
      let fileName = '';
      let fileSize = 0;
      let fileMimeType = '';

      // Generate encryption key for this document
      const encryptionKey = generateDocumentKey(user.id, documentId || 'new');
      encryptionKeyHash = hashKey(encryptionKey);

      // Handle file upload if present
      if (selectedFile) {
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        fileMimeType = selectedFile.type;
        filePath = `${user.id}/${Date.now()}-${fileName}`;

        // Read file as text for encryption (for demonstration)
        const fileContent = await selectedFile.text();
        encryptedContent = encryptData(fileContent, encryptionKey);

        // Upload encrypted file to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, new Blob([encryptedContent], { type: 'text/plain' }));

        if (uploadError) throw uploadError;
      } else if (Object.keys(formData).length > 0) {
        // Encrypt form data
        encryptedContent = encryptData(JSON.stringify(formData), encryptionKey);
      }

      // Determine if this is a revision
      const isNewRevision = isRevision && document && ['rejected', 'requires_revision'].includes(document.status);
      
      // Calculate next version number
      let nextVersion = 1;
      if (isNewRevision) {
        // Get the highest version number in the document chain
        const parentId = originalDocument?.id || document.parent_document_id || document.id;
        const { data: versionData } = await supabase
          .from('documents')
          .select('version')
          .or(`id.eq.${parentId},parent_document_id.eq.${parentId}`)
          .order('version', { ascending: false })
          .limit(1);
        
        if (versionData && versionData.length > 0) {
          nextVersion = versionData[0].version + 1;
        }
      } else if (document?.version) {
        nextVersion = document.version;
      }

      const documentData = {
        title: data.title,
        description: data.description,
        document_type: data.document_type,
        jurisdiction: data.jurisdiction,
        user_id: user.id,
        status: (isDraft ? 'draft' : 'submitted') as 'draft' | 'submitted',
        encrypted_content: encryptedContent,
        encryption_key_hash: encryptionKeyHash,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_mime_type: fileMimeType,
        metadata: {},
        submitted_at: isDraft ? null : new Date().toISOString(),
        version: nextVersion,
        parent_document_id: isNewRevision ? (originalDocument?.id || document.parent_document_id || document.id) : null,
      };

      let result;
      if (isNewRevision) {
        // Create a new document version (never update the original)
        result = await supabase
          .from('documents')
          .insert([documentData])
          .select()
          .single();
      } else if (documentId && documentId !== 'new') {
        // Update existing document (only if it's not a revision)
        result = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', documentId)
          .select()
          .single();
      } else {
        // Create new document
        result = await supabase
          .from('documents')
          .insert([documentData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Auto-assign reviewer if submitted
      if (!isDraft) {
        await supabase.rpc('auto_assign_reviewer', {
          p_document_id: result.data.id
        });

        // Send notification for revision submissions
        if (isNewRevision) {
          try {
            await supabase.functions.invoke('send-revision-notification', {
              body: {
                documentId: result.data.id,
                originalDocumentId: originalDocument?.id || document.id,
                version: nextVersion,
                title: data.title,
                userEmail: user.email,
              }
            });
          } catch (notificationError) {
            console.error('Failed to send notification:', notificationError);
            // Don't fail the whole operation for notification errors
          }
        }

        // Log audit event
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_event: isNewRevision ? 'document_revision_submitted' : 'document_submitted',
          p_action_type: 'document',
          p_document_id: result.data.id,
          p_metadata: {
            version: nextVersion,
            parent_document_id: documentData.parent_document_id,
            is_revision: isNewRevision
          }
        });
      }

      toast({
        title: 'Success',
        description: `Document ${isDraft ? 'saved as draft' : isNewRevision ? 'revision submitted' : 'submitted'} successfully`,
      });

      if (documentId === 'new' || isNewRevision) {
        navigate(`/app/documents/${result.data.id}`);
      }

      setDocument(result.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save document',
        variant: 'destructive',
      });
      console.error('Error saving document:', error);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (data: DocumentFormData) => {
    handleSave(data, false);
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    handleSave(data, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title={documentId === 'new' ? 'Create Document' : (isRevision ? 'Submit New Version' : 'Edit Document')} showBackButton>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {documentId === 'new' ? 'Create Document' : 
               isRevision ? 'Submit New Version' : 'Edit Document'}
            </h1>
            <p className="text-muted-foreground">
              {documentId === 'new' 
                ? 'Create a new legal document with secure encryption'
                : isRevision 
                ? 'Submit a revised version of your document based on reviewer feedback'
                : 'Edit your legal document'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {document && (
              <Badge variant={
                document.status === 'draft' ? 'secondary' :
                document.status === 'submitted' ? 'default' :
                document.status === 'under_review' ? 'default' :
                document.status === 'approved' ? 'default' :
                document.status === 'rejected' ? 'destructive' :
                document.status === 'requires_revision' ? 'destructive' :
                'secondary'
              }>
                {document.status.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
            {isRevision && (
              <Badge variant="outline">
                Version {document?.version || 1} Revision
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Document Details
              </CardTitle>
              <CardDescription>
                Enter the basic information for your document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            className="min-h-[100px]"
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
                                <SelectValue placeholder="Select document type" />
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
                                <SelectValue placeholder="Select jurisdiction" />
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

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Draft
                    </Button>
                    
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      {isRevision ? 'Submit Revision' : 'Submit for Review'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
              <CardDescription>
                Upload a document file (encrypted automatically)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX, TXT up to 10MB
                    </p>
                  </label>
                </div>
                
                {selectedFile && (
                  <div className="text-sm">
                    <p className="font-medium">Selected file:</p>
                    <p className="text-muted-foreground">{selectedFile.name}</p>
                    <p className="text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Client-side encryption
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Role-based access control
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Audit trail logging
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Automatic reviewer assignment
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}