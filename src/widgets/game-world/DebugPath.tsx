import { Line } from '@react-three/drei';
import { battlefield } from '../../game/config/battlefield';
import { useAppSelector } from '../../app/store/store';
export function DebugPath() {
  const visible = useAppSelector(s => s.settings.showPath);
  return visible ? <Line points={battlefield.path.map(([x,z]) => [x, 0.12, z])} color="#ff626e" lineWidth={2} dashed dashSize={0.4} gapSize={0.3} /> : null;
}
