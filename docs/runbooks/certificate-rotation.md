# Runbook: Certificate Rotation (Nginx TLS)

**Phạm vi:** P0-TLS-06 — Certificate rotation cho Nginx reverse proxy  
**Người thực hiện:** DevOps/SRE (OPS)  
**Người phê duyệt:** Engineering Lead (EL)  
**Trigger:** Certificate hết hạn trong 30 ngày (alert tự động) hoặc khi cần rotate khẩn cấp

---

## Kiến trúc TLS hiện tại

```
Internet → Nginx (port 443, TLS termination) → internal_net (plain HTTP)
                                             → admin-backend:5000
                                             → attendance-service:5001
                                             → admin-frontend:80
```

Certificates được mount vào Nginx container từ:
- `./deployment/nginx/certs/fullchain.pem`
- `./deployment/nginx/certs/privkey.pem`

---

## Alert Certificate Expiry

### Cấu hình alert (Prometheus / Grafana hoặc shell script)

Để nhận cảnh báo trước 30 ngày, chạy script định kỳ hoặc dùng Prometheus `ssl_cert_expiry` metric:

**Cách 1: Shell script (cron)**

```bash
# Thêm vào crontab để chạy hàng ngày lúc 8:00 SA
# crontab -e
0 8 * * * /opt/employee-management/scripts/check-cert-expiry.sh >> /var/log/cert-check.log 2>&1
```

Tạo file `/opt/employee-management/scripts/check-cert-expiry.sh`:

```bash
#!/bin/bash
CERT_PATH="/opt/employee-management/deployment/nginx/certs/fullchain.pem"
WARN_DAYS=30
ALERT_EMAIL="devops@yourcompany.com"

if [ ! -f "$CERT_PATH" ]; then
    echo "[CERT-CHECK] ERROR: Certificate file not found: $CERT_PATH"
    exit 1
fi

EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "[CERT-CHECK] Certificate expires: $EXPIRY ($DAYS_LEFT days left)"

if [ $DAYS_LEFT -le $WARN_DAYS ]; then
    echo "[CERT-CHECK] WARNING: Certificate expires in $DAYS_LEFT days!"
    echo "Subject: [ALERT] TLS Certificate expires in $DAYS_LEFT days" | \
        sendmail "$ALERT_EMAIL" || true
fi
```

**Cách 2: Prometheus + Grafana (nếu đã setup)**

Dùng `blackbox_exporter` với probe `ssl`:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ssl_cert'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets: ['https://your-domain.com']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: instance
        replacement: your-domain.com
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

Alert rule:
```yaml
- alert: SSLCertExpiringSoon
  expr: probe_ssl_earliest_cert_expiry - time() < 30 * 24 * 3600
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "TLS certificate expires in less than 30 days"
    runbook: "docs/runbooks/certificate-rotation.md"
```

---

## Quy trình Rotation Certificate (Let's Encrypt / Certbot)

### Bước 1 — Renewal tự động (Certbot)

Nếu dùng Let's Encrypt với Certbot:

```bash
# Test renewal (dry-run)
certbot renew --dry-run

# Thực sự renew
certbot renew --cert-name your-domain.com

# Copy cert mới vào thư mục deployment
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
   /opt/employee-management/deployment/nginx/certs/fullchain.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
   /opt/employee-management/deployment/nginx/certs/privkey.pem

# Đặt permission đúng
chmod 644 deployment/nginx/certs/fullchain.pem
chmod 600 deployment/nginx/certs/privkey.pem
```

### Bước 2 — Reload Nginx (không downtime)

```bash
cd /opt/employee-management

# Reload config nginx trong container (graceful, không downtime)
docker compose exec reverse-proxy nginx -s reload

# Hoặc nếu cần restart hẳn
docker compose restart reverse-proxy
```

### Bước 3 — Verify

```bash
# Kiểm tra cert mới đã được load
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | \
    openssl x509 -noout -dates

# Hoặc dùng curl
curl -v https://your-domain.com/health 2>&1 | grep -i "expire"
```

Kết quả mong đợi: `notAfter` phải là ngày mới, sau renewal.

---

## Quy trình Rotation Certificate (Manual / Self-signed / CA khác)

### Bước 1 — Tạo hoặc nhận cert mới

Nhận cert mới từ CA (Comodo, DigiCert, etc.) hoặc tạo mới:
```bash
# Tạo CSR
openssl req -new -newkey rsa:4096 -keyout privkey.pem -out domain.csr \
  -subj "/CN=your-domain.com/O=YourOrg/C=VN"

# Gửi domain.csr cho CA, nhận lại fullchain.pem
```

### Bước 2 — Backup cert cũ

```bash
BACKUP_DIR="deployment/nginx/certs/backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"
cp deployment/nginx/certs/fullchain.pem "$BACKUP_DIR/"
cp deployment/nginx/certs/privkey.pem "$BACKUP_DIR/"
echo "Backed up to $BACKUP_DIR"
```

### Bước 3 — Deploy cert mới

```bash
cp /path/to/new/fullchain.pem deployment/nginx/certs/fullchain.pem
cp /path/to/new/privkey.pem deployment/nginx/certs/privkey.pem
chmod 644 deployment/nginx/certs/fullchain.pem
chmod 600 deployment/nginx/certs/privkey.pem
```

### Bước 4 — Test config trước khi reload

```bash
docker compose exec reverse-proxy nginx -t
# Output phải là: nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Bước 5 — Reload

```bash
docker compose exec reverse-proxy nginx -s reload
```

### Bước 6 — Verify và log

```bash
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | \
    openssl x509 -noout -subject -dates

# Ghi log rotation
echo "$(date -u): Certificate rotated by $(whoami). Expiry: $(echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -enddate)" \
    >> /var/log/cert-rotation.log
```

---

## Rollback

Nếu cert mới gây lỗi:

```bash
# Restore cert cũ từ backup
cp deployment/nginx/certs/backup-YYYYMMDD/fullchain.pem deployment/nginx/certs/
cp deployment/nginx/certs/backup-YYYYMMDD/privkey.pem deployment/nginx/certs/
docker compose exec reverse-proxy nginx -s reload
```

---

## Checklist rotation

- [ ] Alert đã được test trigger (30 ngày trước expiry)
- [ ] Backup cert cũ đã tạo
- [ ] Cert mới đã được verify hợp lệ (`openssl verify`)
- [ ] `nginx -t` pass trước reload
- [ ] Sau reload: `curl https://your-domain.com/health` → 200
- [ ] Certificate expiry date mới đã được confirm
- [ ] Log rotation đã ghi
- [ ] Thông báo team (Slack/email)

---

## Tự động hóa với Certbot (Cron)

```bash
# /etc/cron.d/certbot
0 3 * * * root certbot renew --quiet --deploy-hook "docker compose -f /opt/employee-management/docker-compose.yml exec -T reverse-proxy nginx -s reload && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/employee-management/deployment/nginx/certs/ && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/employee-management/deployment/nginx/certs/"
```

---

**Ngày rotation gần nhất:** _________________  
**Người thực hiện:** _________________  
**Ngày hết hạn cert hiện tại:** _________________  
**Ngày hết hạn cert mới:** _________________
