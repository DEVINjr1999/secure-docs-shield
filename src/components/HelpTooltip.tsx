import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Info } from 'lucide-react';

interface HelpTooltipProps {
  content: string | ReactNode;
  title?: string;
  className?: string;
  triggerClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  icon?: 'help' | 'info';
}

export function HelpTooltip({ 
  content, 
  title, 
  className, 
  triggerClassName,
  side = 'right',
  icon = 'help'
}: HelpTooltipProps) {
  const IconComponent = icon === 'help' ? HelpCircle : Info;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${triggerClassName}`}
            aria-label={typeof content === 'string' ? content : 'Help information'}
          >
            <IconComponent className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className={`max-w-xs ${className}`}>
          {title && (
            <div className="font-medium mb-1">{title}</div>
          )}
          <div className="text-sm">
            {content}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Predefined help content for common form fields
export const helpContent = {
  documentTitle: (
    <div className="space-y-2">
      <div className="font-medium">Document Title Tips:</div>
      <ul className="text-xs space-y-1">
        <li>• Use clear, descriptive names</li>
        <li>• Include document type (e.g. "Employment Contract", "NDA")</li>
        <li>• Add version if applicable (e.g. "v2", "Draft")</li>
        <li>• Examples: "Software License Agreement - Draft", "Employee Handbook 2024"</li>
      </ul>
    </div>
  ),
  documentDescription: (
    <div className="space-y-2">
      <div className="font-medium">Description Guidelines:</div>
      <ul className="text-xs space-y-1">
        <li>• Briefly explain the document's purpose</li>
        <li>• Mention key parties involved</li>
        <li>• Note any special requirements or deadlines</li>
        <li>• Example: "Partnership agreement between Company A and B for software development project"</li>
      </ul>
    </div>
  ),
  documentType: (
    <div className="space-y-2">
      <div className="font-medium">Choose the Right Type:</div>
      <ul className="text-xs space-y-1">
        <li>• <strong>Contract:</strong> Agreements between parties</li>
        <li>• <strong>Legal Notice:</strong> Formal notifications</li>
        <li>• <strong>Compliance:</strong> Regulatory documents</li>
        <li>• <strong>Corporate:</strong> Company governance docs</li>
        <li>• <strong>Employment:</strong> HR and workplace docs</li>
      </ul>
    </div>
  ),
  jurisdiction: (
    <div className="space-y-2">
      <div className="font-medium">Legal Jurisdiction:</div>
      <ul className="text-xs space-y-1">
        <li>• Choose where the document will be legally enforceable</li>
        <li>• Select your business location if uncertain</li>
        <li>• Federal applies across all Australian states</li>
        <li>• State-specific for local regulations</li>
      </ul>
    </div>
  ),
  encryptionMode: (
    <div className="space-y-2">
      <div className="font-medium">Encryption Options:</div>
      <ul className="text-xs space-y-1">
        <li>• <strong>Auto:</strong> System generates secure key (recommended)</li>
        <li>• <strong>Custom:</strong> Provide your own encryption key</li>
        <li>• Auto keys are randomly generated and very secure</li>
        <li>• Custom keys must meet security requirements</li>
      </ul>
    </div>
  ),
  customEncryptionKey: (
    <div className="space-y-2">
      <div className="font-medium">Strong Key Requirements:</div>
      <ul className="text-xs space-y-1">
        <li>• Minimum 10 characters</li>
        <li>• Include UPPERCASE letters</li>
        <li>• Include lowercase letters</li>
        <li>• Include numbers (0-9)</li>
        <li>• Include special characters (!@#$%)</li>
        <li>• Example: "MyStr0ng#Key2024!"</li>
      </ul>
    </div>
  ),
  fileUpload: (
    <div className="space-y-2">
      <div className="font-medium">File Requirements:</div>
      <ul className="text-xs space-y-1">
        <li>• Maximum size: 10MB</li>
        <li>• Supported: PDF, DOC, DOCX, TXT</li>
        <li>• Ensure text is clear and readable</li>
        <li>• Avoid password-protected files</li>
        <li>• Use high-quality scans if uploading images</li>
      </ul>
    </div>
  ),
  templateSelection: (
    <div className="space-y-2">
      <div className="font-medium">Choosing Templates:</div>
      <ul className="text-xs space-y-1">
        <li>• Match your document type exactly</li>
        <li>• Check jurisdiction requirements</li>
        <li>• Review template description carefully</li>
        <li>• Templates save time and ensure compliance</li>
      </ul>
    </div>
  ),
  personalInfo: (
    <div className="space-y-2">
      <div className="font-medium">Personal Information:</div>
      <ul className="text-xs space-y-1">
        <li>• Use your full legal name</li>
        <li>• Provide current contact information</li>
        <li>• Double-check spelling and details</li>
        <li>• This information appears in legal documents</li>
      </ul>
    </div>
  ),
  companyInfo: (
    <div className="space-y-2">
      <div className="font-medium">Company Details:</div>
      <ul className="text-xs space-y-1">
        <li>• Use registered business name</li>
        <li>• Include ABN/ACN if applicable</li>
        <li>• Provide registered business address</li>
        <li>• Ensure details match official records</li>
      </ul>
    </div>
  ),
  financialInfo: (
    <div className="space-y-2">
      <div className="font-medium">Financial Information:</div>
      <ul className="text-xs space-y-1">
        <li>• Use numbers only (no currency symbols)</li>
        <li>• Include cents if applicable (e.g. 1500.50)</li>
        <li>• Double-check all amounts carefully</li>
        <li>• Consider tax implications</li>
      </ul>
    </div>
  ),
  dateFields: (
    <div className="space-y-2">
      <div className="font-medium">Date Guidelines:</div>
      <ul className="text-xs space-y-1">
        <li>• Use DD/MM/YYYY format for Australia</li>
        <li>• Allow sufficient time for all parties</li>
        <li>• Consider business days vs calendar days</li>
        <li>• Check for public holidays and conflicts</li>
      </ul>
    </div>
  )
};