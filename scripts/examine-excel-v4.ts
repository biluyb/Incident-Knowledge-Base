import * as XLSX from 'xlsx';

const wb = XLSX.readFile('/home/bililign/Downloads/Incident_Knowledge_Base_Classified_v4(1).xlsx');

console.log('=== SHEETS ===');
console.log(wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: '' });
  
  console.log(`\n=== Sheet: ${sheetName} ===`);
  console.log(`Rows: ${data.length}`);
  
  // Show first 3 rows to understand structure
  for (let i = 0; i < Math.min(3, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
  
  // Show headers (first row that looks like headers)
  if (data.length > 0) {
    const headerRow = data[0];
    const cols = headerRow.filter((h: any) => h !== '').length;
    console.log(`Non-empty columns in row 0: ${cols}`);
    console.log('Headers:', headerRow.map((h: any, i: number) => h ? `[${i}]${h}` : '').filter(Boolean).join(' | '));
  }
  if (data.length > 1) {
    const headerRow = data[1];
    console.log('Row 1:', headerRow.map((h: any, i: number) => h ? `[${i}]${h}` : '').filter(Boolean).join(' | '));
  }
}
