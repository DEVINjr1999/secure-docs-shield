-- Insert three new document templates with placeholder admin UUID
-- Note: You'll need to update the created_by field to actual admin UUID after creation
INSERT INTO public.document_templates (
    name,
    description,
    document_type,
    jurisdiction,
    template_schema,
    is_active,
    created_by
) VALUES 
(
    'Residential Lease Agreement',
    'Agreement between landlord and tenant for residential property rental in Victoria.',
    'contract',
    'vic',
    '{
      "fields": [
        { "name": "landlord_name", "label": "Landlord Name", "type": "text", "required": true },
        { "name": "tenant_name", "label": "Tenant Name", "type": "text", "required": true },
        { "name": "property_address", "label": "Property Address", "type": "text", "required": true },
        { "name": "lease_start", "label": "Lease Start Date", "type": "date", "required": true },
        { "name": "lease_end", "label": "Lease End Date", "type": "date", "required": true },
        { "name": "monthly_rent", "label": "Monthly Rent ($AUD)", "type": "number", "required": true },
        { "name": "bond_amount", "label": "Bond Amount", "type": "number", "required": true },
        { "name": "payment_frequency", "label": "Payment Frequency", "type": "select", "options": ["Weekly", "Fortnightly", "Monthly"], "required": true },
        { "name": "special_terms", "label": "Special Terms or Conditions", "type": "textarea" }
      ]
    }'::jsonb,
    true,
    (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),
(
    'Rental Payment Receipt',
    'Receipt issued by landlord for rent received.',
    'compliance_document',
    'vic',
    '{
      "fields": [
        { "name": "tenant_name", "label": "Tenant Name", "type": "text", "required": true },
        { "name": "landlord_name", "label": "Landlord Name", "type": "text", "required": true },
        { "name": "rental_period", "label": "Rental Period", "type": "text", "required": true },
        { "name": "payment_date", "label": "Date of Payment", "type": "date", "required": true },
        { "name": "amount_paid", "label": "Amount Paid ($AUD)", "type": "number", "required": true },
        { "name": "payment_method", "label": "Payment Method", "type": "select", "options": ["Bank Transfer", "Cash", "Card", "Other"], "required": true },
        { "name": "receipt_number", "label": "Receipt Number", "type": "text" }
      ]
    }'::jsonb,
    true,
    (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),
(
    'Notice to Vacate',
    'Official notice issued to tenant to vacate property.',
    'legal_notice',
    'vic',
    '{
      "fields": [
        { "name": "landlord_name", "label": "Landlord Name", "type": "text", "required": true },
        { "name": "tenant_name", "label": "Tenant Name", "type": "text", "required": true },
        { "name": "property_address", "label": "Property Address", "type": "text", "required": true },
        { "name": "vacate_date", "label": "Date to Vacate", "type": "date", "required": true },
        { "name": "reason_for_notice", "label": "Reason for Notice", "type": "textarea", "required": true },
        { "name": "notice_date", "label": "Date of Notice", "type": "date", "required": true }
      ]
    }'::jsonb,
    true,
    (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
);