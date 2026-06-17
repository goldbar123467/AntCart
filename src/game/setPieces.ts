export type SetPieceKind = "box" | "ramp";
export type SetPieceMaterial =
  | "bed"
  | "brown"
  | "green"
  | "red"
  | "white"
  | "yellow"
  | "cyan"
  | "wood";

export interface RoomSetPiece {
  kind: SetPieceKind;
  material: SetPieceMaterial;
  x: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotationY?: number;
  collidable?: boolean;
}

export function getRoomSetPieces(): RoomSetPiece[] {
  return [];
}
