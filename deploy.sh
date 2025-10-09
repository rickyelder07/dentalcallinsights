#!/bin/bash

# DentalCallInsights - Quick Vercel Deployment Script
# This script automates the deployment process to Vercel

set -e  # Exit on any error

echo "🚀 DentalCallInsights - Vercel Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Please create it from env.example.txt"
    print_status "You can copy the example file:"
    echo "cp env.example.txt .env.local"
    echo ""
    read -p "Do you want to continue without .env.local? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled. Please create .env.local first."
        exit 1
    fi
fi

# Step 1: Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Step 2: Install dependencies
print_status "Installing dependencies..."
npm install

# Step 3: Run type checking
print_status "Running TypeScript type checking..."
if ! npm run type-check; then
    print_error "TypeScript errors found. Please fix them before deploying."
    exit 1
fi

# Step 4: Run linting
print_status "Running ESLint..."
if ! npm run lint; then
    print_warning "ESLint warnings found. Consider fixing them."
fi

# Step 5: Build the project
print_status "Building the project..."
if ! npm run build; then
    print_error "Build failed. Please fix the errors and try again."
    exit 1
fi

print_success "Build completed successfully!"

# Step 6: Deploy to Vercel
print_status "Deploying to Vercel..."
echo ""

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_status "Please log in to Vercel..."
    vercel login
fi

# Deploy the project
print_status "Starting deployment..."
vercel --prod

print_success "Deployment completed!"
echo ""
print_status "Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Add environment variables in project settings"
echo "3. Set up your Supabase production database"
echo "4. Run database migrations"
echo "5. Test your deployed application"
echo ""
print_status "For detailed instructions, see VERCEL_DEPLOYMENT_GUIDE.md"

# Step 7: Post-deployment checklist
echo ""
echo "📋 Post-Deployment Checklist:"
echo "============================="
echo "□ Add environment variables in Vercel dashboard"
echo "□ Create production Supabase project"
echo "□ Run database migrations"
echo "□ Configure authentication settings"
echo "□ Test authentication flow"
echo "□ Test file upload functionality"
echo "□ Test AI features"
echo "□ Set up custom domain (optional)"
echo "□ Configure monitoring and analytics"
echo ""
print_success "Deployment script completed!"
