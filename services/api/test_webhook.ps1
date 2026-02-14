$body = '{"order_id":"HARDEN-123","email":"test@example.com","items":[{"product_slug":"blue_light_glasses","qty":1}]}'
$secret = "dev_webhook"
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secret)
$sig = "sha256=" + [System.BitConverter]::ToString($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($body))).Replace("-", "").ToLower()

# Test 1: Valid Signature
Write-Host "Test 1: Sending valid webhook..."
$res1 = Invoke-WebRequest -Method Post -Uri "http://localhost:4000/webhooks/mithohacks/order" -Headers @{"x-mh-signature"=$sig; "Content-Type"="application/json"} -Body $body -ErrorAction SilentlyContinue
Write-Host "Status: $($res1.StatusCode) - $($res1.Content)"

# Test 2: Invalid Signature
Write-Host "`nTest 2: Sending invalid signature..."
$res2 = Invoke-WebRequest -Method Post -Uri "http://localhost:4000/webhooks/mithohacks/order" -Headers @{"x-mh-signature"="sha256=invalid"; "Content-Type"="application/json"} -Body $body -ErrorAction SilentlyContinue
Write-Host "Status: $($res2.StatusCode) - $($res2.Content)"

# Test 3: Idempotency (Same order_id)
Write-Host "`nTest 3: Sending same order (Idempotency)..."
$res3 = Invoke-WebRequest -Method Post -Uri "http://localhost:4000/webhooks/mithohacks/order" -Headers @{"x-mh-signature"=$sig; "Content-Type"="application/json"} -Body $body -ErrorAction SilentlyContinue
Write-Host "Status: $($res3.StatusCode) - $($res3.Content)"
