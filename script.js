let CELL_SIZE = 15; // Size of each cell
let gridSize; // Number of columns and rows in the grid
let grid; // 2D array to store the grid
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

let noseX;
let noseY;

let currentRule = 0;

// This will be called every 10 seconds
setInterval(() => {
    currentRule = (currentRule + 1) % 4; // Cycle between 0 and 3
}, 10000);

function preload() {
    // Load the bodyPose model
    bodyPose = ml5.bodyPose("BlazePose", modelLoaded);
}

// When the model is loaded
function modelLoaded() {
    console.log("Model Loaded!");
    drawGenerationCountOnCanvas();
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    gridSize = createVector(floor(width / CELL_SIZE), floor(height / CELL_SIZE));

    grid = new Array(gridSize.x);
    for (let i = 0; i < gridSize.x; i++) {
        grid[i] = new Array(gridSize.y);
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

    // Start detecting poses in the webcam video
    bodyPose.detectStart(video, gotPoses);

    // Initialize the instructionsDiv
    instructionsDiv = createDiv();
    instructionsDiv.style('font-family', "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif");
    instructionsDiv.style('background-color', 'rgba(255, 255, 255, 0.8)');
    instructionsDiv.style('padding', '10px');
    instructionsDiv.position(width - 220, 20);
    instructionsDiv.html(
        "<strong>Instructions:</strong><br>" +
        "Press <strong>'Spacebar'</strong> to start/stop the simulation.<br>" +
        "Press <strong>'r'</strong> to clear the grid.<br>" +
        "Press <strong>'g'</strong> to toggle grid visibility.<br>"
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
}

function gotPoses(results) {
    poses = results;
}

function draw() {
    background(22, 30, 40);
    detectCursorHover();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);

    // Draw only the nose point if it exists and update the cellular automata grid
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        let nose = pose.keypoints.find(keypoint => keypoint.name === 'nose');
        if (nose) {
            // fill(0, 255, 0);
            // noStroke();
            // circle(nose.x, nose.y, 10); // Commented out the circle

            noseX = nose.x;
            noseY = nose.y;

            if (isDrawing || !isPaused) {
                let i = floor(noseX / CELL_SIZE);
                let j = floor(noseY / CELL_SIZE);

                if (i >= 0 && i < gridSize.x && j >= 0 && j < gridSize.y) {
                    grid[i][j] = 1;
                    history.push(createVector(i, j)); // Add cell position to history
                }
            }
        }
    }

    displayGrid();

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

function displayGrid() {
    if (showGrid) {
        stroke(255, 100);
        for (let i = 0; i <= width; i += CELL_SIZE) {
            line(i, 0, i, height);
        }
        for (let j = 0; j <= height; j += CELL_SIZE) {
            line(0, j, width, j);
        }
    }

    fill(255, 128); // 128 specifies the alpha (transparency)
    stroke(255, 128);

    // Display the cells
    for (let i = 0; i < gridSize.x; i++) {
        for (let j = 0; j < gridSize.y; j++) {
            let x = i * CELL_SIZE;
            let y = j * CELL_SIZE;

            if (grid[i][j] === 1) {
                let distanceToNose = dist(noseX, noseY, x, y);
                let r = (sin(distanceToNose * 0.01) + 1) * 127.5; // Red
                let g = (cos(distanceToNose * 0.01) + 1) * 127.5; // Green
                let b = (sin(distanceToNose * 0.4) + 1) * 127.5; // Blue

                fill(b, 150, r); // Use calculated colors
                rect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function keyPressed() {
    if (key === 'r') {
        initializeGrid(); // Clear the grid
        followRules = false; // Stop following the rules of Game of Life
        history = []; // Clear the history
        generationCount = 0; // Reset generation count
    } else if (key === ' ') {
        followRules = !followRules; // Toggle the rule following when space is pressed
        isPaused = !isPaused; // Toggle the simulation pause state
    } else if (key === 'u' || key === 'U') {
        if (history.length > 0) {
            let cellPos = history.pop();
            let i = floor(cellPos.x);
            let j = floor(cellPos.y);
            grid[i][j] = 0;
        }
    } else if (key === '+') {
        zoomFactor *= 1.2; // Zoom in
    } else if (key === '-') {
        zoomFactor *= 0.8; // Zoom out
    } else if (key === 'g' || key === 'G') {
        showGrid = !showGrid; // Toggle grid visibility
    }
}

function nextGeneration() {
    let nextGrid = new Array(floor(gridSize.x));
    for (let i = 0; i < floor(gridSize.x); i++) {
        nextGrid[i] = new Array(floor(gridSize.y));
    }

    for (let i = 0; i < gridSize.x; i++) {
        for (let j = 0; j < gridSize.y; j++) {
            let state = grid[i][j];
            let neighbors = countNeighbors(i, j);

            switch (currentRule) {
                case 0: // Game of Life Rule
                    if (state === 0 && neighbors === 3) {
                        nextGrid[i][j] = 1;
                    } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                        nextGrid[i][j] = 0;
                    } else {
                        nextGrid[i][j] = state;
                    }
                    break;

                case 1: // Custom Rule 1
                    if (state === 0 && neighbors == 2) {
                        nextGrid[i][j] = 1;
                    } else if (state === 1 && neighbors == 3) {
                        nextGrid[i][j] = 1;
                    } else {
                        nextGrid[i][j] = 0;
                    }
                    break;

                case 2: // Higherlife Rule
                    if (state === 0 && neighbors == 3) {
                        nextGrid[i][j] = 1;
                    } else if (state === 1 && (neighbors == 2 || neighbors == 3)) {
                        nextGrid[i][j] = 1;
                    } else {
                        nextGrid[i][j] = 0;
                    }
                    break;

                case 3: // Custom Rule 2
                    if (state === 0 && (neighbors == 3 || neighbors == 6)) {
                        nextGrid[i][j] = 1;
                    } else if (state === 1 && (neighbors < 2 || neighbors > 4)) {
                        nextGrid[i][j] = 0;
                    } else {
                        nextGrid[i][j] = state;
                    }
                    break;
            }
        }
    }

    grid = nextGrid;

    generationCount++; // Increment the generation count
    document.getElementById('generation-count').innerText = generationCount; // Update HTML

    if (generationCount >= Math.max(...generationsToSave)) {
        saveNextGenerations = false; // Stop saving process after 10 generations
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
        alert("Welcome to the semiotics automata! Here are the instructions:\n\n" +
            "Press 'Spacebar' to start/stop the simulation.\n" +
            "Press 'r' to clear the grid.\n" +
            "Press 'g' to toggle grid visibility.\n\n" +
            "Remember that more help is available in the top right corner.");
        alertShown = true;
    }
}

function saveAndOpenArena() {
    saveCanvasImage(); // This calls your existing function to save the image
    window.open('https://www.are.na/melissa-yunzhi/noisy-messages', '_blank'); // Opens Arena page in a new tab
}
