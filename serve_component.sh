#!/bin/bash

# Base directory where components are stored
BASE_DIR="$HOME/workspace/components"

# Function to display usage information
usage() {
  echo "Usage: servecomp  [use-cwd] <component-name> [port]"
  echo "  [use-cwd]        - Optional flag to use the current working directory (1 for yes, 0 for no). Default is 0 (use BASE_DIR)."
  echo "  <component-name>  - The name of the component to serve."
  echo "  [port]           - Optional custom port (default is 3333)."
  exit 1
}

# Parse arguments
USE_CWD=0 # Default to using BASE_DIR
if [[ "$1" =~ ^[01]$ ]]; then
  USE_CWD="$1"
  COMPONENT_NAME="$2"
  PORT="${3:-3333}" # Default port is 3333
else
  COMPONENT_NAME="$1"
  PORT="${2:-3333}" # Default port is 3333
fi

# Validate component name
if [[ -z "$COMPONENT_NAME" ]]; then
  usage
fi

# Determine the component directory
if [[ "$USE_CWD" == "1" ]]; then
  COMPONENT_DIR="$PWD/$COMPONENT_NAME"
else
  COMPONENT_DIR="$BASE_DIR/$COMPONENT_NAME"
fi

# Check if the component directory exists
if [[ ! -d "$COMPONENT_DIR" ]]; then
  echo "Error: Component '$COMPONENT_NAME' does not exist in the '$BASE_DIR' directory."
  exit 1
fi

# Ensure NVM is sourced
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
else
  echo "Error: NVM is not installed or not sourced correctly. Please ensure NVM is installed and try again."
  exit 1
fi

# Switch to Node.js version 14
nvm use 14 || {
  echo "Failed to switch to Node.js 14. Ensure it's installed."
  exit 1
}

# Kill the default port if no custom port is provided
if [[ "$PORT" == "3333" ]]; then
  echo "Killing any process using port 3333..."
  lsof -ti:3333 | xargs kill -9 2>/dev/null || echo "No process running on port 3333"
fi

# Change directory to the component
cd "$COMPONENT_DIR" || exit 1

# Install dependencies if node_modules is missing
if [[ ! -d "node_modules" ]]; then
  echo "Installing dependencies for '$COMPONENT_NAME'..."
  npm install
fi

# Run the serve command
echo "Starting server for '$COMPONENT_NAME' on port $PORT..."
npm run serve -- --port "$PORT"
