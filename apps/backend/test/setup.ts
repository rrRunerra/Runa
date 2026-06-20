process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/runa';
process.env.NEXTAUTH_SECRET = 'mock-nextauth-secret-string-of-32-characters-for-testing';
process.env.INTERNAL_API_KEY = 'mock-internal-api-key';
process.env.CACHE_DRIVER = 'memory';

jest.mock('jose', () => {
  class MockSignJWT {
    constructor(private payload: any) {}
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    sign() { return Promise.resolve('mocked-jwt-token'); }
  }
  return {
    jwtVerify: jest.fn(),
    SignJWT: MockSignJWT,
  };
});

jest.mock('otplib', () => ({
  verify: jest.fn(),
}));

jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));


