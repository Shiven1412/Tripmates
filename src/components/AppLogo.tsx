type AppLogoProps = {
  compact?: boolean;
  dark?: boolean;
  className?: string;
};

function TripMatesMark({ size = 46, dark = false }: { size?: number; dark?: boolean }) {
  const stroke = '#10B981';
  const background = dark ? '#111111' : '#F8FAFC';

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-[14px]"
      style={{ width: size, height: size, background: background }}
    >
      <svg width={size * 0.9} height={size * 0.9} viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function AppLogo({ compact = false, dark = false, className = '' }: AppLogoProps) {
  const textColor = dark ? '#111111' : '#F8FAFC';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <TripMatesMark size={compact ? 34 : 42} dark={dark} />
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight sm:text-base" style={{ color: textColor }}>TripMates</span>
        </div>
      )}
    </div>
  );
}
