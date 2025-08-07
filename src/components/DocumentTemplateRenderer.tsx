import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface TemplateField {
  id: string;
  type: string;
  label: string;
  value?: any;
  required?: boolean;
}

interface DocumentTemplateRendererProps {
  templateData: any;
  documentTitle: string;
  documentId: string;
  createdAt: string;
  status: string;
  className?: string;
}

export function DocumentTemplateRenderer({
  templateData,
  documentTitle,
  documentId,
  createdAt,
  status,
  className,
}: DocumentTemplateRendererProps) {
  let parsedData;
  try {
    parsedData = typeof templateData === 'string' ? JSON.parse(templateData) : templateData;
  } catch (error) {
    console.error('Failed to parse template data:', error);
    parsedData = {};
  }

  const formData = parsedData.formData || parsedData;

  const formatDate = (dateString: string) => {
    if (!dateString) return '______';
    try {
      return format(new Date(dateString), 'MMMM do, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: string | number) => {
    if (!amount) return '$______';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const getTemplateName = () => {
    return documentTitle.toLowerCase().replace(/\s+/g, '_');
  };

  const renderLoanAgreement = () => (
    <div className="document-content">
      <div className="document-header">
        <h1 className="document-title">LOAN AGREEMENT</h1>
      </div>

      <div className="document-body">
        <p className="document-opening">
          THIS LOAN AGREEMENT (this "Agreement") dated this{' '}
          <span className="underline-field">
            {formData.agreement_date ? format(new Date(formData.agreement_date), 'do') : '______'}
          </span>{' '}
          day of{' '}
          <span className="underline-field">
            {formData.agreement_date ? format(new Date(formData.agreement_date), 'MMMM') : '______'}
          </span>,{' '}
          <span className="underline-field">
            {formData.agreement_date ? format(new Date(formData.agreement_date), 'yyyy') : '______'}
          </span>
        </p>

        <div className="parties-section">
          <p className="section-header">BETWEEN:</p>
          
          <div className="party-block">
            <div className="party-line">
              <span className="underline-field lender-name">
                {formData.lender_name || formData.lenderName || '________________________'}
              </span>{' '}
              of{' '}
              <span className="underline-field lender-address">
                {formData.lender_address || formData.lenderAddress || '________________________'}
              </span>
            </div>
            <div className="party-designation">(the "Lender")</div>
            <div className="party-position">OF THE FIRST PART</div>
          </div>

          <div className="and-divider">AND</div>

          <div className="party-block">
            <div className="party-line">
              <span className="underline-field borrower-name">
                {formData.borrower_name || formData.borrowerName || '________________________'}
              </span>{' '}
              of{' '}
              <span className="underline-field borrower-address">
                {formData.borrower_address || formData.borrowerAddress || '________________________'}
              </span>
            </div>
            <div className="party-designation">(the "Borrower")</div>
            <div className="party-position">OF THE SECOND PART</div>
          </div>
        </div>

        <div className="consideration-section">
          <p className="consideration-text">
            IN CONSIDERATION OF the Lender loaning certain monies (the "Loan") to the Borrower, and the Borrower repaying the Loan to 
            the Lender, the parties agree to keep, perform and fulfill the promises and conditions set out in this Agreement:
          </p>
        </div>

        <div className="terms-section">
          <h3 className="section-title">Loan Amount & Interest</h3>
          
          <div className="numbered-clause">
            <span className="clause-number">1.</span>
            <span className="clause-text">
              The Lender promises to loan{' '}
              <span className="underline-field">
                {formatCurrency(formData.loan_amount || formData.loanAmount)}
              </span>{' '}
              AUD to the Borrower and the Borrower promises to repay this principal amount, with interest, to the Lender.
            </span>
          </div>

          <div className="numbered-clause">
            <span className="clause-number">2.</span>
            <span className="clause-text">
              Interest will be charged on the outstanding principal at the rate of{' '}
              <span className="underline-field">
                {formData.interest_rate || formData.interestRate || '______'}%
              </span>{' '}
              per annum, calculated{' '}
              <span className="underline-field">
                {formData.interest_calculation || formData.interestCalculation || 'monthly'}
              </span>.
            </span>
          </div>

          <div className="numbered-clause">
            <span className="clause-number">3.</span>
            <span className="clause-text">
              The loan and accrued interest will be repaid in full by{' '}
              <span className="underline-field">
                {formatDate(formData.repayment_date || formData.repaymentDate)}
              </span>.
            </span>
          </div>

          {(formData.payment_schedule || formData.paymentSchedule) && (
            <div className="numbered-clause">
              <span className="clause-number">4.</span>
              <span className="clause-text">
                Payment Schedule: {formData.payment_schedule || formData.paymentSchedule}
              </span>
            </div>
          )}

          {(formData.security_collateral || formData.securityCollateral) && (
            <div className="numbered-clause">
              <span className="clause-number">5.</span>
              <span className="clause-text">
                Security/Collateral: {formData.security_collateral || formData.securityCollateral}
              </span>
            </div>
          )}
        </div>

        <div className="signature-section">
          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Lender Signature</div>
              <div className="signature-date">
                Date: {formatDate(formData.signature_date || formData.signatureDate)}
              </div>
            </div>
          </div>

          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Borrower Signature</div>
              <div className="signature-date">
                Date: {formatDate(formData.signature_date || formData.signatureDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServiceAgreement = () => (
    <div className="document-content">
      <div className="document-header">
        <h1 className="document-title">SERVICE AGREEMENT</h1>
      </div>

      <div className="document-body">
        <p className="document-opening">
          THIS SERVICE AGREEMENT (this "Agreement") is entered into on{' '}
          <span className="underline-field">
            {formatDate(formData.agreement_date || formData.agreementDate)}
          </span>{' '}
          between:
        </p>

        <div className="parties-section">
          <div className="party-block">
            <div className="party-line">
              <strong>Service Provider:</strong>{' '}
              <span className="underline-field">
                {formData.provider_name || formData.providerName || '________________________'}
              </span>
            </div>
            <div className="party-address">
              Address: <span className="underline-field">
                {formData.provider_address || formData.providerAddress || '________________________'}
              </span>
            </div>
          </div>

          <div className="party-block">
            <div className="party-line">
              <strong>Client:</strong>{' '}
              <span className="underline-field">
                {formData.client_name || formData.clientName || '________________________'}
              </span>
            </div>
            <div className="party-address">
              Address: <span className="underline-field">
                {formData.client_address || formData.clientAddress || '________________________'}
              </span>
            </div>
          </div>
        </div>

        <div className="terms-section">
          <h3 className="section-title">Terms and Conditions</h3>
          
          <div className="numbered-clause">
            <span className="clause-number">1.</span>
            <span className="clause-text">
              <strong>Services:</strong> The Service Provider agrees to provide the following services:{' '}
              <span className="underline-field">
                {formData.service_description || formData.serviceDescription || '________________________'}
              </span>
            </span>
          </div>

          <div className="numbered-clause">
            <span className="clause-number">2.</span>
            <span className="clause-text">
              <strong>Compensation:</strong> The Client agrees to pay{' '}
              <span className="underline-field">
                {formatCurrency(formData.service_fee || formData.serviceFee)}
              </span>{' '}
              for the services provided.
            </span>
          </div>

          <div className="numbered-clause">
            <span className="clause-number">3.</span>
            <span className="clause-text">
              <strong>Term:</strong> This agreement shall commence on{' '}
              <span className="underline-field">
                {formatDate(formData.start_date || formData.startDate)}
              </span>{' '}
              and shall terminate on{' '}
              <span className="underline-field">
                {formatDate(formData.end_date || formData.endDate)}
              </span>.
            </span>
          </div>
        </div>

        <div className="signature-section">
          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Service Provider Signature</div>
            </div>
          </div>

          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Client Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmploymentContract = () => (
    <div className="document-content">
      <div className="document-header">
        <h1 className="document-title">EMPLOYMENT CONTRACT</h1>
      </div>

      <div className="document-body">
        <p className="document-opening">
          THIS EMPLOYMENT CONTRACT is made between{' '}
          <span className="underline-field">
            {formData.company_name || formData.companyName || '________________________'}
          </span>{' '}
          ("Company") and{' '}
          <span className="underline-field">
            {formData.employee_name || formData.employeeName || '________________________'}
          </span>{' '}
          ("Employee").
        </p>

        <div className="terms-section">
          <div className="numbered-clause">
            <span className="clause-number">1.</span>
            <span className="clause-text">
              <strong>Position:</strong> Employee is hired as{' '}
              <span className="underline-field">
                {formData.job_title || formData.jobTitle || '________________________'}
              </span>
            </span>
          </div>

          <div className="numbered-clause">
            <span className="clause-number">2.</span>
            <span className="clause-text">
              <strong>Salary:</strong> Employee will receive an annual salary of{' '}
              <span className="underline-field">
                {formatCurrency(formData.annual_salary || formData.annualSalary)}
              </span>
            </span>
          </div>

          <div className="numbered-clause">
            <span className="clause-number">3.</span>
            <span className="clause-text">
              <strong>Start Date:</strong> Employment begins on{' '}
              <span className="underline-field">
                {formatDate(formData.start_date || formData.startDate)}
              </span>
            </span>
          </div>

          <div className="numbered-clause">
            <span className="clause-number">4.</span>
            <span className="clause-text">
              <strong>Work Schedule:</strong>{' '}
              <span className="underline-field">
                {formData.work_schedule || formData.workSchedule || 'Full-time, Monday through Friday'}
              </span>
            </span>
          </div>
        </div>

        <div className="signature-section">
          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Company Representative</div>
            </div>
          </div>

          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Employee Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDefaultTemplate = () => (
    <div className="document-content">
      <div className="document-header">
        <h1 className="document-title">{documentTitle.toUpperCase()}</h1>
      </div>

      <div className="document-body">
        <div className="terms-section">
          {Object.entries(formData).filter(([key]) => key !== 'templateId').map(([key, value], index) => (
            <div key={key} className="numbered-clause">
              <span className="clause-number">{index + 1}.</span>
              <span className="clause-text">
                <strong>{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/\b\w/g, l => l.toUpperCase())}:</strong>{' '}
                <span className="underline-field">
                  {String(value) || '________________________'}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="signature-section">
          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Party A Signature</div>
            </div>
          </div>

          <div className="signature-block">
            <div className="signature-line">
              <div className="signature-field">
                ________________________________
              </div>
              <div className="signature-label">Party B Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplate = () => {
    const templateName = getTemplateName();
    
    if (templateName.includes('loan')) {
      return renderLoanAgreement();
    } else if (templateName.includes('service')) {
      return renderServiceAgreement();
    } else if (templateName.includes('employment')) {
      return renderEmploymentContract();
    } else {
      return renderDefaultTemplate();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("document-renderer max-w-4xl mx-auto", className)}>
      {/* Print Button */}
      <div className="mb-4 print:hidden">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print Document
        </Button>
      </div>

      {/* Legal Document Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .document-content {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 1in;
          background: white;
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          color: black;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          min-height: 11in;
        }

        .document-header {
          text-align: center;
          margin-bottom: 2em;
          padding-bottom: 1em;
          border-bottom: 2px solid black;
        }

        .document-title {
          font-size: 18pt;
          font-weight: bold;
          text-decoration: underline;
          margin: 0;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .document-opening {
          text-align: justify;
          margin-bottom: 1.5em;
          text-indent: 2em;
          font-size: 11pt;
        }

        .parties-section {
          margin: 2em 0;
        }

        .section-header {
          font-weight: bold;
          margin-bottom: 1em;
          text-align: center;
          font-size: 12pt;
        }

        .party-block {
          margin: 2em 0;
          text-align: center;
        }

        .party-line {
          margin-bottom: 0.5em;
          font-size: 11pt;
        }

        .party-designation {
          font-style: italic;
          margin: 0.5em 0;
          font-size: 11pt;
        }

        .party-position {
          font-weight: bold;
          margin-top: 0.5em;
          font-size: 11pt;
          text-transform: uppercase;
        }

        .party-address {
          font-size: 10pt;
          margin: 0.5em 0;
        }

        .and-divider {
          text-align: center;
          font-weight: bold;
          margin: 2em 0;
          font-size: 14pt;
          text-transform: uppercase;
        }

        .consideration-section {
          margin: 2em 0;
        }

        .consideration-text {
          text-align: justify;
          text-indent: 2em;
          font-size: 11pt;
        }

        .terms-section {
          margin: 2em 0;
        }

        .section-title {
          font-size: 14pt;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 1em;
          text-align: center;
          text-transform: uppercase;
        }

        .numbered-clause {
          display: flex;
          margin: 1.5em 0;
          text-align: justify;
          font-size: 11pt;
        }

        .clause-number {
          min-width: 2em;
          font-weight: bold;
          font-size: 11pt;
        }

        .clause-text {
          flex: 1;
          text-indent: 1em;
        }

        .underline-field {
          border-bottom: 1px solid black;
          min-width: 120px;
          display: inline-block;
          text-align: center;
          font-weight: bold;
          padding: 0 5px;
          margin: 0 2px;
        }

        .signature-section {
          margin-top: 4em;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          page-break-inside: avoid;
        }

        .signature-block {
          width: 45%;
          margin: 1em 0;
        }

        .signature-line {
          text-align: center;
        }

        .signature-field {
          border-bottom: 1px solid black;
          height: 3em;
          margin-bottom: 0.5em;
          width: 100%;
        }

        .signature-label {
          font-size: 10pt;
          font-weight: bold;
          text-transform: uppercase;
        }

        .signature-date {
          font-size: 10pt;
          margin-top: 0.5em;
        }

        @media print {
          .document-content {
            box-shadow: none;
            margin: 0;
            padding: 0.5in;
          }
          
          .print\\:hidden {
            display: none !important;
          }
        }

        @page {
          margin: 0.5in;
          size: letter;
        }
        `
      }} />
      
      {renderTemplate()}
    </div>
  );
}