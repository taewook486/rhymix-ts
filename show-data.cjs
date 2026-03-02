const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.moai/specs/SPEC-RHYMIX-001/screenshots/asis/raw-results-v2.json', 'utf8'));
const links = JSON.parse(fs.readFileSync('.moai/specs/SPEC-RHYMIX-001/screenshots/asis/discovered-links.json', 'utf8'));

console.log('=== DISCOVERED LINKS ===');
links.forEach(function(l) { console.log(l.text + ' -> ' + l.href); });

console.log('\n=== PAGE TITLES ===');
const keys = Object.keys(data);
for (let i = 0; i < keys.length; i++) {
  const k = keys[i];
  const v = data[k];
  if (v && v.docTitle !== undefined) {
    console.log(k + ': "' + v.docTitle + '" [' + v.currentUrl + '] forms=' + (v.forms ? v.forms.length : 0) + ' tables=' + (v.tables ? v.tables.length : 0));
  }
}
