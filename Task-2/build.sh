#!/bin/bash
set -e

PACKAGE_DIR="package"
ZIP_FILE="lambda.zip"

echo "Cleaning previous build..."
rm -rf "$PACKAGE_DIR" "$ZIP_FILE"

echo "Installing dependencies..."
python -m pip install -r requirements.txt -t "$PACKAGE_DIR/" --quiet --no-cache-dir

echo "Copying app..."
cp -r app     "$PACKAGE_DIR/app"
cp -r config  "$PACKAGE_DIR/config"

echo "Done — select everything inside the '$PACKAGE_DIR/' folder and zip it manually."
