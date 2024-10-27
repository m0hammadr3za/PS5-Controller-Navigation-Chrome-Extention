(() => {
  // Configuration Constants
  const CONFIG = {
    // General Configuration
    DEADZONE: 0.1,
    NAVIGATION_DELAY: 200, // Delay for continuous navigation (ms)

    // Scrolling Configuration
    SCROLL_SPEED: 20,
    FAST_SCROLL_SPEED: 50,
    JUMP_DISTANCE: 1, // Fraction of viewport height or pixels
    ARROW_KEY_COOLDOWN: 200, // ms
    JUMP_SCROLL_COOLDOWN: 200, // ms

    // Cursor Configuration
    CURSOR_ID: "gamepad-cursor",
    CURSOR_SENSITIVITY: 20,
    CURSOR_DEADZONE: 0.15,
    EDGE_PADDING: 10,
    CURSOR_SIZE: 20,
  };

  // Controller Button Mappings
  const controllerButtons = {
    Cross: 0, // 'X' button
    Circle: 1,
    Square: 2,
    Triangle: 3,
    L1: 4,
    R1: 5,
    L2: 6,
    R2: 7,
    Share: 8,
    Options: 9,
    L3: 10,
    R3: 11,
    DPadUp: 12,
    DPadDown: 13,
    DPadLeft: 14,
    DPadRight: 15,
    PS: 16,
    Touchpad: 17,
  };

  // State Variables
  let previousButtonStates = [];
  let isFastScroll = false;
  let isJumpScroll = false;
  let scrollDirection = 0;
  let isScrolling = false;
  let lastArrowKeyTime = 0;
  let lastJumpScrollTime = 0;
  let navigationIntervals = {
    L2: null,
    R2: null,
  };

  // Cursor State Variables
  let cursorVisible = false;
  let cursorPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let cursorVelocity = { x: 0, y: 0 };
  let clickLock = false;
  let toggleLock = false;
  let isCursorNearEdge = false;

  // Initialize Extension
  function init() {
    createCursorElement();
    setupEventListeners();
  }

  // Create Cursor Element
  function createCursorElement() {
    const cursor = document.createElement("div");
    cursor.id = CONFIG.CURSOR_ID;
    cursor.classList.toggle("cursor-hidden", !cursorVisible);
    document.body.appendChild(cursor);
    updateCursorPosition();
  }

  // Setup Event Listeners
  function setupEventListeners() {
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    window.addEventListener("resize", onWindowResize);
    requestAnimationFrame(updateGamepadInput);
  }

  // Gamepad Connected Handler
  function onGamepadConnected(event) {
    console.log("Gamepad connected:", event.gamepad);
  }

  // Gamepad Disconnected Handler
  function onGamepadDisconnected(event) {
    console.log("Gamepad disconnected:", event.gamepad);
  }

  // Window Resize Handler
  function onWindowResize() {
    cursorPosition.x = window.innerWidth / 2;
    cursorPosition.y = window.innerHeight / 2;
  }

  // Main Update Loop
  function updateGamepadInput() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gamepad of gamepads) {
      if (gamepad) {
        handleGamepadInput(gamepad);
      }
    }
    requestAnimationFrame(updateGamepadInput);
  }

  // Handle Gamepad Input
  function handleGamepadInput(gamepad) {
    const { axes, buttons } = gamepad;

    // Handle Buttons
    handleButtons(buttons);

    // Handle Scrolling and Navigation
    handleScrollingAndNavigation(axes, buttons);

    // Handle Cursor Movement
    handleCursorMovement(axes);
  }

  // Handle Buttons
  function handleButtons(buttons) {
    buttons.forEach((button, index) => {
      const pressed = button.pressed;
      const wasPressed = previousButtonStates[index] || false;

      // Handle button press
      if (pressed && !wasPressed) {
        handleButtonPress(index);
      }

      // Handle button release
      if (!pressed && wasPressed) {
        handleButtonRelease(index);
      }

      // Update previous button state
      previousButtonStates[index] = pressed;
    });
  }

  // Handle Button Press Events
  function handleButtonPress(index) {
    switch (index) {
      case controllerButtons.R2:
        // Focus next element immediately
        focusNextElement();
        // Start interval for continuous navigation
        if (!navigationIntervals.R2) {
          navigationIntervals.R2 = setInterval(
            focusNextElement,
            CONFIG.NAVIGATION_DELAY
          );
        }
        break;

      case controllerButtons.L2:
        // Focus previous element immediately
        focusPreviousElement();
        // Start interval for continuous navigation
        if (!navigationIntervals.L2) {
          navigationIntervals.L2 = setInterval(
            focusPreviousElement,
            CONFIG.NAVIGATION_DELAY
          );
        }
        break;

      case controllerButtons.R1:
        simulateKeyPress("Enter", "Enter");
        break;

      case controllerButtons.Circle:
        simulateKeyPress(" ", "Space");
        break;

      case controllerButtons.Triangle:
        simulateKeyPress("F", "KeyF");
        break;

      case controllerButtons.Cross:
        // 'X' button sets isFastScroll to true
        isFastScroll = true;
        break;

      case controllerButtons.Square:
        // 'Square' button sets isJumpScroll to true
        isJumpScroll = true;
        break;

      case controllerButtons.L1:
        // Simulate Click at Cursor Position
        if (!clickLock && cursorVisible) {
          simulateClick();
          clickLock = true;
        }
        break;

      case controllerButtons.R3:
        // Toggle Cursor Visibility
        if (!toggleLock) {
          if (!isCursorNearEdge) {
            toggleCursorVisibility();
          }
          toggleLock = true;
        }
        break;
    }
  }

  // Handle Button Release Events
  function handleButtonRelease(index) {
    switch (index) {
      case controllerButtons.R2:
        if (navigationIntervals.R2) {
          clearInterval(navigationIntervals.R2);
          navigationIntervals.R2 = null;
        }
        break;

      case controllerButtons.L2:
        if (navigationIntervals.L2) {
          clearInterval(navigationIntervals.L2);
          navigationIntervals.L2 = null;
        }
        break;

      case controllerButtons.Cross:
        // 'X' button released, reset isFastScroll
        isFastScroll = false;
        break;

      case controllerButtons.Square:
        // 'Square' button released, reset isJumpScroll
        isJumpScroll = false;
        break;

      case controllerButtons.L1:
        // Release click lock
        clickLock = false;
        break;

      case controllerButtons.R3:
        // Release toggle lock
        toggleLock = false;
        break;

      default:
        // Handle other buttons if needed
        break;
    }
  }

  // Handle Scrolling and Navigation
  function handleScrollingAndNavigation(axes, buttons) {
    // Get vertical and horizontal input from axes and D-pad
    const verticalInput = getVerticalInput(buttons, axes);
    const horizontalInput = getHorizontalInput(buttons, axes, verticalInput);

    // Determine dominant direction
    const dominantDirection = getDominantDirection(
      verticalInput,
      horizontalInput
    );

    if (dominantDirection === "vertical" && verticalInput !== 0) {
      scrollDirection = verticalInput;
      if (!isScrolling) {
        isScrolling = true;
        scrollPage();
      }
    } else if (dominantDirection === "horizontal" && horizontalInput !== 0) {
      handleHorizontalNavigation(horizontalInput);
    } else {
      isScrolling = false; // Stop scrolling if no input
    }
  }

  // Get Vertical Input
  function getVerticalInput(buttons, axes) {
    const dpadUp = buttons[controllerButtons.DPadUp]?.pressed ? -1 : 0;
    const dpadDown = buttons[controllerButtons.DPadDown]?.pressed ? 1 : 0;
    const verticalDpad = dpadUp + dpadDown;

    const stickY = Math.abs(axes[1]) > CONFIG.DEADZONE ? axes[1] : 0;

    return verticalDpad !== 0 ? verticalDpad : stickY;
  }

  // Get Horizontal Input
  function getHorizontalInput(buttons, axes, verticalInput) {
    const dpadLeft = buttons[controllerButtons.DPadLeft]?.pressed ? -1 : 0;
    const dpadRight = buttons[controllerButtons.DPadRight]?.pressed ? 1 : 0;
    const horizontalDpad = dpadLeft + dpadRight;

    const adjustedDeadzone = verticalInput !== 0 ? 0.2 : CONFIG.DEADZONE; // Increase deadzone if vertical is active
    const stickX = Math.abs(axes[0]) > adjustedDeadzone ? axes[0] : 0;

    return horizontalDpad !== 0 ? horizontalDpad : stickX;
  }

  // Get Dominant Direction
  function getDominantDirection(vertical, horizontal) {
    const verticalMagnitude = Math.abs(vertical);
    const horizontalMagnitude = Math.abs(horizontal);

    if (verticalMagnitude > horizontalMagnitude + CONFIG.DEADZONE) {
      return "vertical";
    } else if (horizontalMagnitude > verticalMagnitude + CONFIG.DEADZONE) {
      return "horizontal";
    }
    return "none";
  }

  // Scroll Page
  function scrollPage() {
    if (isScrolling) {
      const speed = isFastScroll
        ? CONFIG.FAST_SCROLL_SPEED
        : CONFIG.SCROLL_SPEED;

      if (isJumpScroll) {
        const currentTime = Date.now();
        if (currentTime - lastJumpScrollTime > CONFIG.JUMP_SCROLL_COOLDOWN) {
          performJumpScroll();
          lastJumpScrollTime = currentTime;
        }
      } else {
        window.scrollBy(0, scrollDirection * speed);
      }

      requestAnimationFrame(scrollPage);
    }
  }

  // Perform Jump Scroll
  function performJumpScroll() {
    let scrollAmount;

    if (CONFIG.JUMP_DISTANCE <= 10) {
      // Treat as fraction of viewport height
      scrollAmount =
        window.innerHeight * CONFIG.JUMP_DISTANCE * scrollDirection;
    } else {
      // Treat as absolute pixel value
      scrollAmount = CONFIG.JUMP_DISTANCE * scrollDirection;
    }

    window.scrollBy(0, scrollAmount);
  }

  // Handle Horizontal Navigation
  function handleHorizontalNavigation(direction) {
    const currentTime = Date.now();
    if (currentTime - lastArrowKeyTime > CONFIG.ARROW_KEY_COOLDOWN) {
      simulateArrowKey(direction);
      lastArrowKeyTime = currentTime;
    }
  }

  // Simulate Arrow Key Press
  function simulateArrowKey(direction) {
    const key = direction > 0 ? "ArrowRight" : "ArrowLeft";
    const keyCode = direction > 0 ? 39 : 37;

    const event = new KeyboardEvent("keydown", {
      key: key,
      code: key,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  // Handle Cursor Movement
  function handleCursorMovement(axes) {
    // Update Cursor Velocity Based on Right Stick
    cursorVelocity.x =
      applyDeadzone(axes[2], CONFIG.CURSOR_DEADZONE) *
      CONFIG.CURSOR_SENSITIVITY;
    cursorVelocity.y =
      applyDeadzone(axes[3], CONFIG.CURSOR_DEADZONE) *
      CONFIG.CURSOR_SENSITIVITY;

    updateCursorPosition();
  }

  // Apply Deadzone to Joystick Input
  function applyDeadzone(value, deadzone = CONFIG.DEADZONE) {
    return Math.abs(value) > deadzone ? value : 0;
  }

  // Update Cursor Position
  function updateCursorPosition() {
    if (!cursorVisible) return;

    cursorPosition.x += cursorVelocity.x;
    cursorPosition.y += cursorVelocity.y;

    // Clamp Position Within Viewport
    cursorPosition.x = Math.max(
      0,
      Math.min(window.innerWidth, cursorPosition.x)
    );
    cursorPosition.y = Math.max(
      0,
      Math.min(window.innerHeight, cursorPosition.y)
    );

    // Update Cursor Element
    const cursor = document.getElementById(CONFIG.CURSOR_ID);
    if (cursor) {
      cursor.style.left = `${cursorPosition.x}px`;
      cursor.style.top = `${cursorPosition.y}px`;
      handleEdgeHiding(cursor);
    }
  }

  // Handle Cursor Hiding Near Edges
  function handleEdgeHiding(cursor) {
    const { x, y } = cursorPosition;
    isCursorNearEdge =
      x <= CONFIG.EDGE_PADDING ||
      x >= window.innerWidth - CONFIG.EDGE_PADDING ||
      y <= CONFIG.EDGE_PADDING ||
      y >= window.innerHeight - CONFIG.EDGE_PADDING;

    cursor.classList.toggle("cursor-edge-hide", isCursorNearEdge);
  }

  // Simulate Click at Cursor Position
  function simulateClick() {
    const element = document.elementFromPoint(
      cursorPosition.x,
      cursorPosition.y
    );
    if (element) {
      // Create Ripple Effect
      createRippleEffect();

      // Dispatch Click Event
      const eventOptions = {
        bubbles: true,
        cancelable: true,
        clientX: cursorPosition.x,
        clientY: cursorPosition.y,
      };
      element.dispatchEvent(new MouseEvent("click", eventOptions));
    }
  }

  // Create Ripple Effect for Click Feedback
  function createRippleEffect() {
    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.left = `${cursorPosition.x}px`;
    ripple.style.top = `${cursorPosition.y}px`;
    document.body.appendChild(ripple);

    ripple.addEventListener("animationend", () => {
      ripple.remove();
    });
  }

  // Toggle Cursor Visibility
  function toggleCursorVisibility() {
    cursorVisible = !cursorVisible;
    const cursor = document.getElementById(CONFIG.CURSOR_ID);
    if (cursor) {
      cursor.classList.toggle("cursor-hidden", !cursorVisible);
    }
  }

  // Get Focusable Elements
  function getFocusableElements() {
    const selectors = [
      "a[href]",
      "area[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "iframe",
      "object",
      "embed",
      "[contenteditable]",
      '[tabindex]:not([tabindex="-1"])',
    ];

    return Array.from(document.querySelectorAll(selectors.join(","))).filter(
      (element) => element.offsetParent !== null
    );
  }

  // Focus Next Element
  function focusNextElement() {
    const focusableElements = getFocusableElements();
    const activeElement = document.activeElement;
    const currentIndex = focusableElements.indexOf(activeElement);

    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  // Focus Previous Element
  function focusPreviousElement() {
    const focusableElements = getFocusableElements();
    const activeElement = document.activeElement;
    const currentIndex = focusableElements.indexOf(activeElement);

    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
    } else if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }

  // Simulate Key Press
  function simulateKeyPress(key, code) {
    const keyCodeMap = {
      Enter: 13,
      " ": 32,
      F: 70,
    };

    const keyCode = keyCodeMap[key] || 0;
    const eventTypes = ["keydown", "keypress", "keyup"];

    eventTypes.forEach((eventType) => {
      const event = new KeyboardEvent(eventType, {
        key,
        code,
        keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
      });
      document.activeElement.dispatchEvent(event);
    });

    // Fallback for actionable elements
    if (key === "Enter") {
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        const actionableTags = ["button", "a", "input", "select", "textarea"];

        if (
          actionableTags.includes(tagName) ||
          activeElement.hasAttribute("onclick") ||
          activeElement.getAttribute("role") === "button"
        ) {
          activeElement.click();
        }
      }
    }
  }

  // Initialize Extension on DOM Content Loaded
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
