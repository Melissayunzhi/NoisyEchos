let CELL_SIZE = 15; // Size of each cell
let gridSize; // Number of columns and rows in the grid
let grid; // 2D array to store the grid
let colorGrid; // 2D array to store the colors of the cells
let isDrawing = false; // Flag to indicate whether the mouse is being dragged
let generationCount = 0; // Generation count
let saveNextGenerations = false;
let generationsToSave = [];

let videoPaused = false;

let instructionsDiv;
let helpVisible = true; // Flag to control visibility
let alertShown = false; // Flag to track whether the alert has been shown

let DELAY = 1000; // Delay in milliseconds before new cells start following the rules
let followRules = false; // Flag to indicate whether to follow the rules of Game of Life
let isPaused = true; // Flag to indicate whether the simulation is paused
let timer; // Timer to track the delay
let showGrid = false;

let history = []; // History of cell positions for undo

let zoomFactor = 1.0; // Zoom factor
let offset; // Offset for panning

let video;
let bodyPose;
let poses = [];

let currentRule = 0;




async function preload() {
    console.log("Loading BodyPose (MoveNet) model...");
    bodyPose = await ml5.bodyPose("MoveNet");

    if (!bodyPose) {
        console.error("Error: BodyPose model failed to load.");
    } else {
        console.log("BodyPose (MoveNet) model loaded successfully!", bodyPose);
    }
}




function modelLoaded() {
    console.log("BodyPose Model Loaded!");
    
    drawGenerationCountOnCanvas();
}

async function setup() {
    createCanvas(windowWidth, windowHeight);
    gridSize = createVector(floor(width / CELL_SIZE), floor(height / CELL_SIZE));

    grid = new Array(gridSize.x);
    colorGrid = new Array(gridSize.x);
    for (let i = 0; i < gridSize.x; i++) {
        grid[i] = new Array(gridSize.y).fill(0);
        colorGrid[i] = new Array(gridSize.y).fill([0, 0, 0]);
    }

    initializeGrid(); // Clear the grid
    isDrawing = true; // Allow drawing by default
    followRules = false;
    isPaused = true; // Simulation is paused by default
    timer = millis();
    showGrid = false;

    history = [];

    offset = createVector(0, 0);

    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();

    pixelDensity(1);
    let modelCheckInterval = setInterval(() => {
        if (bodyPose) {
            console.log("Starting pose detection...");
            bodyPose.detectStart(video, gotPoses);
            clearInterval(modelCheckInterval); // Stop checking once the model is loaded
        } else {
            console.warn("BodyPose model not loaded yet, waiting...");
        }
    }, 100); // Check every 500ms
    
    // Initialize the instructionsDiv
    instructionsDiv = createDiv();
    instructionsDiv.style('font-family', "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif");
    instructionsDiv.style('background-color', 'rgba(255, 255, 255, 0.8)');
    instructionsDiv.style('padding', '10px');
    instructionsDiv.position(width - 220, 20);
    instructionsDiv.html(
        "<strong>How to Interact:</strong><br>" +
        "<ul>" +
        "<li>Draw or write with your nose.</li>" +
        "<li>Press <strong>ENTER</strong> to send.</li>" +
        "<li>Press <strong>Spacebar</strong> to stop or pause the simulation.</li>" +
        "<li>Press <strong>R</strong> to reset.</li>" +
        "<li>Press <strong>G</strong> to toggle grid visibility.</li>" +
        "</ul>"
    );

    // Show the initial alert
    showInstructionsAlert();

    // Get the social button and popup elements
    let socialButton = document.getElementById('social-button');
    let socialPopup = document.getElementById('social-popup');
    let closePopupButton = document.getElementById('close-popup');

    // Toggle the popup on click
    socialButton.addEventListener('click', function() {
        socialPopup.style.display = socialPopup.style.display === 'block' ? 'none' : 'block';
    });

    // Close the popup when the close button is clicked
    closePopupButton.addEventListener('click', function() {
        socialPopup.style.display = 'none';
    });

    // Select the about button and popup div
    let aboutBtn = select('#about');
    let aboutPopup = select('#aboutPopup');

    // Apply styling to the popup
    aboutPopup.style('font-family', "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif");
    aboutPopup.style('background-color', 'rgba(255, 255, 255, 0.8)');
    aboutPopup.style('padding', '10px');
    aboutPopup.style('text-align', 'center');
    aboutPopup.style('border-radius', '8px');
    aboutPopup.style('position', 'fixed');
    aboutPopup.style('bottom', '50%');
    aboutPopup.style('right', '50%');
    aboutPopup.style('transform', 'translate(50%, 50%)');
    aboutPopup.style('display', 'none');
    aboutPopup.style('z-index', '100');

    // Show popup on mouse hover
    aboutBtn.mouseOver(() => {
        aboutPopup.style('display', 'block');
    });

    // Hide popup when mouse leaves
    aboutBtn.mouseOut(() => {
        aboutPopup.style('display', 'none');
    });
}

function gotPoses(results) {
    poses = results;
}

function draw() {
        background(22, 30, 40); // Normal background once loaded
        // Your regular drawing code here...
        text("Loading, please wait...", width / 2, height / 2);
        textSize(22);
        textAlign(CENTER, CENTER);
        fill(255); // White text

    
    detectCursorHover();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);

    let noseX, noseY;

    // Draw only the nose point if it exists and update the cellular automata grid
    if (poses.length > 0) {
        let pose = poses[0];
        let nose = pose.keypoints.find(keypoint => keypoint.name === 'nose');
        if (nose) {
            noseX = nose.x;
            noseY = nose.y;

            if (isDrawing && !videoPaused) {
                let i = floor(noseX / CELL_SIZE);
                let j = floor(noseY / CELL_SIZE);

                if (i >= 0 && i < gridSize.x && j >= 0 && j < gridSize.y) {
                    grid[i][j] = 1;
                    colorGrid[i][j] = generateColor(noseX, noseY, i * CELL_SIZE, j * CELL_SIZE); // Store color when drawing
                    history.push(createVector(i, j)); // Add cell position to history
                }
            }
        }
    }

    displayGrid(noseX, noseY);

    // Check if the delay has passed and the simulation is not paused
    if (followRules && !isPaused && millis() - timer > DELAY) {
        nextGeneration(); // Calculate the next generation
        timer = millis(); // Reset the timer
    }

    if (saveNextGenerations && generationsToSave.includes(generationCount)) {
        drawGenerationCountOnCanvas(); // Ensure font settings are applied
        saveCanvas('Generation_' + generationCount, 'png');
        // Remove generation from the array to prevent multiple saves
        const index = generationsToSave.indexOf(generationCount);
        if (index > -1) {
            generationsToSave.splice(index, 1);
        }
    }
}

function generateColor(noseX, noseY, x, y) {
    let distanceToNose = dist(noseX, noseY, x, y);
    let r = (sin(distanceToNose * 0.01) + 1) * 127.5; // Red
    let g = (cos(distanceToNose * 0.01) + 1) * 127.5; // Green
    let b = (sin(distanceToNose * 0.4) + 1) * 127.5; // Blue
    return [b, 150, r];
}

function displayGrid(noseX, noseY) {
    if (showGrid) {
        stroke(255, 100);
        for (let i = 0; i <= width; i += CELL_SIZE) {
            line(i, 0, i, height);
        }
        for (let j = 0; j <= height; j += CELL_SIZE) {
            line(0, j, width, j);
        }
    }

    stroke(255, 128);

    // Display the cells
    for (let i = 0; i < gridSize.x; i++) {
        for (let j = 0; j < gridSize.y; j++) {
            let x = i * CELL_SIZE;
            let y = j * CELL_SIZE;

            if (grid[i][j] === 1) {
                if (videoPaused) {
                    let color = colorGrid[i][j];
                    fill(color[0], color[1], color[2]); // Use stored colors
                } else {
                    let color = generateColor(noseX, noseY, x, y);
                    fill(color[0], color[1], color[2]); // Use dynamic colors
                    colorGrid[i][j] = color; // Update color in the grid
                }
                rect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        initializeGrid(); // Clear the grid
        followRules = false; // Stop following the rules of Game of Life
        history = []; // Clear the history
        videoPaused = false;
        isPaused = true; // Start the simulation
        video.play(); // Resume the video

        generationCount = 0; // Reset generation count
        document.getElementById('generation-count').innerText = generationCount; // Update the display

    // } else if (key === 'Enter' ) {
    //     isPaused = false; // Start the simulation
    //     followRules = true; // Follow the rules
    //     video.pause(); // Pause the video
    //     videoPaused = true;
    //     saveCanvasImage(); // This calls your existing function to save the image
    } else if (key === ' ' || key === 'Enter' ) {
        isPaused = !isPaused; // Toggle pause state
        if (isPaused) {
            video.play(); // Resume the video
            videoPaused = false;
            followRules = false; // Stop following the rules
            generationCount = 0; // Reset generation count
        document.getElementById('generation-count').innerText = generationCount; // Update the display

        } else {
            video.pause(); // Pause the video
            videoPaused = true;
            followRules = true; // Start following the rules
            saveCanvasImage(); // This calls your existing function to save the image

        }


    } else if (key === 'g' || key === 'G') {
        showGrid = !showGrid; // Toggle grid visibility
    }
}

function nextGeneration() {
    let nextGrid = new Array(floor(gridSize.x));
    let nextColorGrid = new Array(floor(gridSize.x));
    for (let i = 0; i < floor(gridSize.x); i++) {
        nextGrid[i] = new Array(floor(gridSize.y)).fill(0);
        nextColorGrid[i] = new Array(floor(gridSize.y)).fill([0, 0, 0]);
    }

    for (let i = 0; i < gridSize.x; i++) {
        for (let j = 0; j < gridSize.y; j++) {
            let state = grid[i][j];
            let neighbors = countNeighbors(i, j);

            switch (currentRule) {
                case 0: // Game of Life Rule
                    if (state === 0 && neighbors === 3) {
                        nextGrid[i][j] = 1;
                        nextColorGrid[i][j] = averageNeighborColor(i, j); // Set color based on neighbors
                    } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                        nextGrid[i][j] = 0;
                    } else {
                        nextGrid[i][j] = state;
                        nextColorGrid[i][j] = colorGrid[i][j]; // Retain current color
                    }
                    break;

                case 1: // Custom Rule 1
                    if (state === 0 && neighbors == 2) {
                        nextGrid[i][j] = 1;
                        nextColorGrid[i][j] = averageNeighborColor(i, j); // Set color based on neighbors
                    } else if (state === 1 && neighbors == 3) {
                        nextGrid[i][j] = 1;
                        nextColorGrid[i][j] = averageNeighborColor(i, j); // Set color based on neighbors
                    } else {
                        nextGrid[i][j] = 0;
                    }
                    break;

                case 2: // Higherlife Rule
                    if (state === 0 && neighbors == 3) {
                        nextGrid[i][j] = 1;
                        nextColorGrid[i][j] = averageNeighborColor(i, j); // Set color based on neighbors
                    } else if (state === 1 && (neighbors == 2 || neighbors == 3)) {
                        nextGrid[i][j] = 1;
                        nextColorGrid[i][j] = averageNeighborColor(i, j); // Set color based on neighbors
                    } else {
                        nextGrid[i][j] = 0;
                    }
                    break;

                case 3: // Custom Rule 2
                    if (state === 0 && (neighbors == 3 || neighbors == 6)) {
                        nextGrid[i][j] = 1;
                        nextColorGrid[i][j] = averageNeighborColor(i, j); // Set color based on neighbors
                    } else if (state === 1 && (neighbors < 2 || neighbors > 4)) {
                        nextGrid[i][j] = 0;
                    } else {
                        nextGrid[i][j] = state;
                        nextColorGrid[i][j] = colorGrid[i][j]; // Retain current color
                    }
                    break;
            }
        }
    }

    grid = nextGrid;
    colorGrid = nextColorGrid;

    generationCount++; // Increment the generation count
    document.getElementById('generation-count').innerText = generationCount; // Update HTML

    if (generationCount >= Math.max(...generationsToSave)) {
        saveNextGenerations = false; // Stop saving process after 10 generations
    }
}

function averageNeighborColor(x, y) {
    let neighbors = [];
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            let col = (x + i + gridSize.x) % gridSize.x;
            let row = (y + j + gridSize.y) % gridSize.y;
            if (grid[col][row] === 1) {
                neighbors.push(colorGrid[col][row]);
            }
        }
    }
    if (neighbors.length > 0) {
        let avgColor = neighbors.reduce((acc, col) => {
            acc[0] += col[0];
            acc[1] += col[1];
            acc[2] += col[2];
            return acc;
        }, [0, 0, 0]).map(sum => sum / neighbors.length);
        return avgColor;
    } else {
        return [255, 255, 255]; // Default to white if no neighbors
    }
}

function countNeighbors(x, y) {
    let count = 0;

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let col = (x + i + floor(gridSize.x)) % floor(gridSize.x);
            let row = (y + j + floor(gridSize.y)) % floor(gridSize.y);
            count += grid[col][row];
        }
    }

    count -= grid[x][y];
    return count;
}

function initializeGrid() {
    for (let i = 0; i < gridSize.x; i++) {
        for (let j = 0; j < gridSize.y; j++) {
            grid[i][j] = 0; // Set all cells to 0 (clear the grid)
            colorGrid[i][j] = [0, 0, 0]; // Initialize the color grid
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function saveCanvasImage() {
    generationsToSave = [];
    while (generationsToSave.length < 5) {
        let gen = Math.floor(Math.random() * 10) + generationCount + 1;
        if (!generationsToSave.includes(gen)) {
            generationsToSave.push(gen);
        }
    }

    saveNextGenerations = true;

    if (isPaused) {
        isPaused = false;
    }
}

function drawGenerationCountOnCanvas() {
    push(); // Save current drawing settings

    textFont('Carrois Gothic'); // Set the custom font here

    translate(width, 0); // Move to the right side of the canvas
    scale(-1, 1); // Flip horizontally

    fill(255); // White color for text
    textSize(16); // Set text size
    textAlign(LEFT, BOTTOM); // Align text to the left and bottom
    text("Generation: " + generationCount, 10, height - 10); // Position at bottom-left

    pop(); // Restore original drawing settings
}

function detectCursorHover() {
    if (mouseX >= width - 60 && mouseY <= 40) {
        instructionsDiv.show(); // Show instructions when cursor hovers over the right corner
    } else {
        instructionsDiv.hide(); // Hide instructions otherwise
    }
}

function showInstructionsAlert() {
    if (!alertShown) {
        alert("Please draw or write your message :) \n\n" +
            "Draw or write with your nose. \n" +
            "Hit ENTER to send. \n" +
            "Space bar to stop or pause the simulation.\n" +
            "R to Reset.\n" +
            "G to toggle grid visibility.\n\n" +
            "Remember that more help is available in the top right corner! ");
        alertShown = true;
    }
}

function saveAndOpenArena() {
    saveCanvasImage(); // This calls your existing function to save the image
    window.open('https://www.are.na/melissa-yunzhi/noisy-messages', '_blank'); // Opens Arena page in a new tab
}
