import { Injectable } from '@nestjs/common';

@Injectable()
export class LabyrinthGeneratorService {
  private static generateInitialGrid(width: number, height: number) {
    const grid = new Array(height).fill(0).map(() => new Array(width).fill(0));
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[0].length; j++) {
        grid[i][j] = -1;
      }
    }

    return grid;
  }

  private static get_neighbours(cell, distance) {
    const up = [cell[0], cell[1] - distance];
    const right = [cell[0] + distance, cell[1]];
    const down = [cell[0], cell[1] + distance];
    const left = [cell[0] - distance, cell[1]];
    return [up, right, down, left];
  }

  private static random_int(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  private static get_node(grid, x, y) {
    if (x >= 0 && x < grid.length && y >= 0 && y < grid[0].length)
      return grid[x][y];

    return -2;
  }

  private static clear_grid(grid) {
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[0].length; j++) {
        if (grid[i][j] > -1) {
          grid[i][j] = 0;
        } else if (grid[i][j] < -1) {
          grid[i][j] = -1;
        }
      }
    }

    return grid;
  }

  private static implodeGrid(grid: number[][]) {
    const implode = [];
    grid.forEach((a) => {
      implode.push(...a);
    });

    return implode.map((n) => (n === -1 ? 2 : 0));
  }

  wilson_algorithm(width: number, height: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      let grid = LabyrinthGeneratorService.generateInitialGrid(width, height);
      const cell_list = [];

      for (let i = 1; i < grid.length - 1; i += 2)
        for (let j = 1; j < grid[0].length - 1; j += 2) cell_list.push([i, j]);

      const first_cell = cell_list[0];
      cell_list.splice(0, 1);
      grid[first_cell[0]][first_cell[1]] = 10;
      let current_cell =
        cell_list[LabyrinthGeneratorService.random_int(0, cell_list.length)];
      let random_walk = true;
      let first_step = current_cell;
      let new_way_list = [];

      const my_interval = setInterval(function () {
        if (cell_list.length == 0) {
          clearInterval(my_interval);
          grid = LabyrinthGeneratorService.clear_grid(grid);
          const finalGrid = LabyrinthGeneratorService.implodeGrid(grid);
          return resolve(finalGrid);
        }

        if (random_walk)
          while (true) {
            const list = LabyrinthGeneratorService.get_neighbours(
              current_cell,
              2,
            );
            let index;
            let chosen_cell;

            do {
              index = LabyrinthGeneratorService.random_int(0, list.length);
              chosen_cell = list[index];
            } while (
              LabyrinthGeneratorService.get_node(
                grid,
                chosen_cell[0],
                chosen_cell[1],
              ) == -2
            );

            grid[current_cell[0]][current_cell[1]] = -(index + 3);

            if (grid[chosen_cell[0]][chosen_cell[1]] == 10) {
              random_walk = false;
              current_cell = first_step;
              return;
            } else current_cell = chosen_cell;
          }
        else {
          if (grid[current_cell[0]][current_cell[1]] == 10) {
            current_cell =
              cell_list[
                LabyrinthGeneratorService.random_int(0, cell_list.length)
              ];
            random_walk = true;
            first_step = current_cell;
            new_way_list = [];
          } else {
            const index = -grid[current_cell[0]][current_cell[1]] - 3;
            const next_cell = LabyrinthGeneratorService.get_neighbours(
              current_cell,
              2,
            )[index];
            const wall = [
              (current_cell[0] + next_cell[0]) / 2,
              (current_cell[1] + next_cell[1]) / 2,
            ];
            new_way_list.push(current_cell);
            new_way_list.push(wall);
            grid[current_cell[0]][current_cell[1]] = 0;
            grid[wall[0]][wall[1]] = 0;
            grid[current_cell[0]][current_cell[1]] = 10;

            for (let i = 0; i < cell_list.length; i++)
              if (
                cell_list[i][0] == current_cell[0] &&
                cell_list[i][1] == current_cell[1]
              ) {
                cell_list.splice(i, 1);
                break;
              }

            current_cell = next_cell;
          }
        }
      }, 10);
    });
  }
}
