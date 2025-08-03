import { useEffect } from 'react';

const PrintStyles = () => {
  useEffect(() => {
    // Create and inject print styles securely
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    
    const printStyles = `
      @media print {
        .print\\:hidden {
          display: none !important;
        }
        .print\\:shadow-none {
          box-shadow: none !important;
        }
        .print\\:border {
          border: 1px solid #000 !important;
        }
        .print\\:break-after {
          break-after: page;
        }
        .print\\:p-8 {
          padding: 2rem !important;
        }
        .print\\:text-sm {
          font-size: 0.875rem !important;
        }
        .print\\:mt-8 {
          margin-top: 2rem !important;
        }
        .print\\:mb-4 {
          margin-bottom: 1rem !important;
        }
        .print\\:text-center {
          text-align: center !important;
        }
        .print\\:font-medium {
          font-weight: 500 !important;
        }
      }
    `;
    
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    
    // Cleanup on unmount
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  return null;
};

export default PrintStyles;