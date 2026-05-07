#!/bin/bash
set -e

PACKAGE_DIR="package"
ZIP_FILE="lambda.zip"

echo "Cleaning previous build..."
rm -rf "$PACKAGE_DIR" "$ZIP_FILE"

echo "Installing dependencies..."
python3 -m pip install -r requirements.txt -t "$PACKAGE_DIR/" \
  --no-cache-dir \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all:

echo "Copying app..."
cp -r app     "$PACKAGE_DIR/app"
cp -r config  "$PACKAGE_DIR/config"

echo "Creating zip..."
cd "$PACKAGE_DIR" && zip -r "../$ZIP_FILE" . && cd ..

echo "Done — $ZIP_FILE created."
