#!/bin/bash

# Vehicle Inventory CRUD Tests
# This script runs comprehensive tests for vehicle manufacturers and models

echo "🚗 Starting Vehicle Inventory CRUD Tests..."
echo "=========================================="

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Check if the application is running
print_status "Checking if the application is running..."
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_warning "Application is not running on localhost:3000"
    print_status "Please start the application first: npm run start:dev"
    exit 1
fi

print_success "Application is running!"

# Run the tests
echo ""
print_status "Running Vehicle Manufacturers CRUD tests..."
npx jest test/vehicle-inventory-manufacturers.e2e-spec.ts --config=jest-e2e.json --verbose

if [ $? -eq 0 ]; then
    print_success "Manufacturers tests passed!"
else
    print_error "Manufacturers tests failed!"
    exit 1
fi

echo ""
print_status "Running Vehicle Models CRUD tests..."
npx jest test/vehicle-inventory-models.e2e-spec.ts --config=jest-e2e.json --verbose

if [ $? -eq 0 ]; then
    print_success "Models tests passed!"
else
    print_error "Models tests failed!"
    exit 1
fi

echo ""
echo "=========================================="
print_success "All Vehicle Inventory CRUD tests completed successfully!"
echo ""

# Optional: Run with coverage
read -p "Do you want to run tests with coverage? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running tests with coverage..."
    npx jest test/vehicle-inventory-*.e2e-spec.ts --config=jest-e2e.json --coverage --verbose
fi

echo ""
print_success "Test execution completed!" 