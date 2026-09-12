import { battlefield } from '../../game/config/battlefield';

function Road() {
  return <group>
    {battlefield.path.slice(1).map(([x, z], i) => {
      const [previousX, previousZ] = battlefield.path[i];
      const length = Math.hypot(x - previousX, z - previousZ);
      return <mesh key={i} position={[(x + previousX) / 2, 0.025, (z + previousZ) / 2]} rotation={[0, Math.atan2(x - previousX, z - previousZ), 0]} receiveShadow>
        <boxGeometry args={[battlefield.roadWidth, 0.05, length + battlefield.roadWidth]} />
        <meshStandardMaterial color="#b0b69c" roughness={1} />
      </mesh>;
    })}
  </group>;
}

function Zone({ position, color }: { position: [number, number, number]; color: string }) {
  return <group position={position}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.7, 0.87, 48]} /><meshBasicMaterial color={color} /></mesh>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.55, 48]} /><meshBasicMaterial color={color} transparent opacity={0.24} /></mesh>
  </group>;
}

export function Battlefield() {
  return <group>
    <mesh position={[0, -0.52, 0]} receiveShadow castShadow><boxGeometry args={[26, 1, 20]} /><meshStandardMaterial color="#293d31" roughness={0.9} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[battlefield.width, battlefield.depth]} /><meshStandardMaterial color="#50674a" roughness={1} /></mesh>
    <gridHelper args={[26, 26, '#718265', '#718265']} position={[0, 0.008, 0]} scale={[1, 1, 20 / 26]} material-transparent material-opacity={0.18} />
    <Road />
    <Zone position={[-12, 0.065, 5]} color="#ffb181" />
    <Zone position={[12, 0.065, -5]} color="#d1ff96" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#101b18" roughness={1} /></mesh>
  </group>;
}
