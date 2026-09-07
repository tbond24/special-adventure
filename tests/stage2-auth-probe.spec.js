const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

const API='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const PUBLIC_KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';

test('disposable account gets a usable session and can self-delete', async ({ request }) => {
  const nonce=crypto.randomUUID();
  const name='Vacancy Stage 2 Probe';
  const email=`stage2-${nonce}@example.invalid`;
  const secret=`S2-${nonce}-aA9`;

  const signup=await request.post(`${API}/functions/v1/secure-signup`,{
    headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},
    data:{name,email,password:secret}
  });
  expect(signup.ok(),await signup.text()).toBeTruthy();
  const created=await signup.json();

  let token=created.access_token || created.session?.access_token || null;
  if(!token){
    const signin=await request.post(`${API}/auth/v1/token?grant_type=password`,{
      headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},
      data:{email,password:secret}
    });
    expect(signin.ok(),await signin.text()).toBeTruthy();
    token=(await signin.json()).access_token;
  }
  expect(token).toBeTruthy();

  const me=await request.get(`${API}/auth/v1/user`,{
    headers:{apikey:PUBLIC_KEY,Authorization:`Bearer ${token}`}
  });
  expect(me.ok(),await me.text()).toBeTruthy();

  const cleanup=await request.post(`${API}/functions/v1/delete-account`,{
    headers:{apikey:PUBLIC_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    data:{}
  });
  expect(cleanup.ok(),await cleanup.text()).toBeTruthy();
});
