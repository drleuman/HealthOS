$body = '{"order_id":"HARDEN-789","email":"test@example.com","items":[{"product_slug":"blue_light_glasses","qty":1}]}'
$secret = "dev_webhook"
$utf8 = New-Object System.Text.UTF8Encoding
$bodyBytes = $utf8.GetBytes($body)

$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = $utf8.GetBytes($secret)
$sig = "sha256=" + [System.BitConverter]::ToString($hmac.ComputeHash($bodyBytes)).Replace("-", "").ToLower()

Write-Host "Signature: $sig"

# Using curl.exe directly
& curl.exe -s -i -X POST http://localhost:4000/webhooks/mithohacks/order `
    -H "x-mh-signature: $sig" `
    -H "Content-Type: application/json" `
    -d $body
