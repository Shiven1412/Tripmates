export const tripCandidates = [
  {
    id: 'p1',
    name: 'Priya Mehta',
    age: 26,
    city: 'Delhi',
    personality: 'Explorer',
    compat: 94,
    trips: 12,
    img: 'https://images.unsplash.com/photo-1599828586134-fbaff96c63d5?w=400&h=500&fit=crop&auto=format',
    interests: ['Trekking', 'Photography', 'Camping'],
    verified: true,
    trust: 98,
    bio: 'Solo traveler turned group expedition leader. Conquered Everest base camp twice.',
  },
  {
    id: 'p2',
    name: 'Rahul Sharma',
    age: 28,
    city: 'Pune',
    personality: 'Road Tripper',
    compat: 88,
    trips: 8,
    img: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&h=500&fit=crop&auto=format',
    interests: ['Road Trips', 'Food Tours', 'Nightlife'],
    verified: true,
    trust: 95,
    bio: 'Road trip addict. Have driven Ladakh twice and Spiti once. Planning Bhutan next.',
  },
  {
    id: 'p3',
    name: 'Neha Kapoor',
    age: 24,
    city: 'Bangalore',
    personality: 'Culture Hunter',
    compat: 82,
    trips: 15,
    img: 'https://images.unsplash.com/photo-1464198016405-33fd4527b89d?w=400&h=500&fit=crop&auto=format',
    interests: ['Culture', 'History', 'Sightseeing'],
    verified: true,
    trust: 99,
    bio: 'Art history enthusiast. 22 countries, counting. Fluent in 3 languages.',
  },
  {
    id: 'p4',
    name: 'Vikram Singh',
    age: 30,
    city: 'Mumbai',
    personality: 'Digital Nomad',
    compat: 76,
    trips: 20,
    img: 'https://images.unsplash.com/photo-1776571662253-d5b0732e37c0?w=400&h=500&fit=crop&auto=format',
    interests: ['Remote Work', 'Yoga', 'Food'],
    verified: true,
    trust: 97,
    bio: 'Full-time remote, part-time traveler. Coffee connoisseur & sunrise chaser.',
  },
];

export const tripCatalog = [
  {
    id: 't1',
    name: 'Spiti Valley Circuit',
    destination: 'Himachal Pradesh',
    date: 'Nov 15–22',
    budget: '₹18,000',
    members: 4,
    max: 6,
    image: 'https://images.unsplash.com/photo-1566323124620-d22adb71d2a2?w=600&h=400&fit=crop&auto=format',
    compat: 92,
    style: 'Trekking',
    trust: 4.9,
    tags: ['Mountains', 'Adventure'],
    description: 'A high-altitude mountain circuit with monasteries, lakes, and stargazing.',
  },
  {
    id: 't2',
    name: 'Bali Digital Nomads',
    destination: 'Bali, Indonesia',
    date: 'Dec 1–14',
    budget: '₹55,000',
    members: 7,
    max: 10,
    image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=400&fit=crop&auto=format',
    compat: 85,
    style: 'Digital Nomad',
    trust: 4.8,
    tags: ['Beach', 'Remote Work'],
    description: 'A work-and-travel group for creators, remote workers, and sunset lovers.',
  },
  {
    id: 't3',
    name: 'Tokyo Food & Culture',
    destination: 'Japan',
    date: 'Dec 18–28',
    budget: '₹90,000',
    members: 3,
    max: 5,
    image: 'https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=600&h=400&fit=crop&auto=format',
    compat: 78,
    style: 'Culture',
    trust: 5.0,
    tags: ['Culture', 'Foodie'],
    description: 'A curated city trip through ramen alleys, temples, and cherry blossom neighborhoods.',
  },
];

export const hotelInventory = [
  {
    id: 'h1',
    name: 'Himalayan Crest Inn',
    city: 'Manali',
    price: 2800,
    rating: 4.8,
    available: true,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=600&fit=crop&auto=format',
    amenities: ['Mountain view', 'Breakfast', 'Parking'],
  },
  {
    id: 'h2',
    name: 'Azure Sea Suites',
    city: 'Goa',
    price: 4200,
    rating: 4.9,
    available: true,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop&auto=format',
    amenities: ['Pool', 'Fast Wi‑Fi', 'Spa'],
  },
  {
    id: 'h3',
    name: 'Saffron Courtyard',
    city: 'Jaipur',
    price: 3300,
    rating: 4.7,
    available: false,
    image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop&auto=format',
    amenities: ['Heritage style', 'Hammam', 'Breakfast'],
  },
];

export const cabInventory = [
  { id: 'c1', type: 'Hatchback', pricePerDay: 1800, rating: 4.6, seats: 4 },
  { id: 'c2', type: 'Sedan', pricePerDay: 2600, rating: 4.7, seats: 4 },
  { id: 'c3', type: 'SUV', pricePerDay: 3600, rating: 4.8, seats: 6 },
  { id: 'c4', type: 'Luxury', pricePerDay: 6500, rating: 4.9, seats: 4 },
];

export const scooterInventory = [
  { id: 's1', vehicle: 'Activa 6G', category: 'City', pricePerDay: 640, deposit: 1500, rating: 4.6 },
  { id: 's2', vehicle: 'Bajaj Pulsar', category: 'Adventure', pricePerDay: 980, deposit: 2200, rating: 4.7 },
  { id: 's3', vehicle: 'Royal Enfield Classic', category: 'Heritage', pricePerDay: 1600, deposit: 3500, rating: 4.9 },
];

export const communityPosts = [
  {
    id: 'cp1',
    user: 'Sana Verma',
    handle: '@sanav',
    content: 'Sunrise trek in Leh with the best crew ever. Pack your layers and go with the flow.',
    likes: 128,
    comments: 14,
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1000&h=700&fit=crop&auto=format',
  },
  {
    id: 'cp2',
    user: 'Aarav Iyer',
    handle: '@aarav',
    content: 'Road trip checklist for a 3-day ride to Coorg. Shared all the essentials in my album.',
    likes: 92,
    comments: 8,
    image: null,
  },
];

export const adminMetrics = {
  totalUsers: 24780,
  activeTrips: 432,
  verificationQueue: 89,
  pendingReports: 17,
  aiTickets: 21,
};

export const seasonalSuggestions = [
  { season: 'Summer', title: 'Ladakh Himalayan Escape', budget: '₹22,000', reason: 'Perfect weather for high-altitude treks.' },
  { season: 'Winter', title: 'Jaipur Heritage Weekend', budget: '₹14,000', reason: 'Warm city breaks and desert safaris.' },
  { season: 'Monsoon', title: 'Munnar & Alleppey', budget: '₹18,500', reason: 'Green landscapes with slow travel vibes.' },
  { season: 'Spring', title: 'Kyoto-Inspired Cherry Trails', budget: '₹64,000', reason: 'Bloom season and cultural walking routes.' },
];

export const creatorTrips = [
  {
    id: 'cr1',
    title: 'Nomad Life: Bali Creator Sprint',
    creator: 'Rhea Sol',
    category: 'Creator Trip',
    audience: 12000,
    revenue: '₹1.8L',
    rating: 4.9,
  },
  {
    id: 'cr2',
    title: 'Offbeat India: Himalayan Storytelling',
    creator: 'Zaid Khan',
    category: 'Editorial',
    audience: 8600,
    revenue: '₹1.2L',
    rating: 4.8,
  },
];

export const marketplaceItems = [
  { id: 'm1', category: 'Backpacks', name: 'North Peak Expedition Pack', price: 5200, rating: 4.8 },
  { id: 'm2', category: 'Cameras', name: 'Aperture Travel Camera Kit', price: 18000, rating: 4.9 },
  { id: 'm3', category: 'Tents', name: 'Storm Shield 2P Tent', price: 7600, rating: 4.7 },
  { id: 'm4', category: 'Trekking Gear', name: 'Summit Pro Trek Poles', price: 3200, rating: 4.6 },
];

export const mapPoints = [
  { name: 'TripMates Meetup', type: 'Trip', lat: 30.3165, lng: 78.0322 },
  { name: 'Hotel District', type: 'Hotel', lat: 31.1048, lng: 77.1734 },
  { name: 'Cab Hub', type: 'Cab', lat: 28.6139, lng: 77.209 },
  { name: 'Scooty Stand', type: 'Scooty', lat: 12.9716, lng: 77.5946 },
  { name: 'Attraction', type: 'Attraction', lat: 27.1751, lng: 78.0421 },
];
