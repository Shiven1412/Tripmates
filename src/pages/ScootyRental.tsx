import { scooterInventory } from '../lib/mockData';

export default function ScootyRental() {
  return (
    <div className="pt-16 pb-24 md:pb-8 min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <p className="tag mb-2">Scooty & Bike Rentals</p>
          <h1 className="font-bold text-3xl">Book flexible city and hill rides</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {scooterInventory.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-3xl p-5 border card-hover" style={{ borderColor: '#F3F4F6' }}>
              <div className="text-5xl mb-4">🛵</div>
              <h3 className="font-bold text-xl mb-2">{vehicle.vehicle}</h3>
              <div className="flex items-center justify-between text-sm mb-2" style={{ color: '#6B7280' }}>
                <span>{vehicle.category}</span>
                <span>⭐ {vehicle.rating}</span>
              </div>
              <div className="mb-4">
                <div className="font-bold text-2xl">₹{vehicle.pricePerDay.toLocaleString()}</div>
                <div className="text-xs" style={{ color: '#9CA3AF' }}>per day · refundable deposit ₹{vehicle.deposit.toLocaleString()}</div>
              </div>
              <button className="btn-primary w-full justify-center">Rent now</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
