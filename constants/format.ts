export function naira(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  const formatted = amount.toLocaleString('en-NG', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `₦${formatted}`;
}

export function departmentFor(name: string) {
  const n = name.toLowerCase();
  if (
    n.includes('x-ray') ||
    n.includes('xray') ||
    n.includes('ultrasound') ||
    n.includes('radiol') ||
    n.includes('mri') ||
    n.includes('scan') ||
    n.includes('ecg') ||
    n.includes('electro')
  ) {
    return 'Radiology';
  }
  if (
    n.includes('haem') ||
    n.includes('bact') ||
    n.includes('chem') ||
    n.includes('horm') ||
    n.includes('paras') ||
    n.includes('lab') ||
    n.includes('path')
  ) {
    return 'Laboratory';
  }
  return '';
}
