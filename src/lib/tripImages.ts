const DESTINATION_IMAGES: Array<{ match: string[]; url: string }> = [
  { match: ['ladakh', 'leh', 'spiti', 'himachal', 'manali', 'kaza', 'mountain', 'trek'], url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=800&fit=crop&auto=format' },
  { match: ['goa', 'beach', 'bali', 'coast', 'island', 'sea'], url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&fit=crop&auto=format' },
  { match: ['japan', 'kyoto', 'tokyo', 'culture', 'heritage', 'jaipur'], url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&h=800&fit=crop&auto=format' },
  { match: ['munnar', 'nature', 'forest', 'green', 'meghalaya', 'kerala'], url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=800&fit=crop&auto=format' },
  { match: ['road', 'drive', 'highway'], url: 'https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=1200&h=800&fit=crop&auto=format' },
];
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&h=800&fit=crop&auto=format';

export function getTripCoverImage(destination?: string | null, tripType?: string | null): string {
  const text = `${destination ?? ''} ${tripType ?? ''}`.toLocaleLowerCase();
  return DESTINATION_IMAGES.find((entry) => entry.match.some((keyword) => text.includes(keyword)))?.url ?? DEFAULT_IMAGE;
}
