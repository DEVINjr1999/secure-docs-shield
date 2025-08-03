-- Temporarily allow NULL for created_by and insert the templates
ALTER TABLE document_templates ALTER COLUMN created_by DROP NOT NULL;

-- Insert 6 fillable legal document templates
INSERT INTO public.document_templates (
    name,
    description,
    document_type,
    jurisdiction,
    template_schema,
    default_content
) VALUES 
(
    'Loan Agreement Template',
    'Comprehensive loan agreement template for personal or business loans with customizable terms and conditions.',
    'agreement',
    'other',
    '{
        "fields": [
            {"name": "lender_name", "type": "text", "label": "Lender Full Name", "required": true},
            {"name": "lender_address", "type": "textarea", "label": "Lender Address", "required": true},
            {"name": "borrower_name", "type": "text", "label": "Borrower Full Name", "required": true},
            {"name": "borrower_address", "type": "textarea", "label": "Borrower Address", "required": true},
            {"name": "loan_amount", "type": "currency", "label": "Loan Amount", "required": true},
            {"name": "interest_rate", "type": "percentage", "label": "Annual Interest Rate", "required": true},
            {"name": "loan_term", "type": "number", "label": "Loan Term (months)", "required": true},
            {"name": "payment_frequency", "type": "select", "label": "Payment Frequency", "options": ["Monthly", "Quarterly", "Semi-annually", "Annually"], "required": true},
            {"name": "first_payment_date", "type": "date", "label": "First Payment Date", "required": true},
            {"name": "purpose", "type": "textarea", "label": "Purpose of Loan", "required": true},
            {"name": "collateral", "type": "textarea", "label": "Collateral (if any)", "required": false},
            {"name": "default_rate", "type": "percentage", "label": "Default Interest Rate", "required": false},
            {"name": "prepayment_penalty", "type": "select", "label": "Prepayment Penalty", "options": ["None", "1%", "2%", "3%"], "required": false}
        ]
    }',
    'LOAN AGREEMENT\n\nThis Loan Agreement ("Agreement") is entered into on [DATE] between [LENDER_NAME], a resident of [LENDER_ADDRESS] ("Lender"), and [BORROWER_NAME], a resident of [BORROWER_ADDRESS] ("Borrower").\n\n1. LOAN AMOUNT AND TERMS\nLender agrees to loan Borrower the sum of [LOAN_AMOUNT] ("Principal Amount") at an annual interest rate of [INTEREST_RATE]%.\n\n2. REPAYMENT TERMS\nBorrower agrees to repay the loan in [PAYMENT_FREQUENCY] installments over [LOAN_TERM] months, with the first payment due on [FIRST_PAYMENT_DATE].\n\n3. PURPOSE\nThe loan is being made for the following purpose: [PURPOSE]\n\n4. DEFAULT\nIf Borrower fails to make any payment when due, the entire unpaid balance shall become immediately due and payable.\n\nIN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above.\n\n___________________ ___________________\nLender Signature     Borrower Signature'
),
(
    'Power of Attorney Template',
    'Legal power of attorney document template allowing one person to act on behalf of another in legal, financial, or medical matters.',
    'legal_notice',
    'other',
    '{
        "fields": [
            {"name": "principal_name", "type": "text", "label": "Principal Full Name", "required": true},
            {"name": "principal_address", "type": "textarea", "label": "Principal Address", "required": true},
            {"name": "agent_name", "type": "text", "label": "Agent/Attorney-in-Fact Name", "required": true},
            {"name": "agent_address", "type": "textarea", "label": "Agent Address", "required": true},
            {"name": "powers_granted", "type": "multiselect", "label": "Powers Granted", "options": ["Banking and Financial", "Real Estate", "Business Operations", "Insurance", "Legal Proceedings", "Tax Matters", "Healthcare Decisions", "Government Benefits"], "required": true},
            {"name": "effective_date", "type": "date", "label": "Effective Date", "required": true},
            {"name": "expiration_date", "type": "date", "label": "Expiration Date (if any)", "required": false},
            {"name": "durable", "type": "select", "label": "Durable (continues if incapacitated)", "options": ["Yes", "No"], "required": true},
            {"name": "successor_agent", "type": "text", "label": "Successor Agent Name", "required": false},
            {"name": "witness1_name", "type": "text", "label": "Witness 1 Name", "required": true},
            {"name": "witness2_name", "type": "text", "label": "Witness 2 Name", "required": true}
        ]
    }',
    'POWER OF ATTORNEY\n\nI, [PRINCIPAL_NAME], of [PRINCIPAL_ADDRESS], hereby appoint [AGENT_NAME], of [AGENT_ADDRESS], as my attorney-in-fact to act for me in the following capacities:\n\nPOWERS GRANTED:\n[POWERS_GRANTED]\n\nThis Power of Attorney shall become effective on [EFFECTIVE_DATE] and shall [DURABLE_CLAUSE].\n\nIN WITNESS WHEREOF, I have executed this Power of Attorney on [DATE].\n\n___________________\nPrincipal Signature\n\nWITNESSES:\n___________________    ___________________\n[WITNESS1_NAME]        [WITNESS2_NAME]'
),
(
    'Commercial Lease Agreement Template',
    'Professional commercial lease agreement template for office spaces, retail locations, warehouses, and other business properties.',
    'real_estate_document',
    'other',
    '{
        "fields": [
            {"name": "landlord_name", "type": "text", "label": "Landlord/Lessor Name", "required": true},
            {"name": "landlord_address", "type": "textarea", "label": "Landlord Address", "required": true},
            {"name": "tenant_name", "type": "text", "label": "Tenant/Lessee Name", "required": true},
            {"name": "tenant_address", "type": "textarea", "label": "Tenant Address", "required": true},
            {"name": "property_address", "type": "textarea", "label": "Property Address", "required": true},
            {"name": "property_size", "type": "text", "label": "Property Size (sq ft)", "required": true},
            {"name": "lease_term", "type": "text", "label": "Lease Term", "required": true},
            {"name": "start_date", "type": "date", "label": "Lease Start Date", "required": true},
            {"name": "end_date", "type": "date", "label": "Lease End Date", "required": true},
            {"name": "monthly_rent", "type": "currency", "label": "Monthly Base Rent", "required": true},
            {"name": "security_deposit", "type": "currency", "label": "Security Deposit", "required": true},
            {"name": "permitted_use", "type": "textarea", "label": "Permitted Use of Property", "required": true},
            {"name": "utilities_included", "type": "multiselect", "label": "Utilities Included", "options": ["Electricity", "Water", "Gas", "Internet", "Trash", "HVAC", "None"], "required": false},
            {"name": "parking_spaces", "type": "number", "label": "Number of Parking Spaces", "required": false},
            {"name": "common_area_maintenance", "type": "currency", "label": "CAM Charges (monthly)", "required": false}
        ]
    }',
    'COMMERCIAL LEASE AGREEMENT\n\nThis Commercial Lease Agreement is entered into between [LANDLORD_NAME] ("Landlord") and [TENANT_NAME] ("Tenant") for the premises located at:\n\n[PROPERTY_ADDRESS]\nApproximate Size: [PROPERTY_SIZE] square feet\n\n1. LEASE TERM\nTerm: [LEASE_TERM]\nStart Date: [START_DATE]\nEnd Date: [END_DATE]\n\n2. RENT\nMonthly Base Rent: [MONTHLY_RENT]\nSecurity Deposit: [SECURITY_DEPOSIT]\nCAM Charges: [COMMON_AREA_MAINTENANCE]\n\n3. PERMITTED USE\nTenant may use the premises solely for: [PERMITTED_USE]\n\n4. PARKING\nTenant is allocated [PARKING_SPACES] parking spaces.\n\nBoth parties agree to the terms and conditions set forth in this lease agreement.\n\n___________________    ___________________\nLandlord Signature      Tenant Signature'
),
(
    'Residential Tenancy Agreement Template',
    'Standard residential lease agreement template for apartments, houses, and other residential rental properties.',
    'real_estate_document',
    'other',
    '{
        "fields": [
            {"name": "landlord_name", "type": "text", "label": "Landlord Name", "required": true},
            {"name": "landlord_contact", "type": "text", "label": "Landlord Phone/Email", "required": true},
            {"name": "tenant_names", "type": "textarea", "label": "Tenant Names (all occupants)", "required": true},
            {"name": "property_address", "type": "textarea", "label": "Rental Property Address", "required": true},
            {"name": "property_type", "type": "select", "label": "Property Type", "options": ["Apartment", "House", "Condo", "Townhouse", "Room"], "required": true},
            {"name": "lease_start", "type": "date", "label": "Lease Start Date", "required": true},
            {"name": "lease_end", "type": "date", "label": "Lease End Date", "required": true},
            {"name": "monthly_rent", "type": "currency", "label": "Monthly Rent", "required": true},
            {"name": "rent_due_date", "type": "number", "label": "Rent Due Date (day of month)", "required": true},
            {"name": "security_deposit", "type": "currency", "label": "Security Deposit", "required": true},
            {"name": "pets_allowed", "type": "select", "label": "Pets Allowed", "options": ["No pets", "Cats only", "Dogs only", "Cats and dogs", "All pets with approval"], "required": true},
            {"name": "pet_deposit", "type": "currency", "label": "Pet Deposit (if applicable)", "required": false},
            {"name": "utilities_tenant", "type": "multiselect", "label": "Utilities Paid by Tenant", "options": ["Electricity", "Gas", "Water", "Sewer", "Internet", "Cable", "Trash"], "required": false},
            {"name": "smoking_policy", "type": "select", "label": "Smoking Policy", "options": ["No smoking", "Smoking allowed outside only", "Smoking allowed"], "required": true},
            {"name": "occupancy_limit", "type": "number", "label": "Maximum Occupants", "required": true}
        ]
    }',
    'RESIDENTIAL TENANCY AGREEMENT\n\nThis Residential Tenancy Agreement is between [LANDLORD_NAME] ("Landlord") and [TENANT_NAMES] ("Tenant(s)") for the rental of:\n\n[PROPERTY_ADDRESS]\nProperty Type: [PROPERTY_TYPE]\n\n1. LEASE TERM\nLease Period: [LEASE_START] to [LEASE_END]\n\n2. RENT AND FEES\nMonthly Rent: [MONTHLY_RENT]\nRent Due: [RENT_DUE_DATE] of each month\nSecurity Deposit: [SECURITY_DEPOSIT]\nPet Deposit: [PET_DEPOSIT]\n\n3. OCCUPANCY\nMaximum occupants: [OCCUPANCY_LIMIT]\n\n4. POLICIES\nPets: [PETS_ALLOWED]\nSmoking: [SMOKING_POLICY]\n\n5. UTILITIES\nTenant responsible for: [UTILITIES_TENANT]\n\nLandlord Contact: [LANDLORD_CONTACT]\n\n___________________    ___________________\nLandlord Signature      Tenant Signature'
),
(
    'Last Will and Testament Template',
    'Comprehensive will template for distributing assets, naming guardians, and appointing executors with legal provisions.',
    'other',
    'other',
    '{
        "fields": [
            {"name": "testator_name", "type": "text", "label": "Your Full Legal Name", "required": true},
            {"name": "testator_address", "type": "textarea", "label": "Your Address", "required": true},
            {"name": "executor_name", "type": "text", "label": "Executor Name", "required": true},
            {"name": "executor_address", "type": "textarea", "label": "Executor Address", "required": true},
            {"name": "alternate_executor", "type": "text", "label": "Alternate Executor Name", "required": false},
            {"name": "spouse_name", "type": "text", "label": "Spouse Name (if applicable)", "required": false},
            {"name": "children_names", "type": "textarea", "label": "Children Names and DOB", "required": false},
            {"name": "guardian_name", "type": "text", "label": "Guardian for Minor Children", "required": false},
            {"name": "specific_bequests", "type": "textarea", "label": "Specific Bequests (item: beneficiary)", "required": false},
            {"name": "residual_beneficiary", "type": "text", "label": "Residual Estate Beneficiary", "required": true},
            {"name": "burial_wishes", "type": "textarea", "label": "Burial/Cremation Wishes", "required": false},
            {"name": "witness1_name", "type": "text", "label": "Witness 1 Name", "required": true},
            {"name": "witness2_name", "type": "text", "label": "Witness 2 Name", "required": true},
            {"name": "revoke_previous", "type": "select", "label": "Revoke Previous Wills", "options": ["Yes", "No"], "required": true}
        ]
    }',
    'LAST WILL AND TESTAMENT\n\nI, [TESTATOR_NAME], of [TESTATOR_ADDRESS], being of sound mind and disposing memory, do hereby make, publish, and declare this to be my Last Will and Testament.\n\n1. REVOCATION\nI hereby revoke all former wills and codicils made by me.\n\n2. EXECUTOR\nI nominate and appoint [EXECUTOR_NAME] of [EXECUTOR_ADDRESS] as Executor of this Will. If unable to serve, I nominate [ALTERNATE_EXECUTOR] as alternate Executor.\n\n3. GUARDIANSHIP\nIf I have minor children, I nominate [GUARDIAN_NAME] as guardian.\n\n4. SPECIFIC BEQUESTS\n[SPECIFIC_BEQUESTS]\n\n5. RESIDUAL ESTATE\nI give the rest and residue of my estate to [RESIDUAL_BENEFICIARY].\n\n6. BURIAL WISHES\n[BURIAL_WISHES]\n\nIN WITNESS WHEREOF, I have signed this Will on [DATE].\n\n___________________\n[TESTATOR_NAME], Testator\n\nWITNESSES:\n___________________    ___________________\n[WITNESS1_NAME]        [WITNESS2_NAME]'
),
(
    'Employment Contract Template',
    'Professional employment agreement template covering position details, compensation, benefits, and employment terms.',
    'employment_document',
    'other',
    '{
        "fields": [
            {"name": "company_name", "type": "text", "label": "Company Name", "required": true},
            {"name": "company_address", "type": "textarea", "label": "Company Address", "required": true},
            {"name": "employee_name", "type": "text", "label": "Employee Full Name", "required": true},
            {"name": "employee_address", "type": "textarea", "label": "Employee Address", "required": true},
            {"name": "position_title", "type": "text", "label": "Job Title/Position", "required": true},
            {"name": "department", "type": "text", "label": "Department", "required": false},
            {"name": "start_date", "type": "date", "label": "Employment Start Date", "required": true},
            {"name": "employment_type", "type": "select", "label": "Employment Type", "options": ["Full-time", "Part-time", "Contract", "Temporary"], "required": true},
            {"name": "salary_amount", "type": "currency", "label": "Annual Salary", "required": true},
            {"name": "pay_frequency", "type": "select", "label": "Pay Frequency", "options": ["Weekly", "Bi-weekly", "Monthly", "Semi-monthly"], "required": true},
            {"name": "work_hours", "type": "text", "label": "Work Schedule/Hours", "required": true},
            {"name": "vacation_days", "type": "number", "label": "Annual Vacation Days", "required": false},
            {"name": "sick_days", "type": "number", "label": "Annual Sick Days", "required": false},
            {"name": "benefits", "type": "multiselect", "label": "Benefits Included", "options": ["Health Insurance", "Dental Insurance", "Vision Insurance", "401k", "Life Insurance", "Disability Insurance"], "required": false},
            {"name": "probation_period", "type": "number", "label": "Probation Period (days)", "required": false},
            {"name": "termination_notice", "type": "number", "label": "Termination Notice (days)", "required": true},
            {"name": "confidentiality", "type": "select", "label": "Confidentiality Agreement", "options": ["Yes", "No"], "required": true}
        ]
    }',
    'EMPLOYMENT AGREEMENT\n\nThis Employment Agreement is entered into between [COMPANY_NAME] ("Company") and [EMPLOYEE_NAME] ("Employee").\n\nCOMPANY: [COMPANY_NAME]\n[COMPANY_ADDRESS]\n\nEMPLOYEE: [EMPLOYEE_NAME]\n[EMPLOYEE_ADDRESS]\n\n1. POSITION AND DUTIES\nPosition: [POSITION_TITLE]\nDepartment: [DEPARTMENT]\nStart Date: [START_DATE]\nEmployment Type: [EMPLOYMENT_TYPE]\n\n2. COMPENSATION\nAnnual Salary: [SALARY_AMOUNT]\nPay Frequency: [PAY_FREQUENCY]\n\n3. WORK SCHEDULE\n[WORK_HOURS]\n\n4. BENEFITS\nVacation Days: [VACATION_DAYS] annually\nSick Days: [SICK_DAYS] annually\nBenefits: [BENEFITS]\n\n5. PROBATION\nProbation Period: [PROBATION_PERIOD] days\n\n6. TERMINATION\nNotice Required: [TERMINATION_NOTICE] days\n\nBoth parties agree to the terms set forth in this agreement.\n\n___________________    ___________________\nCompany Representative  Employee Signature'
);