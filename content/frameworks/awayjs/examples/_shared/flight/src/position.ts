import type { QuaternionLike, SceneNode, Vector3Like } from '@flighthq/sdk';
import { copyQuaternion, getNodeWorldMatrix4, invalidateNodeLocalTransform } from '@flighthq/sdk';

export function setSceneNodePosition(node: SceneNode, x: number, y: number, z: number): void {
  node.position.x = x;
  node.position.y = y;
  node.position.z = z;
  invalidateNodeLocalTransform(node);
}

export function getSceneNodePosition(out: Vector3Like, node: SceneNode): void {
  const m = getNodeWorldMatrix4(node).m;
  out.x = m[12];
  out.y = m[13];
  out.z = m[14];
}

export function setSceneNodeScale(node: SceneNode, x: number, y: number, z: number): void {
  node.scale.x = x;
  node.scale.y = y;
  node.scale.z = z;
  invalidateNodeLocalTransform(node);
}

export function setSceneNodeRotationQuaternion(node: SceneNode, quat: Readonly<QuaternionLike>): void {
  copyQuaternion(node.rotation, quat);
  invalidateNodeLocalTransform(node);
}
