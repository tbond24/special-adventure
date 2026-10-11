const {test,expect}=require('@playwright/test');
const handler=require('../../app/api/visitor-country.js');
function request(headers={},method='GET'){
 const response={headers:{},setHeader(key,value){this.headers[key]=value},status(value){this.code=value;return this},json(value){this.body=value;return this}};
 handler({method,headers},response);return response;
}
for(const [label,value] of [['missing',undefined],['empty',''],['whitespace','  '],['null',null],['array',[]],['boolean',false],['invalid','unknown'],['infinite','Infinity']]){
 test(`visitor coordinates reject ${label} raw headers`,()=>{
  const result=request({'x-vercel-ip-country':'au','x-vercel-ip-latitude':value,'x-vercel-ip-longitude':value});
  expect(result.code).toBe(200);expect(result.body).toEqual({country:'AU',latitude:null,longitude:null});
  expect(result.headers['Cache-Control']).toBe('private, no-store');
 });
}
test('visitor coordinates accept actual zero and valid signed decimal headers',()=>{
 expect(request({'x-vercel-ip-latitude':'0','x-vercel-ip-longitude':'0'}).body).toEqual({country:null,latitude:0,longitude:0});
 expect(request({'x-vercel-ip-country':'AU','x-vercel-ip-latitude':'-31.95','x-vercel-ip-longitude':'115.86'}).body).toEqual({country:'AU',latitude:-31.95,longitude:115.86});
});
test('visitor coordinates reject out-of-range headers and malformed countries',()=>{
 expect(request({'x-vercel-ip-country':'Australia','x-vercel-ip-latitude':'91','x-vercel-ip-longitude':'181'}).body).toEqual({country:null,latitude:null,longitude:null});
 expect(request({'x-vercel-ip-latitude':'-91','x-vercel-ip-longitude':'-181'}).body).toEqual({country:null,latitude:null,longitude:null});
});
test('visitor coordinates preserve GET-only endpoint',()=>{expect(request({},'POST').code).toBe(405)});
