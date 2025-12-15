#!/bin/bash
# ======================================
# Generate Self-Signed SSL Certificate
# ======================================
# Creates self-signed certificates for development/testing
#
# Usage:
#   ./generate-ssl.sh [domain]
#
# Examples:
#   ./generate-ssl.sh                    # Uses 'localhost'
#   ./generate-ssl.sh myapp.local        # Uses custom domain
#
# ======================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${1:-localhost}"

echo "Generating self-signed SSL certificate for: $DOMAIN"
echo ""

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SCRIPT_DIR/key.pem" \
  -out "$SCRIPT_DIR/cert.pem" \
  -subj "/C=US/ST=Development/L=Local/O=CoreApp/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1"

# Set permissions
chmod 644 "$SCRIPT_DIR/cert.pem"
chmod 600 "$SCRIPT_DIR/key.pem"

echo ""
echo "Certificate generated successfully!"
echo ""
echo "Files created:"
echo "  - $SCRIPT_DIR/cert.pem (certificate)"
echo "  - $SCRIPT_DIR/key.pem (private key)"
echo ""
echo "Certificate details:"
openssl x509 -in "$SCRIPT_DIR/cert.pem" -noout -subject -dates
echo ""
echo "Note: This is a self-signed certificate for development only."
echo "For production, use Let's Encrypt or a commercial CA."
