/* eslint-disable react/no-unknown-property */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Center } from '@react-three/drei';
import * as THREE from 'three';

export const FallbackComponent = () => (
  <group>
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  </group>
);

type FloatingNumbersProps = {
  count?: number;
  rotateSpeed?: number;
};

export const FloatingNumbers = ({ count = 48, rotateSpeed = 0.12 }: FloatingNumbersProps) => {
  const groupRef = useRef<THREE.Group>(null);

  const items = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: Math.random() > 0.5 ? '4' : '0',
        position: [
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        ] as [number, number, number],
        fontSize: Math.random() * 0.6 + 0.4,
        color: Math.random() > 0.5 ? '#2563eb' : '#6366f1'
      })),
    [count]
  );

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * rotateSpeed;
    }
  });

  return (
    <Center>
      <group ref={groupRef}>
        {items.map(item => (
          <Text
            key={item.id}
            position={item.position}
            fontSize={item.fontSize}
            color={item.color}
            anchorX="center"
            anchorY="middle"
            characters="040"
          >
            {item.char}
          </Text>
        ))}
      </group>
    </Center>
  );
};