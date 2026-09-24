const isProd = process.env.NODE_ENV === 'production';
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (isProd) {
    throw new Error('JWT_SECRET environment variable must be set in production!');
  }
  JWT_SECRET = 'dev-only-secret-not-for-production';
  console.warn('[config] JWT_SECRET missing — using insecure dev fallback secret');
}

module.exports = {
  JWT_SECRET,
  isProd,
};
