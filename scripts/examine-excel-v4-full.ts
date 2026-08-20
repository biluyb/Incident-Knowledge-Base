import * as XLSX from 'xlsx';

const wb = XLSX.readFile('/home/bililign/Downloads/Incident_Knowledge_Base_Classified_v4(1).xlsx');

// Get full taxonomy
const taxSheet = wb.Sheets['Classification_Taxonomy'];
const taxData = XLSX.utils.sheet_to_json<any>(taxSheet, { header: 1, defval: '' });
console.log('=== FULL CLASSIFICATION TAXONOMY ===');
for (let i = 1; i < taxData.length; i++) {
  const row = taxData[i];
  if (row[0]) console.log(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]}`);
}

// Get full New_Group_Summary
const gsSheet = wb.Sheets['New_Group_Summary'];
const gsData = XLSX.utils.sheet_to_json<any>(gsSheet, { header: 1, defval: '' });
console.log('\n=== NEW GROUP SUMMARY ===');
for (let i = 1; i < gsData.length; i++) {
  const row = gsData[i];
  if (row[0]) console.log(`${row[0]} | ${row[1]} | count=${row[2]} | ${row[3]}`);
}

// Get classification for all 237 incidents
const icSheet = wb.Sheets['Incident_Classification'];
const icData = XLSX.utils.sheet_to_json<any>(icSheet, { header: 1, defval: '' });
console.log('\n=== INCIDENT CLASSIFICATION (first 10) ===');
for (let i = 1; i < Math.min(11, icData.length); i++) {
  const row = icData[i];
  console.log(`${row[0]} | old=${row[2]} | new=${row[3]} | ${row[4]} | ${row[5]} | conf=${row[6]}`);
}

// Count unique group assignments
const groupCounts: Record<string, number> = {};
const subgroupCounts: Record<string, number> = {};
let total = 0;
for (let i = 1; i < icData.length; i++) {
  const row = icData[i];
  if (row[0]) {
    total++;
    const g = row[3] || 'NONE';
    const sg = row[5] || 'NONE';
    groupCounts[g] = (groupCounts[g] || 0) + 1;
    subgroupCounts[`${g}|${sg}`] = (subgroupCounts[`${g}|${sg}`] || 0) + 1;
  }
}
console.log(`\nTotal classified incidents: ${total}`);
console.log('\nGroup distribution:');
for (const [g, c] of Object.entries(groupCounts).sort()) {
  console.log(`  ${g}: ${c}`);
}
console.log('\nSubgroup distribution:');
for (const [sg, c] of Object.entries(subgroupCounts).sort()) {
  console.log(`  ${sg}: ${c}`);
}

// Count confidence levels
const confCounts: Record<string, number> = {};
for (let i = 1; i < icData.length; i++) {
  const row = icData[i];
  if (row[0]) {
    const conf = row[6] || 'NONE';
    confCounts[conf] = (confCounts[conf] || 0) + 1;
  }
}
console.log('\nConfidence distribution:');
for (const [c, n] of Object.entries(confCounts).sort()) {
  console.log(`  ${c}: ${n}`);
}
