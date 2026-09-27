import { cabInventory } from '../lib/mockData';

export default function CabRental() {
  return (
    <div className="pt-16 pb-24 md:pb-8 min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <p className="tag mb-2">Cab Rentals</p>
          <h1 className="font-bold text-3xl">Flexible road travel, booked in minutes</h1>
        </div>

        <div className="grid lg:grid-cols-4 gap-5">
          {cabInventory.map((cab) => (
            <div key={cab.id} className="bg-white rounded-3xl p-5 border card-hover" style={{ borderColor: '#F3F4F6' }}>
              <div className="text-4xl mb-4">{cab.type === 'Luxury' ? '🚘' : cab.type === 'SUV' ? '🚙' : cab.type === 'Sedan' ? '🚕' : '🚐'}</div>
              <h3 className="font-bold text-xl mb-2">{cab.type}</h3>
              <div className="text-sm mb-3" style={{ color: '#6B7280' }}>Seats: {cab.seats} · {cab.rating}★ rating</div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-2xl">₹{cab.pricePerDay.toLocaleString()}</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>per day</span>
              </div>
              <button className="btn-primary w-full justify-center">Book this cab</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
