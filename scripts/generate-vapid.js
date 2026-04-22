const webpush = require("web-push");
const keys = webpush.generateVAPIDKeys();
console.log("\n✅ VAPID Keys Generated!\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_EMAIL=your@email.com`);
console.log(`CRON_SECRET=<any-random-string>`);
console.log();
