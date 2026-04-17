const { getLangName } = require('./utils/localization');

const dbName = "{\"EN\":\"AKMU\",\"KO\":\"악동뮤지션\",\"ES\":\"AKMU\"}";
console.log('Input:', dbName);
console.log('Result (KO):', getLangName(dbName, 'KO'));
console.log('Result (EN):', getLangName(dbName, 'EN'));

const dbObject = JSON.parse(dbName);
console.log('Result Object (KO):', getLangName(dbObject, 'KO'));
