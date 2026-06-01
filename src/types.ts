/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

export type PenSize = 'thin' | 'medium' | 'thick';

export interface InkColor {
  name: string;
  value: string;
}

export interface BoardTheme {
  isDark: boolean;
}
