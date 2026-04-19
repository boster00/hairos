# Start Stripe CLI with the sandbox account API key
# This ensures Stripe CLI listens to the same account as your sandbox test keys

Write-Host "Starting Stripe CLI for SANDBOX account..." -ForegroundColor Cyan
Write-Host "Using API key: sk_test_51SB8UI... (Account acct_1SB8UI...)" -ForegroundColor Yellow
Write-Host ""

stripe listen --forward-to localhost:3000/api/webhook/stripe --api-key STRIPE_TEST_KEY_REMOVED

# The webhook secret printed by this command should match STRIPE_WEBHOOK_SECRET_SANDBOX_TEST in .env.local
