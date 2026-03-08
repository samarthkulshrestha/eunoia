import { Interest } from "./types";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const MIN_DIST = 3;
const MAX_DIST = 15;
const SPRING_K = 0.01;
const REPULSION_K = 2.0;
const DAMPING = 0.9;
const ITERATIONS = 100;

export function computeForceLayout(interests: Interest[]): Map<string, Vec3> {
  // Initialize positions from current interest positions
  const positions = new Map<string, Vec3>();
  interests.forEach((i) => {
    positions.set(i.id, { x: i.posX, y: i.posY, z: i.posZ });
  });

  if (interests.length <= 1) return positions;

  // Build edge lookup: interest id -> list of { targetId, strength }
  const edges = new Map<string, { targetId: string; strength: number }[]>();
  interests.forEach((i) => {
    const conns: { targetId: string; strength: number }[] = [];
    i.edgesFrom?.forEach((e) => conns.push({ targetId: e.toId, strength: e.strength }));
    i.edgesTo?.forEach((e) => conns.push({ targetId: e.fromId, strength: e.strength }));
    edges.set(i.id, conns);
  });

  const velocities = new Map<string, Vec3>();
  interests.forEach((i) => velocities.set(i.id, { x: 0, y: 0, z: 0 }));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < interests.length; i++) {
      for (let j = i + 1; j < interests.length; j++) {
        const a = positions.get(interests[i].id)!;
        const b = positions.get(interests[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.1);
        const force = REPULSION_K / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        const va = velocities.get(interests[i].id)!;
        const vb = velocities.get(interests[j].id)!;
        va.x += fx; va.y += fy; va.z += fz;
        vb.x -= fx; vb.y -= fy; vb.z -= fz;
      }
    }

    // Spring attraction along edges
    interests.forEach((interest) => {
      const conns = edges.get(interest.id) || [];
      conns.forEach(({ targetId, strength }) => {
        const a = positions.get(interest.id)!;
        const b = positions.get(targetId);
        if (!b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const force = SPRING_K * strength * dist;
        const va = velocities.get(interest.id)!;
        va.x += (dx / dist) * force;
        va.y += (dy / dist) * force;
        va.z += (dz / dist) * force;
      });
    });

    // Apply velocities with damping, enforce constraints
    interests.forEach((interest) => {
      const pos = positions.get(interest.id)!;
      const vel = velocities.get(interest.id)!;
      vel.x *= DAMPING; vel.y *= DAMPING; vel.z *= DAMPING;
      pos.x += vel.x; pos.y += vel.y; pos.z += vel.z;

      // Clamp to MAX_DIST from origin
      const distFromOrigin = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      if (distFromOrigin > MAX_DIST) {
        const scale = MAX_DIST / distFromOrigin;
        pos.x *= scale; pos.y *= scale; pos.z *= scale;
      }
    });

    // Enforce minimum distance between all pairs
    for (let i = 0; i < interests.length; i++) {
      for (let j = i + 1; j < interests.length; j++) {
        const a = positions.get(interests[i].id)!;
        const b = positions.get(interests[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < MIN_DIST && dist > 0) {
          const push = (MIN_DIST - dist) / 2;
          const nx = dx / dist; const ny = dy / dist; const nz = dz / dist;
          a.x += nx * push; a.y += ny * push; a.z += nz * push;
          b.x -= nx * push; b.y -= ny * push; b.z -= nz * push;
        }
      }
    }
  }

  return positions;
}
