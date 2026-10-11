// Legacy UI regressions use the same verified account/session and private draft
// contract as account-draft-flow.spec.js. No application guard is overridden.
const {createCloud,install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
const ids={owner:owner.id,listing:'60000000-0000-4000-8000-000000000006',room:'70000000-0000-4000-8000-000000000007',property:'40000000-0000-4000-8000-000000000004'};
async function installVerifiedAccount(page){
  const cloud=createCloud();
  const state=await install(page.context(),cloud,{signedIn:owner});
  await page.context().addInitScript(value=>{window.__verifiedFixture=value;},ids);
  return state;
}
module.exports={installVerifiedAccount,ids,owner};
