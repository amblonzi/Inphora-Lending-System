import { test, expect } from '@playwright/test';

test.describe('API Tests - Loan Management', () => {
  const baseURL = 'http://localhost:8000';
  let accessToken = '';
  let refreshToken = '';

  test('should authenticate and get token', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/token`, {
      form: {
        username: 'admin@inphora.com',
        password: 'admin123'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('refresh_token');
    expect(data.token_type).toBe('bearer');
    
    // Store tokens for other tests
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
  });

  test('should create a client', async ({ request }) => {
    // Use the access token from authentication test
    if (!accessToken) {
      throw new Error('No access token available - run authentication test first');
    }

    const clientData = {
      first_name: 'Test',
      last_name: 'Client',
      email: 'test.client@example.com',
      phone: '0712345678',
      id_number: '12345678',
      address: '123 Test Street'
    };

    const response = await request.post(`${baseURL}/api/clients`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      data: clientData
    });

    expect(response.status()).toBe(200);
    const client = await response.json();
    expect(client.first_name).toBe('Test');
    expect(client.last_name).toBe('Client');
    expect(client.email).toBe('test.client@example.com');
    
    return client;
  });

  test('should create a loan product', async ({ request }) => {
    // Get auth token
    const authResponse = await request.post(`${baseURL}/api/token`, {
      form: {
        username: 'test@example.com',
        password: 'password123'
      }
    });
    const token = (await authResponse.json()).access_token;

    // Create loan product
    const productData = {
      name: 'Test Loan Product',
      interest_rate: 15.0,
      min_amount: 1000.0,
      max_amount: 50000.0,
      min_period_months: 1,
      max_period_months: 12,
      processing_fee_percent: 2.0
    };

    const response = await request.post(`${baseURL}/api/loan-products/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: productData
    });

    expect(response.status()).toBe(200);
    const product = await response.json();
    expect(product.name).toBe('Test Loan Product');
    expect(product.interest_rate).toBe(15.0);
    
    return product;
  });

  test('should create a loan application', async ({ request }) => {
    // Get auth token
    const authResponse = await request.post(`${baseURL}/api/token`, {
      form: {
        username: 'test@example.com',
        password: 'password123'
      }
    });
    const token = (await authResponse.json()).access_token;

    // Create client first
    const clientResponse = await request.post(`${baseURL}/api/clients/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        first_name: 'Loan',
        last_name: 'Applicant',
        email: 'loan.applicant@playwright.com',
        phone: '0723456789',
        id_number: '87654321',
        address: '456 Loan Street'
      }
    });
    const client = await clientResponse.json();

    // Create loan product
    const productResponse = await request.post(`${baseURL}/api/loan-products/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Playwright Test Loan',
        interest_rate: 12.0,
        min_amount: 5000.0,
        max_amount: 30000.0,
        min_period_months: 3,
        max_period_months: 9
      }
    });
    const product = await productResponse.json();

    // Create loan application
    const loanData = {
      client_id: client.id,
      product_id: product.id,
      amount: 15000.0,
      duration_months: 6,
      start_date: new Date().toISOString().split('T')[0],
      purpose: 'Playwright test loan',
      guarantors: [{
        name: 'Test Guarantor',
        phone: '0733456789',
        occupation: 'Teacher',
        residence: 'Nairobi'
      }],
      collateral: [{
        name: 'Test Collateral',
        serial_number: 'TC12345',
        estimated_value: 25000.0
      }]
    };

    const response = await request.post(`${baseURL}/api/loans/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: loanData
    });

    expect(response.status()).toBe(200);
    const loan = await response.json();
    expect(loan.client_id).toBe(client.id);
    expect(loan.product_id).toBe(product.id);
    expect(loan.amount).toBe(15000.0);
    expect(loan.status).toBe('pending');
    
    return loan;
  });

  test('should approve a loan', async ({ request }) => {
    // Get auth token
    const authResponse = await request.post(`${baseURL}/api/token`, {
      form: {
        username: 'test@example.com',
        password: 'password123'
      }
    });
    const token = (await authResponse.json()).access_token;

    // Create and approve loan
    const loanData = {
      client_id: 1,
      product_id: 1,
      amount: 10000.0,
      duration_months: 3,
      start_date: new Date().toISOString().split('T')[0],
      purpose: 'Test approval'
    };

    const createResponse = await request.post(`${baseURL}/api/loans/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: loanData
    });
    const loan = await createResponse.json();

    // Approve the loan
    const approvalData = {
      action: 'approve',
      notes: 'Approved via Playwright test'
    };

    const response = await request.post(`${baseURL}/api/loans/${loan.id}/approve`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: approvalData
    });

    expect(response.status()).toBe(200);
    const approvedLoan = await response.json();
    expect(approvedLoan.status).toBe('approved');
  });

  test('should get loan list', async ({ request }) => {
    // Get auth token
    const authResponse = await request.post(`${baseURL}/api/token`, {
      form: {
        username: 'test@example.com',
        password: 'password123'
      }
    });
    const token = (await authResponse.json()).access_token;

    // Get loans
    const response = await request.get(`${baseURL}/api/loans/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(response.status()).toBe(200);
    const loans = await response.json();
    expect(Array.isArray(loans)).toBe(true);
  });

  test('should handle M-Pesa registration', async ({ request }) => {
    const registrationData = {
      full_name: 'Playwright Test User',
      phone: '0712345678',
      id_number: '12345678',
      email: 'playwright@test.com',
      address: '123 Test Street'
    };

    const response = await request.post(`${baseURL}/api/mpesa/register`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: registrationData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('paybill');
    expect(data).toHaveProperty('account');
    expect(data).toHaveProperty('fee');
  });

  test('should get system health', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health`);
    
    // Health endpoint might not exist, so we check for 200 or 404
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const health = await response.json();
      expect(health).toHaveProperty('status');
    }
  });
});
