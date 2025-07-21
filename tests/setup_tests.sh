#!/bin/bash

# setup_tests.sh - Setup script for Dave - Digital Assets Viewer Extraordiner tests

echo "🚀 Setting up Dave - Digital Assets Viewer Extraordiner Test Suite"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
echo -e "\n1. Checking Node.js..."
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check npm
echo -e "\n2. Checking npm..."
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found. Please install npm first.${NC}"
    exit 1
fi

# Install dependencies
echo -e "\n3. Installing test dependencies..."
cd "$(dirname "$0")"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Install Playwright browsers
echo -e "\n4. Installing Playwright browsers..."
npx playwright install chromium
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Playwright browsers installed${NC}"
else
    echo -e "${RED}✗ Failed to install Playwright browsers${NC}"
    exit 1
fi

# Check if server is running
echo -e "\n5. Checking server status..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running on port 8080${NC}"
else
    echo -e "${YELLOW}⚠ Server is not running${NC}"
    echo "  Start the server with: npm start"
fi

# Check TestFolder
echo -e "\n6. Checking TestFolder..."
TEST_FOLDER="/mnt/c/Users/drorl/Documents/Sett/Tools/HTMLPreviewer/TestFolder"
if [ -d "$TEST_FOLDER" ]; then
    FILE_COUNT=$(ls -1 "$TEST_FOLDER" | wc -l)
    echo -e "${GREEN}✓ TestFolder found with $FILE_COUNT files${NC}"
else
    echo -e "${RED}✗ TestFolder not found at: $TEST_FOLDER${NC}"
fi

# Make scripts executable
echo -e "\n7. Making scripts executable..."
chmod +x run_tests.js quick_test.js
echo -e "${GREEN}✓ Scripts are now executable${NC}"

# Summary
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✨ Setup complete!${NC}"
echo -e "\nNext steps:"
echo -e "1. Make sure the server is running: ${YELLOW}npm start${NC}"
echo -e "2. Run quick environment check: ${YELLOW}node quick_test.js${NC}"
echo -e "3. Run all tests: ${YELLOW}npm test${NC}"
echo -e "\nFor more options, see README.md"