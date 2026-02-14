const crypto = require('crypto');

const secret = process.env.WEBHOOK_SECRET || 'change_me_webhook';
const payload = { test: true };

const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

console.log(`Payload: ${JSON.stringify(payload)}`);
console.log(`Secret: ${secret}`);
console.log(`Signature: ${signature}`);
console.log(`\nCurl Command:`);
console.log(`curl -X POST http://localhost:4000/webhooks/mithohacks \\
  -H "Content-Type: application/json" \\
  -H "x-mh-signature: ${signature}" \\
  -d '${JSON.stringify(payload)}'`);
