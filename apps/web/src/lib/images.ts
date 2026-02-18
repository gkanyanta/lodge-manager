export const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=80&auto=format&fit=crop',
];

export const ROOM_FALLBACK_IMAGES: Record<string, string[]> = {
  'Standard Room': [
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80&auto=format&fit=crop',
  ],
  'Deluxe Room': [
    'https://images.unsplash.com/photo-1590490360182-c33d955e5082?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80&auto=format&fit=crop',
  ],
  'Family Suite': [
    'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&q=80&auto=format&fit=crop',
  ],
  'Luxury Villa': [
    'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80&auto=format&fit=crop',
  ],
};

export const DEFAULT_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80&auto=format&fit=crop';

export function getRoomImages(name: string, apiImages?: string[]): string[] {
  if (apiImages && apiImages.length > 0) {
    return apiImages;
  }
  return ROOM_FALLBACK_IMAGES[name] || [DEFAULT_ROOM_IMAGE];
}
