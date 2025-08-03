import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Shield,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  Lock
} from 'lucide-react';

interface DocumentTipsPanelProps {
  className?: string;
  documentType?: string;
}

export default function DocumentTipsPanel({ className, documentType }: DocumentTipsPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['tips']));

  const toggleSection = (section: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(section)) {
      newOpenSections.delete(section);
    } else {
      newOpenSections.add(section);
    }
    setOpenSections(newOpenSections);
  };

  const generalTips = [
    {
      icon: <Shield className="h-4 w-4 text-blue-500" />,
      title: "Security First",
      content: "All documents are encrypted and stored securely. Never share your login credentials."
    },
    {
      icon: <FileText className="h-4 w-4 text-green-500" />,
      title: "Document Quality",
      content: "Use clear, professional language. Include all required information and supporting documents."
    },
    {
      icon: <Clock className="h-4 w-4 text-orange-500" />,
      title: "Review Timeline",
      content: "Legal reviews typically take 2-5 business days. Complex documents may require additional time."
    },
    {
      icon: <Users className="h-4 w-4 text-purple-500" />,
      title: "Collaboration",
      content: "Use comments to communicate with reviewers. Be specific about questions or concerns."
    }
  ];

  const faqs = [
    {
      question: "How do I know if my document was received?",
      answer: "You'll receive an email confirmation when your document is submitted. You can also check the activity feed for real-time updates."
    },
    {
      question: "Can I edit my document after submission?",
      answer: "You can edit drafts anytime. Once submitted for review, contact your assigned reviewer to discuss any changes."
    },
    {
      question: "What happens if my document is rejected?",
      answer: "You'll receive detailed feedback in the comments. Address the concerns and resubmit when ready."
    },
    {
      question: "How do I choose the right template?",
      answer: "Templates are organized by document type and jurisdiction. Choose based on your specific legal needs and location."
    },
    {
      question: "Is my data secure?",
      answer: "Yes! We use enterprise-grade encryption, multi-factor authentication, and comply with privacy regulations."
    },
    {
      question: "Who can see my documents?",
      answer: "Only you, assigned legal reviewers, and authorized administrators can access your documents."
    }
  ];

  const documentTypeSpecificTips = {
    contract: [
      {
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        title: "Key Terms",
        content: "Clearly define payment terms, deliverables, and termination conditions."
      },
      {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        title: "Legal Compliance",
        content: "Ensure the contract complies with local laws and regulations in your jurisdiction."
      }
    ],
    nda: [
      {
        icon: <Lock className="h-4 w-4 text-red-500" />,
        title: "Confidentiality Scope",
        content: "Be specific about what information is considered confidential and for how long."
      },
      {
        icon: <Users className="h-4 w-4 text-blue-500" />,
        title: "Parties Involved",
        content: "Clearly identify all parties and their obligations under the agreement."
      }
    ]
  };

  const getDocumentSpecificTips = () => {
    if (!documentType) return [];
    
    const normalizedType = documentType.toLowerCase().replace(/[^a-z]/g, '');
    return documentTypeSpecificTips[normalizedType] || [];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <HelpCircle className="h-5 w-5 mr-2" />
          Help & Tips
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-6 space-y-4">
            
            {/* General Tips Section */}
            <Collapsible 
              open={openSections.has('tips')} 
              onOpenChange={() => toggleSection('tips')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <div className="flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    <span className="font-medium">General Tips</span>
                  </div>
                  {openSections.has('tips') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-3">
                  {generalTips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                      {tip.icon}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                        <p className="text-xs text-muted-foreground">{tip.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Document-Specific Tips */}
            {getDocumentSpecificTips().length > 0 && (
              <Collapsible 
                open={openSections.has('specific')} 
                onOpenChange={() => toggleSection('specific')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="font-medium">Document-Specific Tips</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {documentType}
                      </Badge>
                    </div>
                    {openSections.has('specific') ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-3">
                    {getDocumentSpecificTips().map((tip, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                        {tip.icon}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                          <p className="text-xs text-muted-foreground">{tip.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* FAQ Section */}
            <Collapsible 
              open={openSections.has('faq')} 
              onOpenChange={() => toggleSection('faq')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <div className="flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Frequently Asked Questions</span>
                  </div>
                  {openSections.has('faq') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/30">
                      <h4 className="font-medium text-sm mb-2 flex items-start">
                        <span className="text-primary mr-2">Q:</span>
                        {faq.question}
                      </h4>
                      <p className="text-xs text-muted-foreground pl-4">
                        <span className="text-primary mr-1">A:</span>
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}