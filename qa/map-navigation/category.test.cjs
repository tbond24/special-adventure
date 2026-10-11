const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../app/src/stage64-usability-categories.js'),'utf8'),context={};
vm.runInNewContext(source.slice(0,source.indexOf('function stage64Icon')),context);
for(const [unit,property,type,category] of [
 ['Room','House','room','apartment'],['Studio','House','apartment','apartment'],['Bedsitter','House','room','apartment'],['Hostel','House','room','apartment'],
 ['1 bedroom apartment','House','1bed','apartment'],['2-bdrm apartment','House','2bed','apartment'],['3 bedroom apartment','House','apartment','apartment'],
 ['House','Apartment block','house','home'],['1 bedroom house','Compound','house','home'],['4 bedroom house','Compound','house','home'],['Townhouse','Apartment block','house','home'],
 ['Shop','House','shop','shop'],['Retail unit','House','shop','shop'],['Commercial unit','House','shop','shop'],
 ['Warehouse','House','other','other'],['Workshop','Apartment block','other','other'],['Parking space','House','other','other'],['Office','House','other','other'],
 ['3+ bedrooms','Apartment','room','apartment'],['3bdrm','Apartment','room','apartment'],['2brm','House','2bed','apartment'],['Room in shared house','House','room','apartment'],['Showroom','House','other','other'],
 ['', 'House','house','home'],['','','other','other']
])test(`${unit||'(missing unit)'} in ${property||'(missing property)'} uses ${type}/${category}`,()=>{const listing={room:{roomType:unit},property:{propertyType:property}};assert.equal(context.vacancyListingType(listing),type);assert.equal(context.vacancyCategory(listing),category)});
test('filter and both optional map engines delegate classification to the shared classifier',()=>{for(const file of ['stage76-viewport-listings.js','stage93-openfreemap-preview.mjs','stage96-openfreemap-fast.mjs'])assert.match(fs.readFileSync(path.join(__dirname,'../../app/src',file),'utf8'),/return vacancyListingType\(v\)|=> vacancyListingType\(listing\)/)});
