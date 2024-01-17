let CELL_SIZE = 15;       // Size of each cell
let gridSize;               // Number of columns and rows in the grid
let grid;                   // 2D array to store the grid
let isDrawing = false;              // Flag to indicate whether the mouse is being dragged
let generationCount = 0; // Add this line
let saveNextGenerations = false;
let generationsToSave = [];


let videoPaused = false;

let instructionsDiv;
let helpVisible = true; // Flag to control visibility
let alertShown = false; // Flag to track whether the alert has been shown


let DELAY = 1000;          // Delay in milliseconds before new cells start following the rules
let followRules = false;            // Flag to indicate whether to follow the rules of Game of Life
let isPaused = true;               // Flag to indicate whether the simulation is paused
let timer;                      // Timer to track the delay
let showGrid = false;

let history = [];     // History of cell positions for undo

let zoomFactor = 1.0;         // Zoom factor
let offset;                 // Offset for panning

let video;
let poseNet; 
let poses = [];
let skeletons = [];

let pg;
let noseX;
let noseY;

let pNoseX;
let pNoseY;

let wristX;
let wristY;

let sound;
let playing, freq, amp;
let osc = []; // Array to store oscillators

let soundStartTime; // Variable to track when the sound started

let currentRule = 0;

// This will be called every 10 seconds
setInterval(() => {
    currentRule = (currentRule + 1) % 4;  // Cycle between 0 and 3
}, 10000);


// let audioContextStarted = false;

// When the model is loaded
function modelLoaded() {
    console.log("Model Loaded!");
    // div.innerHTML = "Posenet model loaded!";
    drawGenerationCountOnCanvas()
}

function setup() {

    // Select the about button and popup div
    let aboutBtn = select('#about');
    let aboutPopup = select('#aboutPopup');

    // Apply styling to the popup
    aboutPopup.style('font-family', "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif");
    aboutPopup.style('background-color', 'rgba(255, 255, 255, 0.8)');
    aboutPopup.style('padding', '10px');
    aboutPopup.style('text-align', 'center');
    aboutPopup.style('border-radius', '8px');
    aboutPopup.style('position', 'absolute');
    aboutPopup.style('top', '50%');
    aboutPopup.style('left', '50%');
    aboutPopup.style('transform', 'translate(-50%, -50%)');
    aboutPopup.style('box-shadow', '0 4px 8px rgba(0,0,0,0.1)');
    aboutPopup.style('max-width', '80%');
    aboutPopup.style('z-index', '100');

    // Show popup on mouse hover
    aboutBtn.mouseOver(() => {
        aboutPopup.style('display', 'block');
    });

    // Hide popup when mouse leaves
    aboutBtn.mouseOut(() => {
        aboutPopup.style('display', 'none');
    });
  createCanvas(windowWidth, windowHeight);
  //canvas.parent("container");
  gridSize = createVector(floor(width / CELL_SIZE), floor(height / CELL_SIZE));
  

    // Initialize sounds
    osc = new p5.Oscillator('sine');

  grid = new Array(gridSize.x);
  for (let i = 0; i < gridSize.x; i++) {
    grid[i] = new Array(gridSize.y);
  }
  
  initializeGrid(); // Clear the grid
  isDrawing = false;
  followRules = false;
  isPaused = true;
  timer = millis();
  showGrid = false;
  
  history = [];
  
  offset = createVector(0, 0);


  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide()

  pixelDensity(1);
  pg = createGraphics(width, height);

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);

  poseNet.on('pose', function(results) {
    poses = results;
  });

  // Hide the video element, and just show the canvas
  video.hide();

  
  // Initialize the instructionsDiv
  instructionsDiv = createDiv();
  instructionsDiv.style('font-family', "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif");
  instructionsDiv.style('background-color', 'rgba(255, 255, 255, 0.8)');
  instructionsDiv.style('padding', '10px');
  instructionsDiv.position(width - 220, 20);
  instructionsDiv.html(
    "<strong>Instructions:</strong><br>" +
    "Press <strong>'Spacebar'</strong> to pause/resume the simulation.<br>" +
    "Press <strong>'r'</strong> to clear the grid.<br>" +
    // "Press <strong>'u'</strong> to undo the last drawn cell.<br>" +
    // "Press <strong>'+'</strong> to zoom in.<br>" +
    // "Press <strong>'-'</strong> to zoom out.<br>" +
    "Press <strong>'g'</strong> to toggle grid visibility.<br>" 
  );

  // Show the initial alert
  showInstructionsAlert();
    
}

function draw() {

  background(22, 30, 40);
  detectCursorHover();
  translate(width,0);
  scale(-1, 1);
  //image(video, 0, 0, width, height);

   image(video, 0, 0, width, height);

  // We can call both functions to draw all keypoints and the skeletons
  drawKeypoints();


  // applyZoomAndOffset();
  displayGrid();
  
  // Check if the delay has passed and the simulation is not paused
  if (followRules && !isPaused && millis() - timer > DELAY) {
    nextGeneration();  // Calculate the next generation
    timer = millis();  // Reset the timer
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




function applyZoomAndOffset() {
  translate(width / 2, height / 2);
  scale(zoomFactor);
  translate(-width / 2, -height / 2);
  translate(offset.x, offset.y);
}

function displayGrid() {
  if (showGrid) {
    stroke(255,100);
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
        
        // // Assign different colors based on the stage of life
        // let stage = countNeighbors(i, j);
        // if (stage < 2) {
        //   fill(255, 255, 94);   // white for stage 0
        // } else if (stage < 4) {
        //   fill(98, 194, 177);   // Green for stage 1
        // } else {
        //   fill(0, 120, 191);   // Blue for stage 2 and above
        // }

        let distanceToNose = dist(noseX, noseY, x, y);
        let r = (sin(distanceToNose * 0.01) + 1) * 127.5; // Red
        let g = (cos(distanceToNose * 0.01) + 1) * 127.5; // Green
        let b = (sin(distanceToNose * 0.4) + 1) * 127.5; // Blue

        fill(b, 150, r); // Use calculated colors
        rect(x, y, CELL_SIZE, CELL_SIZE);

        // rect(x, y, CELL_SIZE, CELL_SIZE);
        // noStroke();
      }
    }
  }
}



function keyPressed() {
    pg.clear();

  if (key === 'r' /*|| key == 'R'*/) {
    // Clear the grid
    initializeGrid();
    followRules = false;  // Stop following the rules of Game of Life
    history = [];      // Clear the history
    generationCount = 0; // Reset generation count

  } else if (key === ' ') {
    // Toggle video pause and play when the spacebar is pressed
    if (videoPaused) {
        video.play(); // Resume the video
        } else {
        video.pause(); // Pause the video
        }
        videoPaused = !videoPaused;

    // Pause or continue the simulation
    isPaused = !isPaused;
    generationCount = 0; // Reset generation count

  } else if (key === 'u' || key === 'U') {
    // Undo the last drawn cell
    if (history.length > 0) {
      let cellPos = history.pop();
      let i = floor(cellPos.x);
      let j = floor(cellPos.y);
      grid[i][j] = 0;
    }
  } else if (key === '+') {
    // Zoom in
    zoomFactor *= 1.2;
  } else if (key === '-') {
    // Zoom out
    zoomFactor *= 0.8;
  } else if (key === 'g' || key === 'G') {
    // Toggle grid visibility
    showGrid = !showGrid;
  }
}

// Calculate the next generation based on the Game of Life rules
function nextGeneration() {
  let nextGrid = new Array(floor(gridSize.x));
  for (let i = 0; i < floor(gridSize.x); i++) {
    nextGrid[i] = new Array(floor(gridSize.y));
  }

  // Loop through every cell in the grid
  for (let i = 0; i < gridSize.x; i++) {
    for (let j = 0; j < gridSize.y; j++) {
      let state = grid[i][j];
      let neighbors = countNeighbors(i, j);

      switch(currentRule) {

        case 0:  // Game of Life Rule
        if (state === 0 && neighbors === 3) {
            nextGrid[i][j] = 1;
        } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
            nextGrid[i][j] = 0;
        } else {
            nextGrid[i][j] = state;
        }
        break;

    case 1:  // Custom Rule 1
        if (state === 0 && neighbors == 2){
            nextGrid[i][j] = 1;
        } else if (state === 1 && (neighbors == 3)) {
            nextGrid[i][j] = 1;
        } else {
            nextGrid[i][j] = 0;
        }
        break;

    case 2:  // Higherlife Rule
        if (state === 0 && neighbors == 3){
            nextGrid[i][j] = 1;
        } else if (state === 1 && (neighbors == 2 ||neighbors == 3)) {
            nextGrid[i][j] = 1;
        } else {
            nextGrid[i][j] = 0;
        }
        break;

    case 3:  // Custom Rule 2
        if (state === 0 && neighbors == 3 || neighbors == 6){
            nextGrid[i][j] = 1;
        } else if (state === 1 && (neighbors < 2 ||neighbors > 4)) {
            nextGrid[i][j] = 0;
        } else {
            nextGrid[i][j] = state;
        }
        break;
    }
    }
  
  }

  // Update the grid with the new generation
  grid = nextGrid;

  generationCount++; // Increment the generation count
  document.getElementById('generation-count').innerText = generationCount; // Update HTML


// Stop saving process after 10 generations
if (generationCount >= Math.max(...generationsToSave)) {
  saveNextGenerations = false;
}
}

function countNeighbors(x, y) {
  let count = 0;

  // Check the 8 neighboring cells
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      let col = (x + i + floor(gridSize.x)) % floor(gridSize.x);
      let row = (y + j + floor(gridSize.y)) % floor(gridSize.y);
      count += grid[col][row];
    }
  }

  // Subtract the state of the current cell
  count -= grid[x][y];
  return count;
}



// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  // Loop through all the poses detected
  for (let i = 0; i < min(poses.length, 1); i++) {
    // For each pose detected, loop through all the keypoints
    for (let j = 0; j < poses[i].pose.keypoints.length; j++) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      let keypoint = poses[i].pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.2) {
        // if (keypoint.part === 'leftWrist') {
        //     playSound(sound1);
        //     soundStartTime = millis(); // Record the start time

        //   } else if (keypoint.part === 'rightWrist') {
        //     playSound(sound2);
        //     soundStartTime = millis(); // Record the start time

        //   }
        
        isDrawing = true;
        followRules = true; 
        history = [];
        
        if (keypoint.part === 'leftWrist' || keypoint.part === 'rightWrist') {
            wristX = keypoint.position.x;
            wristY = keypoint.position.y;
          
            if (isDrawing) {
              // Get the cell index based on the wrist position
              let i = floor(wristX / CELL_SIZE);
              let j = floor(wristY / CELL_SIZE);
          
              // Toggle the cell state
              if (i >= 0 && i < gridSize.x && j >= 0 && j < gridSize.y) {
                grid[i][j] = 1;
                history.push(createVector(i, j)); // Add cell position to history
              }

            }
          }

        if (j == 0) {
          noseX = keypoint.position.x;
          noseY = keypoint.position.y;

          // pg.stroke(230, 80, 0);
          // pg.strokeWeight(5);
          // pg.line(noseX, noseY, pNoseX, pNoseY);
          

          pNoseX = noseX;
          pNoseY = noseY;


          if (isDrawing) {
            // // Get the adjusted mouse position based on zoom and offset
            // let mouseXAdjusted = (pNoseX) / zoomFactor;
            // let mouseYAdjusted = (pNoseY) / zoomFactor;
            
        
            // Get the cell index based on the adjusted mouse position
            let i = floor(pNoseX / CELL_SIZE);
            let j = floor(pNoseY / CELL_SIZE);
        
            // Toggle the cell state
            if (i >= 0 && i < gridSize.x && j >= 0 && j < gridSize.y) {
              grid[i][j] = 1;
              history.push(createVector(i, j));  // Add cell position to history
            }
          }
        }
      }
    }
  }
    // // Check if it's time to stop the sound
    // if (millis() - soundStartTime >= 1000) { // 1000 milliseconds = 1 second
    //     stopSound(sound1);
    //     stopSound(sound2);
    //   }
}

// A function to draw the skeletons
function drawSkeleton() {
  // Loop through all the skeletons detected
  for (let i = 0; i < poses.length; i++) {
    // For every skeleton, loop through all body connections
    for (let j = 0; j < poses[i].skeleton.length; j++) {
      let partA = poses[i].skeleton[j][0];
      let partB = poses[i].skeleton[j][1];
      stroke(255, 0, 0);
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
    }
  }
}

// The callback that gets called every time there's an update from the model
function gotPoses(results) {
  poses = results;
}



function modelReady() {
  select('#status').html('model Loaded');
}


function initializeGrid() {
  for (let i = 0; i < gridSize.x; i++) {
    for (let j = 0; j < gridSize.y; j++) {
      grid[i][j] = 0; // Set all cells to 0 (clear the grid)
      
    }
  }

}

function windowResized(){
  resizeCanvas(windowWidth,windowHeight)
}

function saveCanvasImage() {
  // Reset the array
  generationsToSave = []; // Start with the current generation

   // Select three unique generations to save
   while (generationsToSave.length < 5) {
    let gen = Math.floor(Math.random() * 10) + generationCount + 1;
    if (!generationsToSave.includes(gen)) {
        generationsToSave.push(gen);
    }
}

  // Activate the saving process
  saveNextGenerations = true;

  // // Immediately save the current generation
  // if (generationsToSave.includes(generationCount)) {
  //     drawGenerationCountOnCanvas();
  //     saveCanvas('Generation_' + generationCount, 'png');
  // }

  // Ensure the simulation is running
  if (isPaused) {
      isPaused = false;
  }
}



function drawGenerationCountOnCanvas() {
  push(); // Save current drawing settings

  // Reverse the mirroring for text
  textFont('Carrois Gothic'); // Set the custom font here

  translate(width, 0); // Move to the right side of the canvas
  scale(-1, 1); // Flip horizontally

  // Draw the text
  fill(255); // White color for text
  textSize(16); // Set text size
  textAlign(LEFT, BOTTOM); // Align text to the left and bottom    
  text("Generation: " + generationCount, 10, height - 10); // Position at bottom-left

  pop(); // Restore original drawing settings
}


  // Detect cursor hover over the right corner
function detectCursorHover() {
    if (mouseX >= width - 60 && mouseY <= 40) {
      instructionsDiv.show(); // Show instructions when cursor hovers over the right corner
    } else {
      instructionsDiv.hide(); // Hide instructions otherwise
    }
  }

//   function playSound(sound) {
//     // Start the sound
//     sound.start();
//     // Set amplitude and frequency here if needed
//   }

//   function stopSound(sound) {
//     sound.stop();
//   }

  function playOscillator(x, y, stage) {
    // Adjust frequency and amplitude based on the cell's position and stage
    freq = map(x, 0, gridSize.x, 100, 1000);
    amp = map(y, 0, gridSize.y, 0.1, 1.0);
    amp *= map(stage, 0, 4, 0.2, 1.0); // Modify amplitude based on stage
  
    // Start the oscillator
    osc[x][y].freq(freq,0.1);
    osc[x][y].amp(amp,0.1);
    if (!playing) {
      osc[x][y].start();
    }
  }
  
  function stopOscillators() {
    // Stop all oscillators
    for (let i = 0; i < gridSize.x; i++) {
      for (let j = 0; j < gridSize.y; j++) {
        osc[i][j].stop();
      }
    }
  }

  
function showInstructionsAlert() {
    if (!alertShown) {
    alert("Welcome to the semiotics automata! Here are the instructions:\n\n" +
    "Press 'Spacebar' to pause/resume the simulation.\n" +
    "Press 'r' to clear the grid.\n" +
    // "Press 'u' to undo the last drawn cell.\n" +
    // "Press '+' to zoom in.\n" +
    // "Press '-' to zoom out.\n" +
    "Press 'g' to toggle grid visibility.\n\n" +
    "Remember that more help is available in the top right corner.");
    alertShown = true;
    }
}