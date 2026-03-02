const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.moai/specs/SPEC-RHYMIX-001/screenshots/asis/raw-results.json', 'utf8'));

for (const [key, val] of Object.entries(data)) {
  if (!val.error) {
    const hasContent = (val.forms && val.forms.length > 0) || (val.tables && val.tables.length > 0) || (val.buttons && val.buttons.length > 0);
    const status = hasContent ? 'OK' : 'EMPTY';
    console.log('[' + status + '] ' + key + ': forms=' + (val.forms ? val.forms.length : 0) + ', tables=' + (val.tables ? val.tables.length : 0) + ', buttons=' + (val.buttons ? val.buttons.length : 0) + ', links=' + (val.adminLinks ? val.adminLinks.length : 0) + ', url=' + val.currentUrl);
  } else {
    console.log('[ERR] ' + key + ': ' + val.error);
  }
}
