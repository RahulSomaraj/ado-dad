export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
};

export const E_MAIL = {
  CREDIT_EMAIL_SUBJECT: `
    You are recieving this email because you recently paid your credits for newshop in store <store_name>
  `,
  CREDIT_EMAIL_BODY: `
  Hello <customername>,

  Here are the invoices for the recent payment made at <store_name>:

  please find the attached invoices 
  
  Best Regards,
  The New Shop
  <store_name>`,
};

export const INVOICE_E_MAIL = {
  INVOICE_EMAIL_SUBJECT: `
    You are recieving this email because you are a customer of newshop in store <store_name>
  `,
  INVOICE_EMAIL_BODY: `
  Hello <customername>,

  Here are the invoices for for your purchases made at <store_name>:

  please find the attached invoices 
  
  Best Regards,
  The New Shop
  <store_name>`,
};

export const SMS_BODY = {
  CREDIT_MESSAGE_SUBJECT: `
  Hello <customername>,

  You are recieving this message because you recently 
  paid your credits for newshop in store <store_name>: 
  
  <invoices>

  Best Regards,
  The New Shop
  <store_name>`,
};
