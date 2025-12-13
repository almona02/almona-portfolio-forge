export function getLiveAluminumPrice(): number {
  return 125000; // EGP per ton
}

export function getBaseMaterialPrice(systemId: string): number {
  const prices: Record<string, number> = {
    'panda-50': 950,
    'rock-60': 1100,
    'caluminium-ps': 1400,
    'kompen-upvc': 650,
    'emapen-upvc': 750,
    'katra-upvc': 550,
    'foxywin-upvc': 850
  };
  return prices[systemId] || 800;
}

