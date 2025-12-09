import type { Position, TableObject, WallSegment } from '~/stores/floorplan';

interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
}

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost (g + h)
  parent?: PathNode;
}

/**
 * A* pathfinding algorithm to find optimal path from start to end
 * avoiding walls and tables
 */
export function findPath(
  start: Position,
  end: Position,
  gridWidth: number,
  gridHeight: number,
  tables: TableObject[],
  walls: WallSegment[],
): Position[] {
  // Create grid
  const grid: GridCell[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    grid[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      grid[y][x] = { x, y, walkable: true };
    }
  }

  // Mark tables as obstacles with 1-cell buffer zone
  for (const table of tables) {
    // Mark the table itself and 1 cell around it as unwalkable
    const bufferSize = 1;

    for (let y = -bufferSize; y < table.size.height + bufferSize; y++) {
      for (let x = -bufferSize; x < table.size.width + bufferSize; x++) {
        const cellX = table.position.x + x;
        const cellY = table.position.y + y;
        if (cellX >= 0 && cellX < gridWidth && cellY >= 0 && cellY < gridHeight) {
          grid[cellY][cellX].walkable = false;
        }
      }
    }
  }

  // Mark walls as obstacles with 1-cell buffer zone
  for (const wall of walls) {
    const bufferSize = 1;

    if (wall.orientation === 'horizontal') {
      for (let i = 0; i < wall.length; i++) {
        const cellX = wall.start.x + i;
        const cellY = wall.start.y;

        // Mark the wall cell and cells around it
        for (let dy = -bufferSize; dy <= bufferSize; dy++) {
          for (let dx = -bufferSize; dx <= bufferSize; dx++) {
            const bx = cellX + dx;
            const by = cellY + dy;
            if (bx >= 0 && bx < gridWidth && by >= 0 && by < gridHeight) {
              grid[by][bx].walkable = false;
            }
          }
        }
      }
    } else {
      // vertical
      for (let i = 0; i < wall.length; i++) {
        const cellX = wall.start.x;
        const cellY = wall.start.y + i;

        // Mark the wall cell and cells around it
        for (let dy = -bufferSize; dy <= bufferSize; dy++) {
          for (let dx = -bufferSize; dx <= bufferSize; dx++) {
            const bx = cellX + dx;
            const by = cellY + dy;
            if (bx >= 0 && bx < gridWidth && by >= 0 && by < gridHeight) {
              grid[by][bx].walkable = false;
            }
          }
        }
      }
    }
  }

  // Round start and end positions to integers
  const startX = Math.round(start.x);
  const startY = Math.round(start.y);
  const endX = Math.round(end.x);
  const endY = Math.round(end.y);

  // Validate start and end positions
  if (
    startX < 0 || startX >= gridWidth || startY < 0 || startY >= gridHeight ||
    endX < 0 || endX >= gridWidth || endY < 0 || endY >= gridHeight
  ) {
    return [];
  }

  // Heuristic function (Manhattan distance)
  const heuristic = (x: number, y: number): number => {
    return Math.abs(x - endX) + Math.abs(y - endY);
  };

  // Initialize start node
  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY),
    f: heuristic(startX, startY),
  };

  const openList: PathNode[] = [startNode];
  const closedSet = new Set<string>();

  // Helper to get node key
  const getKey = (x: number, y: number): string => `${x},${y}`;

  // A* main loop
  while (openList.length > 0) {
    // Find node with lowest f score
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    // Check if we reached the goal
    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: Position[] = [];
      let node: PathNode | undefined = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    // Add to closed set
    closedSet.add(getKey(current.x, current.y));

    // Check neighbors (4-directional movement)
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const neighbor of neighbors) {
      // Check bounds
      if (
        neighbor.x < 0 || neighbor.x >= gridWidth ||
        neighbor.y < 0 || neighbor.y >= gridHeight
      ) {
        continue;
      }

      // Check if walkable
      if (!grid[neighbor.y][neighbor.x].walkable) {
        continue;
      }

      // Check if already visited
      const neighborKey = getKey(neighbor.x, neighbor.y);
      if (closedSet.has(neighborKey)) {
        continue;
      }

      // Calculate costs
      const g = current.g + 1;
      const h = heuristic(neighbor.x, neighbor.y);
      const f = g + h;

      // Check if this path to neighbor is better
      const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openList.push({
          x: neighbor.x,
          y: neighbor.y,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  // No path found
  return [];
}
