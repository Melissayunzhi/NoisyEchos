const canvas = document.getElementById('gameOfLifeCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const resolution = 10;
const cols = Math.floor(canvas.width / resolution);
const rows = Math.floor(canvas.height / resolution);

let grid = createGrid(rows, cols);  // Create a grid with specified rows and columns

function createGrid(rows, cols) {
    let arr = new Array(cols);
    for (let i = 0; i < arr.length; i++) {
        arr[i] = new Array(rows);
        for (let j = 0; j < rows; j++) {
            arr[i][j] = Math.floor(Math.random() * 2);
        }
    }
    return arr;
}
function updateGrid() {
    const nextGrid = createGrid(rows, cols);

    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            const cell = grid[col][row];
            let numNeighbors = 0;

            for (let i = -1; i < 2; i++) {
                for (let j = -1; j < 2; j++) {
                    if (i === 0 && j === 0) {
                        continue;
                    }
                    const x_cell = col + i;
                    const y_cell = row + j;

                    if (x_cell >= 0 && y_cell >= 0 && x_cell < cols && y_cell < rows) {
                        numNeighbors += grid[x_cell][y_cell];
                    }
                }
            }

            // Rules of the Game of Life
            if (cell === 1 && numNeighbors < 2 || cell === 1 && numNeighbors > 3) {
                nextGrid[col][row] = 0;
            } else if (cell === 0 && numNeighbors === 3) {
                nextGrid[col][row] = 1;
            } else {
                nextGrid[col][row] = cell;
            }
        }
    }

    return nextGrid;
}

function draw() {


    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            const cell = grid[col][row];

            let r = (Math.sin(col * 0.01) + 1) * 127.5; // Red
            let g = (Math.cos(row * 0.01) + 1) * 127.5; // Green
            let b = (Math.sin(col * 0.4) + 1) * 127.5; // Blue

            ctx.beginPath();
            ctx.rect(col * resolution, row * resolution, resolution, resolution);
            if (cell) {
                ctx.fillStyle = `rgb(${b}, 150, ${r})`; // Alive cell color
            } else {
             // Create a horizontal gradient for dead cells
             var gradient = ctx.createLinearGradient(0, row * resolution, canvas.width, row * resolution);
             gradient.addColorStop(0, 'rgba(150, 30, 90, 1)'); // Start color (more transparent)
             gradient.addColorStop(1, `rgba(40, 100, 100, 0.8)`); // End color (less transparent)
             ctx.fillStyle = gradient;           
             }  
            ctx.fill();
            // ctx.stroke();
        }
    }
}

function step() {
    grid = updateGrid();
    draw();
    setTimeout(step, 100); // Slows down the animation
}

step();