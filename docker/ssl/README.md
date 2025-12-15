# SSL Certificate Configuration

This directory contains SSL certificates for the production Nginx server.

## Required Files

- `cert.pem` - SSL certificate (full chain)
- `key.pem` - Private key

## Development: Generate Self-Signed Certificates

For local development/testing, generate self-signed certificates:

```bash
# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

Or use the provided script:

```bash
./generate-ssl.sh localhost
```

## Production: Using Let's Encrypt

For production, use Let's Encrypt for free SSL certificates:

### Option 1: Certbot with Docker

```bash
# Stop nginx first
docker-compose -f docker-compose.prod.yml stop frontend

# Generate certificates
docker run -it --rm \
  -v $(pwd)/docker/ssl:/etc/letsencrypt/live/yourdomain.com \
  -v $(pwd)/docker/certbot:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email

# Copy certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/key.pem

# Start nginx
docker-compose -f docker-compose.prod.yml start frontend
```

### Option 2: Certbot on Host

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates (stop nginx temporarily)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Link certificates
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/key.pem
```

### Auto-Renewal

Set up automatic renewal with cron:

```bash
# Edit crontab
crontab -e

# Add renewal (runs twice daily)
0 0,12 * * * certbot renew --quiet --deploy-hook "docker-compose -f /path/to/docker-compose.prod.yml restart frontend"
```

## Using Cloudflare or Other CDN

If using Cloudflare:

1. Set SSL mode to "Full (strict)" in Cloudflare dashboard
2. Generate origin certificate in Cloudflare:
   - SSL/TLS > Origin Server > Create Certificate
   - Download certificate and key
   - Save as `cert.pem` and `key.pem`

## Security Notes

1. **Never commit private keys** - Add `*.pem` to `.gitignore`
2. **Set proper permissions**:
   ```bash
   chmod 644 cert.pem
   chmod 600 key.pem
   ```
3. **Regular rotation** - Certificates should be rotated annually at minimum
4. **Monitor expiration** - Use the deploy script: `./docker/scripts/deploy.sh ssl-check`

## Troubleshooting

### Certificate Chain Issues

If browsers show "certificate not trusted":

```bash
# Verify certificate chain
openssl verify -CAfile chain.pem cert.pem

# Check certificate details
openssl x509 -in cert.pem -text -noout
```

### Key Mismatch

If nginx fails to start with key mismatch error:

```bash
# Check if key matches certificate
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5
# Both should output the same MD5 hash
```
