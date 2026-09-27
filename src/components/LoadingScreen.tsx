import AppLogo from './AppLogo';

type LoadingScreenProps = {
  visible: boolean;
};

export default function LoadingScreen({ visible }: LoadingScreenProps) {
  if (!visible) return null;

  const footsteps = [
    { className: 'footstep step-one', style: { left: '100px', top: '350px' } },
    { className: 'footstep step-two', style: { left: '130px', top: '330px' } },
    { className: 'footstep step-three', style: { left: '160px', top: '312px' } },
    { className: 'footstep step-four', style: { left: '190px', top: '298px' } },
    { className: 'footstep step-five', style: { left: '220px', top: '288px' } },
    { className: 'footstep step-six', style: { left: '248px', top: '278px' } },
    { className: 'footstep step-seven', style: { left: '275px', top: '268px' } },
    { className: 'footstep step-eight', style: { left: '300px', top: '258px' } },
    { className: 'footstep step-nine', style: { left: '325px', top: '245px' } },
  ];

  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label="Loading TripMates">
      <div className="loading-card" aria-hidden="true">
        <div className="loading-glow" />
        <div className="travel-path" />

        <div className="destination-marker" aria-hidden="true">
          <span className="pulse-ring" />
          <span className="pin-top" />
          <span className="pin-body" />
          <span className="pin-dot" />
        </div>

        {footsteps.map((footstep, index) => (
          <span key={index} className={footstep.className} style={footstep.style} />
        ))}

        <div className="traveler traveler-a">
          <span className="bag-handle" />
          <span className="trolley-bag" />
          <span className="wheel wheel-left" />
          <span className="wheel wheel-right" />
          <span className="leg leg-left" />
          <span className="leg leg-right" />
          <span className="shoe shoe-left" />
          <span className="shoe shoe-right" />
          <span className="shirt" />
          <span className="arm" />
          <span className="neck" />
          <span className="head" />
          <span className="hair" />
        </div>

        <div className="traveler traveler-b">
          <span className="bag-handle" />
          <span className="trolley-bag" />
          <span className="wheel wheel-left" />
          <span className="wheel wheel-right" />
          <span className="leg leg-left" />
          <span className="leg leg-right" />
          <span className="shoe shoe-left" />
          <span className="shoe shoe-right" />
          <span className="shirt" />
          <span className="arm" />
          <span className="neck" />
          <span className="head" />
          <span className="hair" />
        </div>

        <div className="airplane" />
        <div className="contrail contrail-one" />
        <div className="contrail contrail-two" />
        <div className="contrail contrail-three" />
        <div className="contrail contrail-four" />

        <div className="loading-brand">
          <AppLogo className="scale-100" dark={false} />
        </div>
      </div>

      <div className="loading-copy">
        <div className="loading-kicker">TripMates</div>
        <h2>Loading your next adventure</h2>
        <div className="loading-bar">
          <span />
        </div>
      </div>
    </div>
  );
}
