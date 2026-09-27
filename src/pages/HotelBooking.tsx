import { useMemo, useState } from 'react';
import { hotelInventory } from '../lib/mockData';

const filters = ['All', 'Goa', 'Manali', 'Jaipur'];

export default function HotelBooking() {
  const [selectedCity, setSelectedCity] = useState('All');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const visibleHotels = useMemo(() => {
    return hotelInventory.filter((hotel) => {
      const cityMatch = selectedCity === 'All' || hotel.city === selectedCity;
      const availabilityMatch = !showOnlyAvailable || hotel.available;
      return cityMatch && availabilityMatch;
    });
  }, [selectedCity, showOnlyAvailable]);

  return (
    <div className="pt-16 pb-24 md:pb-8 min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="tag mb-2">Hotel Booking</p>
            <h1 className="font-bold text-3xl">Stay that matches your trip vibe</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter}
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={selectedCity === filter ? { background: '#111111', color: 'white' } : { background: 'white', border: '1px solid #E5E7EB' }}
                onClick={() => setSelectedCity(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border mb-6" style={{ borderColor: '#F3F4F6' }}>
          <div className="flex flex-col md:flex-row gap-3">
            <input className="flex-1 px-4 py-3 rounded-2xl border bg-gray-50" style={{ borderColor: '#E5E7EB' }} placeholder="Search hotels, cities, neighborhoods" />
            <button className="btn-primary px-6 py-3">Search Stays</button>
            <button
              className="btn-outline px-6 py-3"
              onClick={() => setShowOnlyAvailable((prev) => !prev)}
            >
              {showOnlyAvailable ? 'Showing open rooms' : 'Only available'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {visibleHotels.map((hotel) => (
            <div key={hotel.id} className="bg-white rounded-3xl border overflow-hidden card-hover" style={{ borderColor: '#F3F4F6' }}>
              <img src={hotel.image} alt={hotel.name} className="w-full h-52 object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{hotel.name}</h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>{hotel.city}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: '#F59E0B' }}>⭐ {hotel.rating}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.map((amenity) => (
                    <span key={amenity} className="tag text-xs">{amenity}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xl">₹{hotel.price.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>per night</div>
                  </div>

                  <button className="btn-primary py-2.5 px-4 text-sm" disabled={!hotel.available} style={{ opacity: hotel.available ? 1 : 0.6 }}>
                    {hotel.available ? 'Book Stay' : 'Sold Out'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
