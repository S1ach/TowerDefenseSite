import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Mesh, type Material } from 'three';

export const kitUrl = (name: string) => `/models/kenney/${name}.glb`;
export const weapons = { machine: 'weapon-turret', cannon: 'weapon-cannon', sniper: 'weapon-ballista' } as const;

// Load upgrade and weapon variants before gameplay can request them.
export function KitReady() {
  return <>{['tower-round-bottom-a', 'tower-round-bottom-b', 'tower-round-bottom-c', 'tower-round-top-a', ...Object.values(weapons)].map(name => <KitAsset key={name} name={name} />)}</>;
}
function KitAsset({ name }: { name: string }) {
  useGLTF(kitUrl(name));
  return null;
}

/** Clone only the scene graph; geometry and atlas stay shared across towers. */
export function KitModel({ name, ghost = false, color }: { name: string; ghost?: boolean; color?: string }) {
  const { scene } = useGLTF(kitUrl(name));
  const { model, materials } = useMemo(() => {
    const model = scene.clone(true);
    const materials: Material[] = [];
    model.traverse(node => {
      if (!(node instanceof Mesh)) return;
      node.castShadow = !ghost; node.receiveShadow = true;
      if (ghost) {
        const clone = (material: Material) => {
          const copy = material.clone();
          copy.transparent = true; copy.opacity = 0.48; copy.depthWrite = false;
          if ('color' in copy) (copy as import('three').MeshStandardMaterial).color.set(color ?? '#75d998');
          materials.push(copy); return copy;
        };
        node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
      }
    });
    return { model, materials };
  }, [scene, ghost, color]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  return <primitive object={model} dispose={null} />;
}

/** Bake node transforms for instancing without changing cached GLTF geometry. */
export function useKitParts(name: string) {
  const { scene } = useGLTF(kitUrl(name));
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const result: { geometry: import('three').BufferGeometry; material: Material | Material[] }[] = [];
    scene.traverse(node => {
      if (node instanceof Mesh) result.push({ geometry: node.geometry.clone().applyMatrix4(node.matrixWorld), material: node.material });
    });
    return result;
  }, [scene]);
  useEffect(() => () => parts.forEach(part => part.geometry.dispose()), [parts]);
  return parts;
}
