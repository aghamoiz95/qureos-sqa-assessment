import 'dotenv/config';

export const config = {
  baseUrl: process.env.QUREOS_BASE_URL ?? 'https://new-stg.qureos.com',
  apiBaseUrl: process.env.QUREOS_API_BASE_URL ?? 'https://api-v3-stg.qureos.com',
  corporateEmail: process.env.QUREOS_CORPORATE_EMAIL ?? '',
  corporatePassword: process.env.QUREOS_CORPORATE_PASSWORD ?? ''
};

export function validateConfig() {
  const missing = Object.entries({
    QUREOS_CORPORATE_EMAIL: config.corporateEmail,
    QUREOS_CORPORATE_PASSWORD: config.corporatePassword
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
