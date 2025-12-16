let serial;
let angleFromArduino = 0;
let speedFromArduino = 2;
let player = { x: 300, y: 300, size: 20 };
let obstacles = [];

let baseSpeed = 3;          
let difficulty = 2;         
let difficultyIncrease = 0.005; 

let portName = '/dev/tty.usbserial-110'; 
let options = { baudRate: 9600 };

// Countdown variables
let countdown = 100;
let countdownActive = false;

// Survival timer
let startTime;
let survivalTime = 0;

// Ghost mode
let ghostActive = false;
let ghostBar = 50;
let ghostBarMax = 50;

// Start screen flag
let showStartMessage = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  serial = new p5.SerialPort();
  serial.on('data', gotData);
  serial.open(portName, options);
}

function resetGame() {
  player.x = width/2;
  player.y = height/2;
  obstacles = [];
  difficulty = 1;
  countdown = 100;
  countdownActive = false;
  ghostBar = ghostBarMax;
  ghostActive = false;
  startTime = millis();
  showStartMessage = false; // hide start message once game begins
  loop(); // resume draw loop
  for (let i = 0; i < 12; i++) {
    obstacles.push(spawnObstacle());
  }
}

function spawnObstacle() {
  let side = int(random(4));
  let o = { 
    r: 20, 
    speedX: 0, 
    speedY: 0, 
    shape: int(random(3)), 
    trail: [] // store past positions
  };
  if (side === 0) { o.x = random(width); o.y = -20; o.speedY = baseSpeed; }
  else if (side === 1) { o.x = random(width); o.y = height + 20; o.speedY = -baseSpeed; }
  else if (side === 2) { o.x = -20; o.y = random(height); o.speedX = baseSpeed; }
  else { o.x = width + 20; o.y = random(height); o.speedX = -baseSpeed; }
  return o;
}

function gotData() {
  let data = serial.readLine().trim();
  if (data.length > 0) {
    let parts = data.split(",");
    if (parts.length === 2) {
      angleFromArduino = int(parts[0]);
      speedFromArduino = int(parts[1]);
    }
  }
}

function draw() {
  background(30);

  // Show start message if waiting
  if (showStartMessage) {
    textAlign(CENTER, CENTER);
    textSize(32);
    fill(255);
    text("Press S to Start", width/2, height/2);
    noLoop(); // stop until S is pressed
    return;
  }

  let a = radians(angleFromArduino);

  // Movement
  if (keyIsDown(UP_ARROW)) {
    player.x += cos(a) * speedFromArduino;
    player.y += sin(a) * speedFromArduino;
  }
  if (keyIsDown(DOWN_ARROW)) {
    player.x -= cos(a) * speedFromArduino;
    player.y -= sin(a) * speedFromArduino;
  }

  // Ghost mode (hold SPACE)
  if (keyIsDown(32) && ghostBar > 0) {
    ghostActive = true;
    ghostBar -= 0.5;
    if (ghostBar <= 0) { ghostBar = 0; ghostActive = false; }
  } else {
    ghostActive = false;
    ghostBar = min(ghostBarMax, ghostBar + 0.2);
  }

  // color for player based on position
  let playerColor = color(map(player.x,0,width,0,255), map(player.y,0,height,0,255), 200);

  // Draw player
  push();
  translate(player.x, player.y);
  rotate(a);
  if (ghostActive) {
    noFill();
    stroke(playerColor);
    strokeWeight(2);
    triangle(-player.size, -player.size, -player.size, player.size, player.size, 0);
    let noseSize = player.size * 0.5;
    triangle(player.size, -noseSize, player.size, noseSize, player.size + noseSize, 0);
    noStroke();
  } else {
    fill(playerColor);
    triangle(-player.size, -player.size, -player.size, player.size, player.size, 0);
    fill(255, 255, 0);
    let noseSize = player.size * 0.5;
    triangle(player.size, -noseSize, player.size, noseSize, player.size + noseSize, 0);
  }
  pop();

  // Bars
  drawBar(ghostBar, ghostBarMax, 20, 80, color(0, 200, 255));
  if (speedFromArduino >= 10) {
    countdownActive = true;
  } else {
    countdownActive = false;
    countdown = 100;
  }
  if (countdownActive) {
    countdown -= 0.2;
    drawBar(countdown, 100, 20, 20, color(255, 0, 0));
    if (countdown <= 0) {
      gameOver("Game Over! (Countdown)");
    }
  }

  survivalTime = (millis() - startTime) / 1000;
  let timerWidth = map(survivalTime, 0, 60, 0, width-40);
  fill(0, 200, 0);
  rect(20, 50, timerWidth, 20);
  fill(255);
  textSize(16);
  text("Survival: " + nf(survivalTime, 1, 1) + "s", 20, 45);

  // Add more shapes over time
  if (frameCount % (60*10) === 0) { // every ~10 seconds
    obstacles.push(spawnObstacle());
  }

  // Obstacles
  difficulty += difficultyIncrease;
  for (let o of obstacles) {
    o.x += o.speedX * difficulty;
    o.y += o.speedY * difficulty;

    o.trail.push({x:o.x,y:o.y});
    if (o.trail.length > 15) o.trail.shift();

    let oColor = color(map(o.x,0,width,0,255), map(o.y,0,height,0,255), 200);

    noStroke();
    for (let i=0; i<o.trail.length; i++) {
      let alpha = map(i,0,o.trail.length,50,200);
      fill(red(oColor), green(oColor), blue(oColor), alpha);
      ellipse(o.trail[i].x, o.trail[i].y, o.r*0.5);
    }

    fill(oColor);
    if (o.shape === 0) ellipse(o.x, o.y, o.r * 2);
    else if (o.shape === 1) rect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    else triangle(o.x, o.y - o.r, o.x - o.r, o.y + o.r, o.x + o.r, o.y + o.r);

    if (o.x < -50 || o.x > width + 50 || o.y < -50 || o.y > height + 50) {
      Object.assign(o, spawnObstacle());
    }

    if (!ghostActive) {
      let d = dist(player.x, player.y, o.x, o.y);
      if (d < o.r + player.size) {
        gameOver("Game Over! (Collision)");
      }
    }
  }
}

function drawBar(value, maxValue, x, y, barColor) {
  let barWidth = map(value, 0, maxValue, 0, width-40);
  fill(barColor);
  rect(x, y, barWidth, 20);
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    resetGame();
  }
}

function gameOver(message) {
  noLoop();
  textSize(32);
  fill(255);
  textAlign(CENTER, CENTER);
  text(message, width/2, height/2 - 40);
  text("Press S to Restart", width/2, height/2 + 20);
  showStartMessage = true; // return to start screen
}
//Joab.L//