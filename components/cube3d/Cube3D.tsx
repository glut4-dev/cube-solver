"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Face, Facelets, MOVE_AXIS, Vec3, inLayer, parseMove, stickerAt } from "@/lib/cube/model";
import { FACE_INFO } from "@/lib/cube/faces";

export interface CubeAnimation {
  /** Move in standard notation, e.g. "R'", "U2", "z2". */
  move: string;
  /** Changes for every new animation, so the same move can play twice. */
  id: number;
}

interface Props {
  facelets: Facelets;
  animation?: CubeAnimation | null;
  /** Called when the animation has finished. */
  onAnimationEnd?: () => void;
  /** Seconds per quarter turn. */
  speed?: number;
  className?: string;
}

const POSITIONS: Vec3[] = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if (x || y || z) POSITIONS.push([x, y, z]);

const NORMALS: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

function Cubie({ pos, facelets }: { pos: Vec3; facelets: Facelets }) {
  const stickers = NORMALS.filter((n) => n.some((v, k) => v !== 0 && v === pos[k])).map((n) => {
    const color = FACE_INFO[facelets[stickerAt(pos, n)] as Face].hex;
    const rot = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...n)),
    );
    return { n, color, rot };
  });
  return (
    <group position={pos}>
      <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.07} smoothness={3}>
        <meshStandardMaterial color="#111" roughness={0.6} />
      </RoundedBox>
      {stickers.map(({ n, color, rot }) => (
        <mesh key={n.join()} position={[n[0] * 0.483, n[1] * 0.483, n[2] * 0.483]} rotation={rot}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function CubeModel({ facelets, animation, onAnimationEnd, speed = 0.35 }: Props) {
  const turning = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const finished = useRef(false);

  const anim = useMemo(() => {
    if (!animation) return null;
    const m = parseMove(animation.move);
    const axis = new THREE.Vector3(...MOVE_AXIS[m.base]);
    const angle = m.turns === 3 ? Math.PI / 2 : (-m.turns * Math.PI) / 2;
    return { base: m.base, axis, angle, duration: speed * (m.turns === 2 ? 1.6 : 1) };
  }, [animation, speed]);

  useLayoutEffect(() => {
    progress.current = 0;
    finished.current = false;
    turning.current?.quaternion.identity();
  }, [animation?.id, facelets]);

  useFrame((_, dt) => {
    if (!anim || !turning.current || finished.current) return;
    progress.current = Math.min(1, progress.current + dt / anim.duration);
    const t = progress.current;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    turning.current.quaternion.setFromAxisAngle(anim.axis, anim.angle * eased);
    if (t >= 1) {
      finished.current = true;
      onAnimationEnd?.();
    }
  });

  const moving = POSITIONS.filter((p) => anim && inLayer(anim.base, p));
  const still = POSITIONS.filter((p) => !(anim && inLayer(anim.base, p)));

  return (
    <group>
      {still.map((p) => (
        <Cubie key={p.join()} pos={p} facelets={facelets} />
      ))}
      <group ref={turning}>
        {moving.map((p) => (
          <Cubie key={p.join()} pos={p} facelets={facelets} />
        ))}
      </group>
    </group>
  );
}

/** Rotatable 3D cube. Drag to turn it around; turns are animated when `animation` is set. */
export default function Cube3D(props: Props) {
  return (
    <div className={props.className ?? "aspect-square w-full"}>
      <Canvas camera={{ position: [4.2, 3.6, 5.6], fov: 38 }} dpr={[1, 2]}>
        <ambientLight intensity={1.6} />
        <directionalLight position={[5, 8, 6]} intensity={1.6} />
        <directionalLight position={[-6, -4, -5]} intensity={0.6} />
        <CubeModel {...props} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={12} />
      </Canvas>
    </div>
  );
}
