// p5.js sketch
let serial;
let angleFromArduino = 0;
let player = { x: 300, y: 300, size: 20 };
let circles = [];

let portName = '/dev/tty.usbserial-110'; 
let options = { baudRate: 9600 };

function setup() {
  createCanvas(600, 400);

  // Spawn circles
  for (let i = 0; i < 5; i++) {
    circles.push({
      x: random(width),
      y: random(-200, 0),
      r: 20
    });
  }

  // Serial setup
  serial = new p5.SerialPort();
  serial.on('list', printList);
  serial.on('connected', serverConnected);
  serial.on('open', portOpen);
  serial.on('data', gotData);
  serial.on('error', serialError);
  serial.on('close', portClose);

  serial.list();
  serial.open(portName, options);
}


function printList(portList) { console.log("Serial Ports:", portList); }
function serverConnected() { console.log("Connected to serial server"); }
function portOpen() { console.log("Serial port opened"); }
function serialError(err) { console.error("Serial error:", err); }
function portClose() { console.log("Serial port closed"); }

function gotData() {
  let data = serial.readLine().trim();
  if (data.length > 0) {
    angleFromArduino = int(data);
  }
}

function draw() {
  background(30);

  // Movement aligned with triangle tip (which now points RIGHT)
  let a = radians(angleFromArduino);

  // Forward
  if (keyIsDown(UP_ARROW)) {
    player.x += cos(a) * 2;
    player.y += sin(a) * 2;
  }

  // Backward
  if (keyIsDown(DOWN_ARROW)) {
    player.x -= cos(a) * 2;
    player.y -= sin(a) * 2;
  }

  // Draw player
  push();
  translate(player.x, player.y);
  rotate(a);

  // Main triangle
  fill(0, 200, 255);
  triangle(
    -player.size, -player.size,   
    -player.size,  player.size,   
     player.size,  0              
  );

  // Yellow nose triangle
  fill(255, 255, 0);
  let noseSize = player.size * 0.5;
  triangle(
    player.size, -noseSize,           
    player.size,  noseSize,           
    player.size + noseSize, 0         
  );

  pop();

  // Update and draw circles
  for (let c of circles) {
    c.y += 2;

    if (c.y > height) {
      c.y = random(-200, 0);
      c.x = random(width);
    }

    fill(255, 100, 100);
    ellipse(c.x, c.y, c.r * 2);

    // Collision
    let d = dist(player.x, player.y, c.x, c.y);
    if (d < c.r + player.size) {
      noLoop();
      textSize(32);
      fill(255);
      text("Game Over!", width / 2 - 80, height / 2);
    }
  }
}