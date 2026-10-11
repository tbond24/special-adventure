const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../app/src',name),'utf8');
const removals=[
 ['stage58-marketplace.js','Your name and optional photo identify you to other members. Your account email stays private.'],
 ['stage58-marketplace.js','<small>Name and photo</small>'],
 ['stage58-marketplace.js','<small>Sign-in and safety controls</small>'],
 ['stage77-admin-mfa.js','Manage an authenticator for additional verification'],
 ['stage77-admin-mfa.js','An authenticator provides the additional verification required for admin access.'],
 ['listing-account-ui.js','An account is required to publish. Until then, your draft and photos stay on this device.'],
 ['listing-guest-entry.js','Your listing and photos are saved on this device. Sign in or create an account to save them privately to your account, then review and publish. If an email link opens another tab, return to this tab to continue.'],
];
for(const [file,copy] of removals)test('removes requested copy: '+copy,()=>assert.ok(!read(file).includes(copy)));
test('retains functional controls, warnings, and account recovery guidance',()=>{
 assert.match(read('listing-account-ui.js'),/Discard device draft/);
 assert.match(read('listing-account-ui.js'),/Retry save/);
 assert.match(read('listing-account-ui.js'),/Not synced to your account/);
 assert.match(read('listing-guest-entry.js'),/Back to your listing/);
 assert.match(read('listing-guest-entry.js'),/document.querySelector\('#returnToListingDraft'\)/);
 assert.ok(!read('listing-guest-entry.js').includes('listingAuthNotice'));
 assert.match(read('stage58-marketplace.js'),/Manage your Google password in your Google Account/);
 assert.match(read('stage58-marketplace.js'),/Signs out this account on every device/);
 assert.match(read('stage58-marketplace.js'),/Photo changes save immediately/);
 assert.match(read('stage77-admin-mfa.js'),/No verified authenticator is set up/);
 assert.match(read('stage77-admin-mfa.js'),/data-start-mfa-setup/);
});
