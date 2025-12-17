// State management
let appState = 'camera'; // 'camera', 'countdown', 'strip'
let stripColor = 'lavender';
let filter = 'normal';
let includeCharacters = true;
let phoneMode = false;
let photos = [];
let countdown = 3;
let currentPhotoIndex = 0;
let stream = null;

// Character images for strip
const characters = ['teddy.png', 'julie.png', 'ckeo.png', 'jade.png'];

// DOM Elements
const videoElement = document.getElementById('videoElement');
const captureCanvas = document.getElementById('captureCanvas');
const cameraContainer = document.getElementById('cameraContainer');
const cameraError = document.getElementById('cameraError');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const photoCount = document.getElementById('photoCount');
const flashOverlay = document.getElementById('flashOverlay');
const takePhotosBtn = document.getElementById('takePhotosBtn');
const cameraView = document.getElementById('cameraView');
const stripView = document.getElementById('stripView');
const stripContainer = document.getElementById('stripContainer');
const photosContainer = document.getElementById('photosContainer');
const stripDate = document.getElementById('stripDate');
const retakeBtn = document.getElementById('retakeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const colorOptions = document.querySelectorAll('.color-option');
const filterBtns = document.querySelectorAll('.filter-btn');
const includeCharactersCheckbox = document.getElementById('includeCharacters');
const phoneModeCheckbox = document.getElementById('phoneMode');

// Filter CSS values
const filterStyles = {
  normal: 'none',
  vintage: 'sepia(0.3) contrast(1.1) brightness(1.1) saturate(1.3)',
  bw: 'grayscale(1)',
  sepia: 'sepia(0.8)'
};

// Strip background colors
const stripBgColors = {
  lavender: '#b19cd9',
  pink: '#ff6b9d',
  white: '#ffffff',
  black: '#1a1a1a'
};

// Initialize camera
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    videoElement.srcObject = stream;
    videoElement.style.display = 'block';
    cameraError.style.display = 'none';
  } catch (err) {
    console.error('Camera error:', err);
    videoElement.style.display = 'none';
    cameraError.style.display = 'flex';
    takePhotosBtn.disabled = true;
  }
}

// Apply filter to image data manually for cross-browser support
function applyFilter(ctx, width, height, filterName) {
  if (filterName === 'normal') return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    if (filterName === 'bw') {
      // Grayscale
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    } else if (filterName === 'sepia') {
      // Sepia
      data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
      data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
      data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
    } else if (filterName === 'vintage') {
      // Vintage: slight sepia + increased contrast + warmth
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const sepiaR = gray * 1.1 + 20;
      const sepiaG = gray * 0.95 + 10;
      const sepiaB = gray * 0.8;
      
      // Blend with original and add contrast
      let newR = r * 0.7 + sepiaR * 0.3;
      let newG = g * 0.7 + sepiaG * 0.3;
      let newB = b * 0.7 + sepiaB * 0.3;
      
      // Increase contrast
      newR = ((newR - 128) * 1.1) + 128;
      newG = ((newG - 128) * 1.1) + 128;
      newB = ((newB - 128) * 1.1) + 128;
      
      data[i] = Math.max(0, Math.min(255, newR));
      data[i + 1] = Math.max(0, Math.min(255, newG));
      data[i + 2] = Math.max(0, Math.min(255, newB));
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Capture a single photo
function capturePhoto() {
  if (!videoElement.videoWidth) return null;
  
  const ctx = captureCanvas.getContext('2d');
  captureCanvas.width = videoElement.videoWidth;
  captureCanvas.height = videoElement.videoHeight;
  
  ctx.save();
  ctx.translate(captureCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0);
  ctx.restore();
  
  // Apply filter manually for cross-browser support
  applyFilter(ctx, captureCanvas.width, captureCanvas.height, filter);
  
  return captureCanvas.toDataURL('image/png');
}

// Start the countdown sequence
function startCountdown() {
  appState = 'countdown';
  photos = [];
  currentPhotoIndex = 0;
  countdown = 3;
  countdownOverlay.style.display = 'flex';
  takePhotosBtn.style.display = 'none';
  runCountdown();
}

// Run the countdown timer
function runCountdown() {
  if (appState !== 'countdown') return;
  
  photoCount.textContent = `Photo ${currentPhotoIndex + 1} of 4`;
  countdownNumber.textContent = countdown === 0 ? '!' : countdown;
  
  if (countdown > 0) {
    setTimeout(() => {
      countdown--;
      runCountdown();
    }, 1000);
  } else {
    // Flash effect
    flashOverlay.style.display = 'block';
    setTimeout(() => {
      flashOverlay.style.display = 'none';
    }, 200);
    
    // Capture photo
    const photo = capturePhoto();
    if (photo) {
      photos.push(photo);
      
      if (photos.length < 4) {
        currentPhotoIndex = photos.length;
        countdown = 3;
        setTimeout(runCountdown, 500);
      } else {
        // All photos taken, show strip
        showStrip();
      }
    }
  }
}

// Show the photo strip
function showStrip() {
  appState = 'strip';
  countdownOverlay.style.display = 'none';
  cameraView.style.display = 'none';
  stripView.style.display = 'flex';
  
  // Update strip color
  stripContainer.className = `strip-container ${stripColor}`;
  
  // Clear and add photos with characters
  photosContainer.innerHTML = '';
  photos.forEach((photo, index) => {
    const photoWithCharacter = document.createElement('div');
    photoWithCharacter.className = 'photo-with-character';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'photo-wrapper';
    const img = document.createElement('img');
    img.src = photo;
    img.alt = `Photo ${index + 1}`;
    wrapper.appendChild(img);
    photoWithCharacter.appendChild(wrapper);
    
    // Add character overlay if enabled
    if (includeCharacters) {
      const characterImg = document.createElement('img');
      characterImg.src = characters[index];
      characterImg.alt = 'Character';
      characterImg.className = `character-overlay ${index % 2 === 0 ? 'position-left' : 'position-right'}`;
      photoWithCharacter.appendChild(characterImg);
    }
    
    photosContainer.appendChild(photoWithCharacter);
  });
  
  // Set date
  const now = new Date();
  stripDate.textContent = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Generate strip image for download
async function generateStrip() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Phone mode uses square photos (1:1), desktop uses 4:3
  const photoWidth = phoneMode ? 280 : 300;
  const photoHeight = phoneMode ? 280 : 225;
  const padding = phoneMode ? 25 : 30;
  const gap = phoneMode ? 15 : 20;
  const headerHeight = phoneMode ? 45 : 50;
  const footerHeight = phoneMode ? 25 : 30;
  const characterSize = phoneMode ? 70 : 80;
  
  canvas.width = photoWidth + padding * 2;
  canvas.height = headerHeight + (photoHeight + gap) * 4 - gap + padding * 2 + footerHeight;
  
  // Background color
  ctx.fillStyle = stripBgColors[stripColor];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Load character images only if needed
  let characterImages = [];
  if (includeCharacters) {
    characterImages = await Promise.all(characters.map(src => loadImage(src)));
  }
  
  // Load and draw photos with characters
  for (let i = 0; i < photos.length; i++) {
    const img = await loadImage(photos[i]);
    const y = headerHeight + padding + i * (photoHeight + gap);
    
    // White border
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding - 4, y - 4, photoWidth + 8, photoHeight + 8);
    
    // Photo
    ctx.drawImage(img, padding, y, photoWidth, photoHeight);
    
    // Draw character overlay if enabled
    if (includeCharacters && characterImages[i]) {
      const charImg = characterImages[i];
      const charAspect = charImg.width / charImg.height;
      const charHeight = characterSize;
      const charWidth = charHeight * charAspect;
      
      // Alternate left and right positioning
      if (i % 2 === 0) {
        // Left position - overlapping left edge
        ctx.drawImage(charImg, padding - charWidth * 0.3, y + photoHeight - charHeight + 10, charWidth, charHeight);
      } else {
        // Right position - overlapping right edge
        ctx.drawImage(charImg, padding + photoWidth - charWidth * 0.7, y + photoHeight - charHeight + 10, charWidth, charHeight);
      }
    }
  }
  
  // Date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  ctx.fillStyle = stripColor === 'black' ? '#cccccc' : '#666666';
  ctx.font = "12px 'DM Sans', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(dateStr, canvas.width / 2, canvas.height - 10);
  
  return canvas.toDataURL('image/png');
}

// Load image helper
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Download the strip
async function downloadStrip() {
  const dataUrl = await generateStrip();
  const link = document.createElement('a');
  link.download = `photobooth-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

// Retake photos
function retake() {
  photos = [];
  appState = 'camera';
  currentPhotoIndex = 0;
  stripView.style.display = 'none';
  cameraView.style.display = 'block';
  takePhotosBtn.style.display = 'flex';
}

// Update strip color selection
function updateStripColor(newColor) {
  stripColor = newColor;
  
  // Update UI
  colorOptions.forEach(option => {
    if (option.dataset.color === newColor) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Update camera border
  cameraContainer.className = `camera-container border-${newColor}`;
}

// Update filter selection
function updateFilter(newFilter) {
  filter = newFilter;
  
  // Update UI
  filterBtns.forEach(btn => {
    if (btn.dataset.filter === newFilter) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  
  // Update video filter
  videoElement.style.filter = filterStyles[newFilter];
}

// Event listeners
takePhotosBtn.addEventListener('click', startCountdown);
retakeBtn.addEventListener('click', retake);
downloadBtn.addEventListener('click', downloadStrip);

colorOptions.forEach(option => {
  option.addEventListener('click', () => {
    updateStripColor(option.dataset.color);
  });
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    updateFilter(btn.dataset.filter);
  });
});

includeCharactersCheckbox.addEventListener('change', () => {
  includeCharacters = includeCharactersCheckbox.checked;
});

phoneModeCheckbox.addEventListener('change', () => {
  phoneMode = phoneModeCheckbox.checked;
});

// Mailbox interaction
const mailboxContainer = document.getElementById('mailboxContainer');
const letterOverlay = document.getElementById('letterOverlay');
const letterImage = document.getElementById('letterImage');
const messageOverlay = document.getElementById('messageOverlay');
const messageCloseBtn = document.getElementById('messageCloseBtn');

mailboxContainer.addEventListener('click', () => {
  letterOverlay.classList.add('active');
});

letterOverlay.addEventListener('click', (e) => {
  if (e.target === letterOverlay) {
    letterOverlay.classList.remove('active');
  }
});

letterImage.addEventListener('click', (e) => {
  e.stopPropagation();
  letterOverlay.classList.remove('active');
  messageOverlay.classList.add('active');
});

messageCloseBtn.addEventListener('click', () => {
  messageOverlay.classList.remove('active');
});

messageOverlay.addEventListener('click', (e) => {
  if (e.target === messageOverlay) {
    messageOverlay.classList.remove('active');
  }
});

// Initialize
startCamera();
