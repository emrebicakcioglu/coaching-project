/**
 * Setup Script for Core Application
 *
 * This script initializes the .env file from .env.example
 * Run with: npm run setup
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');
const logsPath = path.join(__dirname, '../logs');

/**
 * Creates the logs directory if it doesn't exist
 */
const createLogsDirectory = () => {
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
    console.log('✅ Created logs directory');
  }
};

/**
 * Prompts user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} - User's response
 */
const askQuestion = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

/**
 * Main setup function
 */
const setupEnv = async () => {
  console.log('');
  console.log('================================');
  console.log('  Core Application Setup');
  console.log('================================');
  console.log('');

  // Check if .env.example exists
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ Error: .env.example not found');
    console.error('   Please ensure .env.example exists in the project root.');
    process.exit(1);
  }

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists');

    // Check if running in non-interactive mode (CI/CD)
    if (process.env.CI || process.env.FORCE_SETUP) {
      console.log('   Running in non-interactive mode, skipping...');
      createLogsDirectory();
      return;
    }

    const overwrite = await askQuestion('   Do you want to overwrite it? (y/N): ');

    if (!overwrite) {
      console.log('   Keeping existing .env file');
      createLogsDirectory();
      console.log('');
      console.log('✅ Setup complete');
      return;
    }
  }

  // Copy .env.example to .env
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from .env.example');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    process.exit(1);
  }

  // Create logs directory
  createLogsDirectory();

  console.log('');
  console.log('⚠️  IMPORTANT: Please edit .env and configure your values:');
  console.log('');
  console.log('   Required configuration:');
  console.log('   - DB_PASSWORD: Your PostgreSQL password');
  console.log('   - JWT_SECRET: A secure random string (min 32 chars)');
  console.log('   - RESEND_API_KEY: Your Resend.com API key');
  console.log('   - EMAIL_FROM_ADDRESS: Your verified email address');
  console.log('');
  console.log('   Optional configuration:');
  console.log('   - Update APP_URL for your deployment');
  console.log('   - Configure MinIO settings if using file storage');
  console.log('');
  console.log('✅ Setup complete');
  console.log('');
};

// Run setup
setupEnv().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
